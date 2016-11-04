import Loader from "./loader";
import Method from "./method";
import Provider from "./provider";
import * as vs from "vscode";

async function loadMethod(output: vs.OutputChannel): Promise<null | Method> {
  const configuration = vs.workspace.getConfiguration("input-assist");
  const path = configuration.get<null | string>("input-method.path", null);
  if (path == null) {
    vs.window.showWarningMessage(`input-assist: path to input method needs to be configured.`);
    vs.window.showWarningMessage(`input-assist: see the "input-assist.input-method.path" setting.`);
    return null;
  }
  let method: null | Method = null;
  try {
    method = await Loader.load(output, path);
  } catch (err) {
    if (err.code === "ENOENT") vs.window.showErrorMessage(`Input method file "${path}" cannot be found.`);
  }
  return method;
}

export async function activate(context: vs.ExtensionContext): Promise<void> {
  const output = vs.window.createOutputChannel("input-assist");
  const method = await loadMethod(output);
  if (method == null) return;
  const triggerCharacters: string[] = [];
  for (const trie of method.data.fork) if (trie.type === "node") triggerCharacters.push(trie.node);
  const provider = new Provider(output, method);
  const filter: vs.DocumentFilter = { language: "*" };
  context.subscriptions.push(method);
  context.subscriptions.push(vs.languages.registerCompletionItemProvider(filter, provider.completionItems(), ...triggerCharacters));
  context.subscriptions.push(vs.commands.registerCommand("input-assist.continueCompleting", () => vs.commands.executeCommand("editor.action.triggerSuggest")));
}

export function deactivate(): void {
  return;
}
