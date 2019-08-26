import * as vs from "vscode";
import Session from "./session";

export async function activate(context: vs.ExtensionContext): Promise<void> {
  const session = new Session(context);
  if (await session.initialize()) context.subscriptions.push(session);
}

export function deactivate(): void {
  return;
}
