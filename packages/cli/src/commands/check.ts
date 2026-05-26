import { loadConfig } from "../core/config.js";
import { checkDrift } from "../core/drift.js";
import { driftMessages, resolveLocale } from "../core/locale.js";
import { readManifest } from "../core/manifest.js";
import type { ArtifactType } from "../types.js";

export async function runCheck(all = false): Promise<void> {
  const config = await loadConfig();
  const manifest = await readManifest(config.outputDir);

  const types: ArtifactType[] = all
    ? config.artifacts
    : manifest && Object.keys(manifest.artifacts).length > 0
      ? (Object.keys(manifest.artifacts) as ArtifactType[])
      : config.artifacts;

  const issues = await checkDrift(manifest, config.requirementPath, types);

  const msg = driftMessages(resolveLocale());

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
