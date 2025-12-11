import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { script_v1 } from "@googleapis/script";

async function loadFile(
  secret: string,
  name: string,
): Promise<script_v1.Schema$File> {
  const extension = path.extname(name);
  let fileType;
  switch (extension) {
    case ".html":
      fileType = "HTML";
      break;
    case ".js":
      fileType = "SERVER_JS";
      break;
    case ".json":
      fileType = "JSON";
      break;
    default:
      throw new Error(`Unknown file type: ${extension}`);
  }

  const absolutePath = Assets.absoluteFilePath(
    path.join("google-script", name),
  )!;
  const source = (
    await fs.readFile(absolutePath, { encoding: "utf8" })
  ).replace(/{{secret}}/g, secret);

  return {
    name: path.basename(name, extension),
    type: fileType,
    source,
  };
}

export default async (
  secret: string,
): Promise<{
  content: script_v1.Schema$Content;
  contentHash: string;
}> => {
  const content: script_v1.Schema$Content = {
    files: await Promise.all(
      ["appsscript.json", "main.js"].map((name) => loadFile(secret, name)),
    ),
  };
  const contentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  return { content, contentHash };
};
