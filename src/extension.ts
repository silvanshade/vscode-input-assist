import Session from "./session";
import * as vs from "vscode";

export async function activate(context: vs.ExtensionContext): Promise<void> {
  const session = new Session(context);
  if (await session.initialize()) context.subscriptions.push(session);
}

export function deactivate(): void {
  return;
}
