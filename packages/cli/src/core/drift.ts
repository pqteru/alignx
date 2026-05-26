import { existsSync } from "node:fs";
import type { AlignxManifest, ArtifactType, DriftIssue } from "../types.js";
import { driftMessages, resolveLocale } from "./locale.js";
import { sha256File } from "./hash.js";

export async function checkDrift(
  manifest: AlignxManifest | null,
  requirementPath: string,
  artifactTypes: ArtifactType[],
): Promise<DriftIssue[]> {
  const msg = driftMessages(resolveLocale());
  const issues: DriftIssue[] = [];

  if (!existsSync(requirementPath)) {
    issues.push({
      artifact: "requirement",
      message: msg.missingRequirement(requirementPath),
    });
    return issues;
  }

  const currentReqHash = await sha256File(requirementPath);

  if (!manifest) {
    issues.push({
      artifact: "requirement",
      message: msg.noManifest,
    });
    return issues;
  }

  if (manifest.requirement.sha256 !== currentReqHash) {
    issues.push({
      artifact: "requirement",
      message: msg.requirementChanged,
    });
  }

  for (const type of artifactTypes) {
    const entry = manifest.artifacts[type];
    if (!entry) {
      issues.push({ artifact: type, message: msg.missingArtifact(type) });
      continue;
    }
    if (!existsSync(entry.path)) {
      issues.push({ artifact: type, message: msg.fileMissing(entry.path) });
      continue;
    }
    const fileHash = await sha256File(entry.path);
    if (fileHash !== entry.sha256) {
      issues.push({ artifact: type, message: msg.fileModified(entry.path) });
      continue;
    }
    if (entry.source_sha256 !== currentReqHash) {
      issues.push({
        artifact: type,
        message: msg.artifactStale(type),
      });
    }
  }

  return issues;
}
