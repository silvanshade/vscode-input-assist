import Command from "./command";
import Loader from "./loader";
import Operation from "./operation";
import Provider from "./provider";
import * as schema from "./schema";
import Session from "./session";
import * as vs from "vscode";

export default class Method implements vs.Disposable {
  public static async load(session: Session): Promise<null | Method> {
    const configuration = vs.workspace.getConfiguration("input-assist");
    const path = configuration.get<null | string>("input-method.path", null);
    if (path == null) {
      vs.window.showWarningMessage(`input-assist: path to input method needs to be configured.`);
      vs.window.showWarningMessage(`input-assist: see the "input-assist.input-method.path" setting.`);
      return null;
    }
    let method: null | Method = null;
    try {
      method = await Loader.load(session, path);
    } catch (err) {
      if (err.code === "ENOENT") vs.window.showErrorMessage(`Input method file "${path}" cannot be found.`);
    }
    if (method != null) {
      const triggerCharacters: string[] = [];
      for (const trie of method.data.fork) if (trie.type === "node") triggerCharacters.push(trie.node);
      const provider = new Provider(session, method);
      const filter: vs.DocumentFilter = { language: "*" };
      session.context.subscriptions.push(vs.languages.registerCompletionItemProvider(filter, provider.completionItems(), ...triggerCharacters));
      session.context.subscriptions.push(vs.commands.registerCommand(Command["input-assist"].Method.continueCompleting, Provider.continueCompleting));
    }
    return method;
  }

  public data: schema.IData;
  public path: string;
  public session: Session;

  constructor(session: Session, path: string, data: schema.IData) {
    this.data = data;
    this.path = path;
    this.session = session;
    session.addMethod(this);
    return this;
  }

  public async computeTrigger(document: vs.TextDocument, range: vs.Range): Promise<null | schema.ITriggerResult> {
    const word = document.getText(range);
    let computedPrefix = "";
    const computedTrigger = Operation.findNode(this.data.fork, (trie: schema.Trie) => {
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
    this.session.deleteMethod(this);
    return;
  }
}
