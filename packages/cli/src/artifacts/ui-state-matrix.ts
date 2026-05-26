import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alignxFooter, GENERATOR_VERSION } from "../core/manifest.js";
import { requirementSummary } from "../core/requirement-parser.js";
import { chatJson } from "../llm/client.js";
import { uiStateMatrixPrompt, SYSTEM_JSON } from "../llm/prompts.js";
import { renderUiStateMatrix } from "../render/ui-state-matrix.js";
import {
  uiStateMatrixResponseSchema,
  type UiStateMatrixResponse,
} from "../schemas/ui-state-matrix.js";
import type { AppConfig, RequirementModel } from "../types.js";
import { artifactOutputPath, type GenerateResult } from "./registry.js";

const GENERATOR = `ui-state-matrix@${GENERATOR_VERSION}`;

export async function generateUiStateMatrix(
  requirement: RequirementModel,
  config: AppConfig,
  sourceSha256: string,
): Promise<GenerateResult> {
  const summary = requirementSummary(requirement);
  const { data } = await chatJson(
    config.llm,
    [
      { role: "system", content: SYSTEM_JSON() },
      { role: "user", content: uiStateMatrixPrompt(summary) },
    ],
    (raw) => uiStateMatrixResponseSchema.parse(raw) as UiStateMatrixResponse,
  );

  let content = renderUiStateMatrix(data, { title: requirement.frontmatter.title });
  content += alignxFooter(sourceSha256, GENERATOR);

  const path = artifactOutputPath(config, "ui-state-matrix");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return { type: "ui-state-matrix", path, content };
}
