import child from "node:child_process";
import { promisify } from "node:util";
import Logger from "../Logger";

const execFile = promisify(child.execFile);

const blanche = async (args: string[]): Promise<string> => {
  try {
    const { stdout } = await execFile("blanche", args);
    return stdout;
  } catch (e) {
    if (e instanceof Error && (e as any).code === "ENOENT") {
      Logger.warn("Would run blanche, but it's not available", { args });
      return "";
    }

    throw e;
  }
};

class List {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  async members(): Promise<string[]> {
    const out = await blanche([this.name]);
    return out
      .trim()
      .split("\n")
      .map((line) => {
        // Technically some of these are probably type STRING, but the
        // distinction isn't important here
        let type = "USER";
        let member = line;
        if (line.includes(":")) {
          const [parsedType, parsedMember] = line.split(":");
          type = parsedType!;
          member = parsedMember!;
        }

        if (!member.includes("@")) {
          member += "@mit.edu";
        }

        switch (type) {
          case "USER":
          case "LIST":
            return member;
          default:
            return undefined;
        }
      })
      .filter<string>((v): v is string => v !== undefined);
  }

  async add(member: string): Promise<boolean> {
    try {
      await blanche([this.name, "-a", member]);
      return true;
    } catch {
      return false;
    }
  }
}

export default List;
