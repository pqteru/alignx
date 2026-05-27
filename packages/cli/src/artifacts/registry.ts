import { join } from "node:path";
import { effectiveOutputDir } from "../core/output-dir.js";
import type { AppConfig, ArtifactType, RequirementModel } from "../types.js";
import { generateAcceptanceCriteria } from "./acceptance-criteria.js";
import { generateObservability } from "./observability.js";
import { generateSprintBacklog } from "./sprint-backlog.js";
import { generateUiStateMatrix } from "./ui-state-matrix.js";

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
  "sprint-backlog": generateSprintBacklog,
  "observability": generateObservability,
};

export function artifactOutputPath(config: AppConfig, type: ArtifactType): string {
  const filename =
    type === "acceptance-criteria"
      ? "acceptance-criteria.md"
      : type === "ui-state-matrix"
        ? "ui-state-matrix.md"
        : type === "sprint-backlog"
          ? "sprint-backlog.md"
          : "observability.md";
  return join(effectiveOutputDir(config), filename);
}

export async function generateArtifact(
  type: ArtifactType,
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  return generators[type](requirement, config, sourceSha256);
}
