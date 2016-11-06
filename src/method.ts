import Loader from "./loader";
import Operation from "./operation";
import Provider from "./provider";
import * as schema from "./schema";
import Session from "./session";
import * as vs from "vscode";

export default class Method implements vs.Disposable {
  public static async load(session: Session, path: string, languages: string[]): Promise<null | Method> {
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
      method.subscriptions.push(vs.languages.registerCompletionItemProvider(languages, provider.completionItems(), ...triggerCharacters));
    }
    return method;
  }

  public readonly data: schema.IData;
  public readonly path: string;
  public readonly session: Session;
  private readonly subscriptions: vs.Disposable[] = [];

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
    for (const item of this.subscriptions) item.dispose();
    return;
  }
}
