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
  fork: IFork;
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
