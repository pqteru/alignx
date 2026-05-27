import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alignxFooter, GENERATOR_VERSION } from "../core/manifest.js";
import { requirementSummary } from "../core/requirement-parser.js";
import { chatJson } from "../llm/client.js";
import { observabilityPrompt, SYSTEM_JSON } from "../llm/prompts.js";
import { renderObservability } from "../render/observability.js";
import {
  observabilityResponseSchema,
  type ObservabilityResponse,
} from "../schemas/observability.js";
import type { AppConfig, RequirementModel } from "../types.js";
import { artifactOutputPath, type GenerateResult } from "./registry.js";

const GENERATOR = `observability@${GENERATOR_VERSION}`;

export async function generateObservability(
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  const summary = requirementSummary(requirement);
  const { data } = await chatJson(
    config.llm,
    [
      { role: "system", content: SYSTEM_JSON() },
      { role: "user", content: observabilityPrompt(summary) },
    ],
    (raw) => observabilityResponseSchema.parse(raw) as ObservabilityResponse,
  );

  let content = renderObservability(data, {
    title: requirement.frontmatter.title,
    requirementId: requirement.frontmatter.id,
  });
  content += alignxFooter(sourceSha256, GENERATOR);

  const path = artifactOutputPath(config, "observability");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return { type: "observability", path, content };
}
