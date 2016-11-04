import Operation from "./operation";
import * as schema from "./schema";
import * as vs from "vscode";

export default class Method implements vs.Disposable {
  public data: schema.IData;
  public output: vs.OutputChannel;

  constructor(output: vs.OutputChannel, data: schema.IData) {
    this.output = output;
    this.data = data;
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
    return;
  }
}
