import Method from "./method";
import * as schema from "./schema";
import * as fs from "fs";
import * as vs from "vscode";

export default class Loader {
  public static async load(output: vs.OutputChannel, fileName: string): Promise<Method> {
    const data = await new Promise<schema.IData>((resolve, reject) => fs.readFile(fileName, "utf-8", (err, str) => err ? reject(err) : resolve(JSON.parse(str))));
    return new Method(output, data);
  }
}
