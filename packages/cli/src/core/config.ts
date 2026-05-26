import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { parse as parseYaml } from "yaml";
import type { AlignxConfig, AppConfig, ArtifactType } from "../types.js";
import { ALL_ARTIFACTS } from "../types.js";

const DEFAULT_BASE_URL = "http://localhost:1234/v1";
export const DEFAULT_REQUIREMENT_PATH = "./input/requirement.md";

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function loadYamlConfig(cwd: string): Promise<Partial<AlignxConfig>> {
  const path = resolve(cwd, "alignx.config.yaml");
  if (!existsSync(path)) return {};
  const text = await readFile(path, "utf8");
  return parseYaml(text) as Partial<AlignxConfig>;
}

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  loadDotenv({ path: resolve(cwd, ".env") });

  const yaml = await loadYamlConfig(cwd);

  const outputDir = resolve(
    cwd,
    process.env.ALIGNX_OUTPUT_DIR ?? yaml.output_dir ?? "./output",
  );
  const requirementPath = resolve(
    cwd,
    process.env.ALIGNX_REQUIREMENT_PATH ??
      yaml.requirement_path ??
      DEFAULT_REQUIREMENT_PATH,
  );

  const artifacts = (yaml.artifacts ?? ALL_ARTIFACTS) as ArtifactType[];

  return {
    outputDir,
    requirementPath,
    artifacts,
    llm: {
      baseUrl: process.env.ALIGNX_LLM_BASE_URL ?? DEFAULT_BASE_URL,
      apiKey: process.env.ALIGNX_LLM_API_KEY ?? "lm-studio",
      model: process.env.ALIGNX_LLM_MODEL ?? "",
      temperature: envFloat("ALIGNX_LLM_TEMPERATURE", 0),
      maxTokens: envInt("ALIGNX_LLM_MAX_TOKENS", 4096),
    },
  };
}
