import Command from "./command";
import Method from "./method";
import Operation from "./operation";
import * as schema from "./schema";
import Session from "./session";
import * as vs from "vscode";

export default class Provider {
  public static async continueCompleting(): Promise<void> {
    return vs.commands.executeCommand<void>("editor.action.triggerSuggest");
  }

  private readonly method: Method;
  private readonly session: Session;

  constructor(session: Session, method: Method) {
    this.method = method;
    this.session = session;
    return this;
  }

  public leaf(range: vs.Range, computedPrefix: string, { leaf, name }: schema.ILeaf): vs.CompletionItem {
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

  public node(range: vs.Range, computedPrefix: string, terminalPrefix: string, trie: schema.INode): vs.CompletionItem {
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
        command: Command["input-assist"].Method.continueCompleting,
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
