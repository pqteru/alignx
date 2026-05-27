import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AlignxManifest, ArtifactManifestEntry, ArtifactType } from "../types.js";
import { sha256, sha256File } from "./hash.js";

export const MANIFEST_FILENAME = ".alignx-manifest.json";
export const GENERATOR_VERSION = "0.2.0";

export function manifestPath(outputDir: string): string {
  return join(outputDir, MANIFEST_FILENAME);
}

export async function readManifest(outputDir: string): Promise<AlignxManifest | null> {
  const path = manifestPath(outputDir);
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text) as AlignxManifest;
  } catch {
    return null;
  }
}

export async function writeManifest(
  outputDir: string,
  manifest: AlignxManifest,
): Promise<void> {
  const path = manifestPath(outputDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export async function ensureManifest(
  outputDir: string,
  requirementPath: string,
): Promise<AlignxManifest> {
  const existing = await readManifest(outputDir);
  const reqHash = await sha256File(requirementPath);

  if (existing?.requirement.sha256 === reqHash) {
    return existing;
  }

  return {
    requirement: {
      path: requirementPath,
      sha256: reqHash,
      parsed_version: existing?.requirement.parsed_version,
    },
    artifacts: existing?.artifacts ?? {},
  };
}

export async function recordArtifact(
  manifest: AlignxManifest,
  type: ArtifactType,
  artifactPath: string,
  sourceSha256: string,
  generator: string,
): Promise<AlignxManifest> {
  const content = await readFile(artifactPath, "utf8");
  const entry: ArtifactManifestEntry = {
    path: artifactPath,
    sha256: sha256(content),
    source_sha256: sourceSha256,
    generator,
    generated_at: new Date().toISOString(),
  };

  return {
    ...manifest,
    artifacts: { ...manifest.artifacts, [type]: entry },
  };
}

export function alignxFooter(sourceSha256: string, generator: string): string {
  return `\n\n---\n\n<!-- alignx:generated source=${sourceSha256.slice(0, 12)} generator=${generator} -->\n`;
}
