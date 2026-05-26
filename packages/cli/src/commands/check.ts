import { loadConfig } from "../core/config.js";
import { checkDrift } from "../core/drift.js";
import { driftMessages, resolveLocale } from "../core/locale.js";
import { readManifest } from "../core/manifest.js";
import { resolveRunOutputDir } from "../core/output-run.js";
import type { ArtifactType } from "../types.js";

export interface CheckOptions {
  all?: boolean;
  run?: string;
}

export async function runCheck(opts: CheckOptions = {}): Promise<void> {
  const config = await loadConfig();
  const msg = driftMessages(resolveLocale());

  let runOutputDir: string;
  try {
    runOutputDir = await resolveRunOutputDir(config.outputDir, opts.run);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const manifest = await readManifest(runOutputDir);

  const types: ArtifactType[] = opts.all
    ? config.artifacts
    : manifest && Object.keys(manifest.artifacts).length > 0
      ? (Object.keys(manifest.artifacts) as ArtifactType[])
      : config.artifacts;

  const issues = await checkDrift(manifest, config.requirementPath, types);

  if (manifest?.run_id) {
    console.log(`Checking run: ${manifest.run_id}\n`);
  }

  if (issues.length === 0) {
    console.log(msg.checkOk);
    return;
  }

  console.log(msg.checkFail);
  for (const i of issues) {
    console.log(`  • [${i.artifact}] ${i.message}`);
  }
  process.exit(1);
}
