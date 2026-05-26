import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alignxFooter, GENERATOR_VERSION } from "../core/manifest.js";
import { requirementSummary } from "../core/requirement-parser.js";
import { chatJson } from "../llm/client.js";
import { acceptanceCriteriaPrompt, SYSTEM_JSON } from "../llm/prompts.js";
import { renderAcceptanceCriteria } from "../render/acceptance-criteria.js";
import {
  acceptanceCriteriaResponseSchema,
  type AcceptanceCriteriaResponse,
} from "../schemas/acceptance-criteria.js";
import type { AppConfig, RequirementModel } from "../types.js";
import { artifactOutputPath, type GenerateResult } from "./registry.js";

const GENERATOR = `acceptance-criteria@${GENERATOR_VERSION}`;

export async function generateAcceptanceCriteria(
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  const summary = requirementSummary(requirement);
  const { data } = await chatJson(
    config.llm,
    [
      { role: "system", content: SYSTEM_JSON() },
      { role: "user", content: acceptanceCriteriaPrompt(summary) },
    ],
    (raw) => acceptanceCriteriaResponseSchema.parse(raw) as AcceptanceCriteriaResponse,
  );

  let content = renderAcceptanceCriteria(data, {
    title: requirement.frontmatter.title,
    requirementId: requirement.frontmatter.id,
  });
  content += alignxFooter(sourceSha256, GENERATOR);

  const path = artifactOutputPath(config, "acceptance-criteria");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return { type: "acceptance-criteria", path, content };
}
