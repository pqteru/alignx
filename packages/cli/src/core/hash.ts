import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  return sha256(content);
}
