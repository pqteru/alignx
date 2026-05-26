import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** Timestamp folder name: YYYYMMDD_HHmmss */
export const RUN_ID_PATTERN = /^\d{8}_\d{6}$/;

export function formatRunId(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

export function isRunId(name: string): boolean {
  return RUN_ID_PATTERN.test(name);
}

export function resolveRunDir(baseOutputDir: string, runId: string): string {
  if (!isRunId(runId)) {
    throw new Error(`Invalid run id "${runId}" (expected YYYYMMDD_HHmmss, e.g. 20260526_111111)`);
  }
  return join(baseOutputDir, runId);
}

export async function listRunIds(baseOutputDir: string): Promise<string[]> {
  if (!existsSync(baseOutputDir)) return [];
  const entries = await readdir(baseOutputDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && isRunId(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
}

export async function getLatestRunDir(baseOutputDir: string): Promise<string | null> {
  const ids = await listRunIds(baseOutputDir);
  if (ids.length === 0) return null;
  return join(baseOutputDir, ids[0]!);
}

export async function resolveRunOutputDir(
  baseOutputDir: string,
  runId?: string,
): Promise<string> {
  if (runId) return resolveRunDir(baseOutputDir, runId);
  const latest = await getLatestRunDir(baseOutputDir);
  if (!latest) {
    throw new Error("No output runs found. Run `alignx generate` first.");
  }
  return latest;
}
