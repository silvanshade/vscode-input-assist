import * as schema from "./schema";

export default class Operation {
  // Find a node in `fork` satisfying a predicate `pred`.
  public static findNode(fork: schema.IFork, pred: (node: schema.INode) => boolean): undefined | schema.INode {
    const resultNode = fork.find((node: schema.Trie): boolean => {
      switch (node.type) {
        case "node": return pred(node);
        default: return false;
      }
    });
    return resultNode as undefined | schema.INode;
  }

  // Find a fork in `computedTrigger` by following `computedPrefix` as a path through the trie.
  public static findFork({ computedPrefix, computedTrigger }: schema.ITriggerResult): schema.ITraversalResult {
    let terminalFork: schema.IFork = computedTrigger.fork;
    let terminalPrefix = computedPrefix;
    while (terminalPrefix.length > 0) {
      const node = Operation.findNode(terminalFork, (trie: schema.Trie): boolean => {
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
