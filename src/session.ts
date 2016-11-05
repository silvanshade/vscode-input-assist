import Command from "./command";
import Method from "./method";
import Provider from "./provider";
import * as vs from "vscode";

export default class Session implements vs.Disposable {
  public readonly channel: vs.OutputChannel = vs.window.createOutputChannel("Input Assist");
  public readonly context: vs.ExtensionContext;
  public readonly statusItem: vs.StatusBarItem;
  private readonly methods: Map<string, Method> = new Map();

  constructor(context: vs.ExtensionContext) {
    this.context = context;
    this.statusItem = this.createStatusItem();
    context.subscriptions.push(vs.commands.registerCommand(Command["input-assist"].Method.continueCompleting, Provider.continueCompleting));
    context.subscriptions.push(vs.commands.registerCommand(Command["input-assist"].Session.displayMethodDescriptions, this.displayMethodDescriptions.bind(this)));
    return this;
  }

  public addMethod(method: Method): void {
    this.methods.set(method.data.id, method);
    this.refreshStatus();
  }

  public displayMethodDescriptions(): void {
    this.channel.show(true);
    for (const [, method] of this.methods) {
      this.channel.appendLine(JSON.parse(method.data.description));
      this.channel.appendLine("");
    }
  }

  public dispose(): void {
    return;
  }

  public deleteMethod(method: Method): void {
    this.methods.delete(method.path);
    this.refreshStatus();
  }

  public async initialize(): Promise<boolean> {
    const configuration = vs.workspace.getConfiguration("input-assist");
    const paths = configuration.get<null | string[]>("input-method.paths", []);
    if (paths == null) {
      vs.window.showWarningMessage(`input-assist: paths to input methods needs to be configured`);
      vs.window.showWarningMessage(`input-assist: see the "input-assist.input-method.paths" setting`);
      return false;
    }
    let count = 0;
    while (count < paths.length) {
      const method = await Method.load(this, paths[count++]);
      if (method != null) this.context.subscriptions.push(method as Method); // tslint:disable-line
    }
    return count > 0;
  }

  private createStatusItem(): vs.StatusBarItem {
    const item = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right);
    item.command = Command["input-assist"].Session.displayMethodDescriptions;
    return item;
  }

  private refreshStatus(): void {
    this.statusItem.text = `$(keyboard) [${Array.from(this.methods.values()).map((method) => method.data.indicator).join(", ")}]`;
    this.statusItem.tooltip = Array.from(this.methods.values()).map((method) => method.data.id).join("\n* ");
    this.statusItem.show();
  }
}