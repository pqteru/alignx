import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alignxFooter, GENERATOR_VERSION } from "../core/manifest.js";
import { requirementSummary } from "../core/requirement-parser.js";
import { chatJson } from "../llm/client.js";
import { sprintBacklogPrompt, SYSTEM_JSON } from "../llm/prompts.js";
import { renderSprintBacklog } from "../render/sprint-backlog.js";
import {
  sprintBacklogResponseSchema,
  type SprintBacklogResponse,
} from "../schemas/sprint-backlog.js";
import type { AppConfig, RequirementModel } from "../types.js";
import { artifactOutputPath, type GenerateResult } from "./registry.js";

const GENERATOR = `sprint-backlog@${GENERATOR_VERSION}`;

export async function generateSprintBacklog(
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  const summary = requirementSummary(requirement);
  const { data } = await chatJson(
    config.llm,
    [
      { role: "system", content: SYSTEM_JSON() },
      { role: "user", content: sprintBacklogPrompt(summary) },
    ],
    (raw) => sprintBacklogResponseSchema.parse(raw) as SprintBacklogResponse,
  );

  let content = renderSprintBacklog(data);
  content += alignxFooter(sourceSha256, GENERATOR);

  const path = artifactOutputPath(config, "sprint-backlog");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return { type: "sprint-backlog", path, content };
}
