import { join } from "node:path";
import { effectiveOutputDir } from "../core/output-dir.js";
import type { AppConfig, ArtifactType, RequirementModel } from "../types.js";
import { generateAcceptanceCriteria } from "./acceptance-criteria.js";
import { generateObservability } from "./observability.js";
import { generateSprintBacklog } from "./sprint-backlog.js";
import { generateUiStateMatrix } from "./ui-state-matrix.js";
import { generateUiStateSpec } from "./ui-state-spec.js";

export interface GenerateResult {
  type: ArtifactType;
  path: string;
  content: string;
}

type GeneratorFn = (
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
) => Promise<GenerateResult>;

const generators: Record<ArtifactType, GeneratorFn> = {
  "acceptance-criteria": generateAcceptanceCriteria,
  "ui-state-matrix": generateUiStateMatrix,
  "ui-state-spec": generateUiStateSpec,
  "sprint-backlog": generateSprintBacklog,
  "observability": generateObservability,
};

const ARTIFACT_FILENAMES: Record<ArtifactType, string> = {
  "acceptance-criteria": "acceptance-criteria.md",
  "ui-state-matrix": "ui-state-matrix.md",
  "ui-state-spec": "ui-state-spec.md",
  "sprint-backlog": "sprint-backlog.md",
  "observability": "observability.md",
};

export function artifactOutputPath(config: AppConfig, type: ArtifactType): string {
  return join(effectiveOutputDir(config), ARTIFACT_FILENAMES[type]);
}

export async function generateArtifact(
  type: ArtifactType,
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  return generators[type](requirement, config, sourceSha256);
}
