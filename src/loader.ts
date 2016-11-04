import Method from "./method";
import * as schema from "./schema";
import Session from "./session";
import * as fs from "fs";

export default class Loader {
  public static async load(session: Session, path: string): Promise<Method> {
    const data = await new Promise<schema.IData>((resolve, reject) => fs.readFile(path, "utf-8", (err, str) => err ? reject(err) : resolve(JSON.parse(str))));
    return new Method(session, path, data);
  }
}
