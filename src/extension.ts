import * as fs from "fs";
import * as vs from "vscode";

export interface IFork extends Array<Trie> {}

export interface IData {
  id: string;
  name: string;
  indicator: string;
  description: string;
  fork: IFork;
}

export interface ILeaf {
  type: "leaf";
  leaf: string;
  name: string[];
}

export interface INode {
  type: "node";
  node: string;
  fork: Trie[];
}

export type Trie = ILeaf | INode;

export interface ITriggerResult {
  computedPrefix: string;
  computedTrigger: INode;
}

export interface ITraversalResult {
  triggerResult: ITriggerResult;
  terminalFork: IFork;
  terminalPrefix: string;
}

export class Operation {
  // Find a node in `fork` satisfying a predicate `pred`.
  public static findNode(fork: IFork, pred: (node: INode) => boolean): undefined | INode {
    const resultNode = fork.find((node: Trie): boolean => {
      switch (node.type) {
        case "node": return pred(node);
        default: return false;
      }
    });
    return resultNode as undefined | INode;
  }
  // Find a fork in `computedTrigger` by following `computedPrefix` as a path through the trie.
  public static findFork({ computedPrefix, computedTrigger }: ITriggerResult): ITraversalResult {
    let terminalFork: IFork = computedTrigger.fork;
    let terminalPrefix = computedPrefix;
    while (terminalPrefix.length > 0) {
      const node = Operation.findNode(terminalFork, (trie: Trie): boolean => {
          let didFindNode = false;
          if (trie.type === "node") {
            if (terminalPrefix.startsWith(trie.node)) didFindNode = true;
            if (trie.node.startsWith(terminalPrefix)) didFindNode = true;
          }
          return didFindNode;
        });
      if (!node) {
        terminalFork = [];
        break;
      }
      if (node.node.length > terminalPrefix.length) {
        terminalFork = [node];
        break;
      }
      terminalFork = node.fork;
      terminalPrefix = terminalPrefix.substr(node.node.length);
    }
    return { triggerResult: { computedPrefix, computedTrigger }, terminalFork, terminalPrefix };
  }
}

class Method implements vs.Disposable {
  public data: IData;
  public output: vs.OutputChannel;
  constructor(output: vs.OutputChannel, data: IData) {
    this.output = output;
    this.data = data;
    return this;
  }
  public async computeTrigger(document: vs.TextDocument, range: vs.Range): Promise<null | ITriggerResult> {
    const word = document.getText(range);
    let computedPrefix = "";
    const computedTrigger = Operation.findNode(this.data.fork, (trie: Trie) => {
      let isTrigger = false;
      if (trie.type === "node") {
        const escaped = trie.node.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        const match = word.match(new RegExp(`^.*(${escaped})(\\S*)$`));
        if (match) {
          computedPrefix = match[2];
          isTrigger = true;
        }
      }
      return isTrigger;
    });
    return computedTrigger ? { computedPrefix, computedTrigger } : null;
  }
  public dispose(): void {
    return;
  }
}

class InputMethodLoader {
  public static async load(output: vs.OutputChannel, fileName: string): Promise<Method> {
    const data = await new Promise<IData>((resolve, reject) => fs.readFile(fileName, "utf-8", (err, str) => err ? reject(err) : resolve(JSON.parse(str))));
    return new Method(output, data);
  }
}

class Provider {
  private readonly method: Method;
  private readonly output: vs.OutputChannel;
  constructor(output: vs.OutputChannel, method: Method) {
    this.method = method;
    this.output = output;
    return this;
  }
  public leaf(range: vs.Range, computedPrefix: string, { leaf, name }: ILeaf): vs.CompletionItem {
    const kind = vs.CompletionItemKind.Text;
    const item = new vs.CompletionItem(`${computedPrefix} [${name[0]}]`, kind);
    item.detail = leaf;
    item.filterText = computedPrefix;
    item.insertText = leaf;
    item.additionalTextEdits = [
      vs.TextEdit.delete(new vs.Range(range.start, range.start.translate(0, 1))),
    ];
    return item;
  }
  public node(range: vs.Range, computedPrefix: string, terminalPrefix: string, trie: INode): vs.CompletionItem {
    const label = `${computedPrefix}${trie.node.slice(terminalPrefix.length)}`;
    const kind = vs.CompletionItemKind.Text;
    const item = new vs.CompletionItem(label, kind);
    if (trie.fork.length === 1) {
      const next = trie.fork[0];
      if (next.type === "leaf") {
        item.detail = next.leaf;
        item.insertText = next.leaf;
        item.additionalTextEdits = [
          vs.TextEdit.delete(new vs.Range(range.start, range.start.translate(0, 1))),
        ];
      }
    } else {
      item.command = {
        command: "input-assist.continueCompleting",
        title: "",
      };
      item.detail = `(${trie.fork.length} more)`;
      const nodes: string[] = [];
      for (const next of trie.fork) {
        if (next.type === "leaf") nodes.push(next.leaf);
        if (next.type === "node") nodes.push(next.node);
      }
      item.documentation = nodes.join(", ");
    }
    return item;
  }
  public completionItems(): vs.CompletionItemProvider {
    const provider = this;
    return {
      async provideCompletionItems(document, position): Promise<vs.CompletionList> {
        const text = document.getText();
        let offset = document.offsetAt(position);
        while (/[^\s]/.test(text.charAt(--offset)));
        const range = new vs.Range(document.positionAt(offset + 1), position);
        const trigger = await provider.method.computeTrigger(document, range);
        let items: vs.CompletionItem[] = [];
        let isIncomplete = false;
        if (trigger) {
          const { terminalFork, terminalPrefix, triggerResult } = Operation.findFork(trigger);
          const { computedPrefix } = triggerResult;
          for (const trie of terminalFork) {
            switch (trie.type) {
              case "leaf":
                items.push(provider.leaf(range, computedPrefix, trie));
                break;
              case "node":
                items.push(provider.node(range, computedPrefix, terminalPrefix, trie));
                isIncomplete = true;
                break;
              default:
                throw new Error("<unreachable>");
            }
          }
        }
        return new vs.CompletionList(items, isIncomplete);
      },
    };
  }
}

export async function activate(context: vs.ExtensionContext): Promise<void> {
  const output = vs.window.createOutputChannel("input-assist");
  const configuration = vs.workspace.getConfiguration("input-assist");
  const path = configuration.get<null | string>("input-method.path", null);
  if (path == null) {
    vs.window.showWarningMessage(`input-assist: path to input method needs to be configured.`);
    vs.window.showWarningMessage(`input-assist: see the "input-assist.input-method.path" setting.`);
    return;
  }
  let method: null | Method = null;
  try {
    method = await InputMethodLoader.load(output, path);
  } catch (err) {
    if (err.code === "ENOENT") vs.window.showErrorMessage(`Input method file "${path}" cannot be found.`);
  }
  if (method == null) return;
  const filter: vs.DocumentFilter = { language: "*" };
  const triggerCharacters: string[] = [];
  for (const trie of method.data.fork) if (trie.type === "node") triggerCharacters.push(trie.node);
  const provider = new Provider(output, method);
  context.subscriptions.push(method);
  context.subscriptions.push(vs.languages.registerCompletionItemProvider(filter, provider.completionItems(), ...triggerCharacters));
  context.subscriptions.push(vs.commands.registerCommand("input-assist.continueCompleting", () => vs.commands.executeCommand("editor.action.triggerSuggest")));
}

export function deactivate(): void {
  return;
}
