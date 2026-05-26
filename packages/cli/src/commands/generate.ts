import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../core/config.js";
import { sha256File } from "../core/hash.js";
import {
  recordArtifact,
  writeManifest,
  GENERATOR_VERSION,
} from "../core/manifest.js";
import { formatRunId } from "../core/output-run.js";
import { withRunOutputDir } from "../core/output-dir.js";
import { parseRequirement } from "../core/requirement-parser.js";
import { generateArtifact } from "../artifacts/registry.js";
import { writeDashboard } from "../dashboard/html.js";
import type { AlignxManifest, ArtifactType } from "../types.js";
import { ALL_ARTIFACTS } from "../types.js";

export interface GenerateOptions {
  input?: string;
  types?: ArtifactType[];
  all?: boolean;
  dashboard?: boolean;
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
  const config = await loadConfig();
  const requirementPath = opts.input ?? config.requirementPath;

  if (!existsSync(requirementPath)) {
    console.error(`Requirement not found: ${requirementPath}`);
    console.error("Run `alignx init` to create a template.");
    process.exit(1);
  }

  let types: ArtifactType[];
  if (opts.all) {
    types = ALL_ARTIFACTS;
  } else if (opts.types?.length) {
    types = opts.types;
  } else {
    types = ["acceptance-criteria", "ui-state-matrix"];
  }

  const runId = formatRunId(new Date());
  const runOutputDir = join(config.outputDir, runId);
  await mkdir(runOutputDir, { recursive: true });

  const runConfig = withRunOutputDir(config, runOutputDir);

  const requirement = await parseRequirement(requirementPath);
  const sourceSha256 = await sha256File(requirementPath);

  let manifest: AlignxManifest = {
    run_id: runId,
    requirement: {
      path: requirementPath,
      sha256: sourceSha256,
      parsed_version: requirement.frontmatter.version,
    },
    artifacts: {},
  };

  console.log(`Generating from ${requirementPath}`);
  console.log(`Output run: ${runOutputDir}\n`);

  for (const type of types) {
    process.stdout.write(`  ${type} … `);
    try {
      const result = await generateArtifact(type, requirement, runConfig, sourceSha256);
      manifest = await recordArtifact(
        manifest,
        type,
        result.path,
        sourceSha256,
        `${type}@${GENERATOR_VERSION}`,
      );
      console.log(`✓ ${result.path}`);
    } catch (err) {
      console.log("✗");
      throw err;
    }
  }

  await writeManifest(runOutputDir, manifest);

  if (opts.dashboard !== false) {
    const dashPath = await writeDashboard(runConfig, manifest);
    console.log(`\n  dashboard → ${dashPath}`);
  }

  console.log("\nDone. Run `alignx check` to verify alignment.");
}
