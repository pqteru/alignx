import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alignxFooter, GENERATOR_VERSION } from "../core/manifest.js";
import { requirementSummary } from "../core/requirement-parser.js";
import { chatJson } from "../llm/client.js";
import { SYSTEM_UI_STATE_SPEC, uiStateSpecPrompt } from "../llm/prompts.js";
import { renderUiStateSpec } from "../render/ui-state-spec.js";
import {
  uiStateSpecResponseSchema,
  type UiStateSpecResponse,
} from "../schemas/ui-state-spec.js";
import type { AppConfig, RequirementModel } from "../types.js";
import { artifactOutputPath, type GenerateResult } from "./registry.js";

const GENERATOR = `ui-state-spec@${GENERATOR_VERSION}`;

export async function generateUiStateSpec(
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  const summary = requirementSummary(requirement);
  const { data } = await chatJson(
    config.llm,
    [
      { role: "system", content: SYSTEM_UI_STATE_SPEC() },
      { role: "user", content: uiStateSpecPrompt(summary) },
    ],
    (raw) => uiStateSpecResponseSchema.parse(raw) as UiStateSpecResponse,
  );

  let content = renderUiStateSpec(data, {
    title: requirement.frontmatter.title,
    requirementId: requirement.frontmatter.id,
  });
  content += alignxFooter(sourceSha256, GENERATOR);

  const path = artifactOutputPath(config, "ui-state-spec");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return { type: "ui-state-spec", path, content };
}
