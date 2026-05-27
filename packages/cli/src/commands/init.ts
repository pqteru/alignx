import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DEFAULT_REQUIREMENT_PATH } from "../core/config.js";

const REQUIREMENT_TEMPLATE = `---
id: PROJ-001
title: 範例功能
version: 1.0.0
stakeholders:
  - 產品
  - 設計
  - 工程
---

## Goals

描述此功能成功時的樣貌。

## User stories

- 身為使用者，我希望能用電子郵件與密碼登入，以便存取我的帳戶。
- 身為使用者，我希望在登入失敗時看到清楚的錯誤訊息。

## Constraints

- 登入 API 逾時：5 秒
- 密碼至少 8 個字元

## UI surfaces

- login-form
- error-toast
- session-dashboard

## Non-goals

- 社群登入（延後至 v2）
`;

const ENV_EXAMPLE = `# LM Studio (OpenAI-compatible API)
ALIGNX_LLM_BASE_URL=http://localhost:1234/v1
ALIGNX_LLM_API_KEY=lm-studio
ALIGNX_LLM_MODEL=
ALIGNX_LLM_TEMPERATURE=0
ALIGNX_LLM_MAX_TOKENS=4096

ALIGNX_OUTPUT_DIR=./output
ALIGNX_REQUIREMENT_PATH=./input/requirement.md

# 產物語言（zh-TW | en）
ALIGNX_LOCALE=zh-TW
`;

const CONFIG_YAML = `output_dir: ./output
requirement_path: ./input/requirement.md

artifacts:
  - acceptance-criteria
  - ui-state-matrix
  - ui-state-spec
  - observability
`;

export async function runInit(cwd = process.cwd()): Promise<void> {
  const files: { path: string; content: string; skipIfExists?: boolean }[] = [
    { path: "input/.gitkeep", content: "", skipIfExists: true },
    { path: "output/.gitkeep", content: "", skipIfExists: true },
    {
      path: DEFAULT_REQUIREMENT_PATH,
      content: REQUIREMENT_TEMPLATE,
      skipIfExists: true,
    },
    { path: ".env.example", content: ENV_EXAMPLE },
    { path: "alignx.config.yaml", content: CONFIG_YAML, skipIfExists: true },
  ];

  for (const f of files) {
    const full = resolve(cwd, f.path);
    if (f.skipIfExists && existsSync(full)) {
      console.log(`  skip ${f.path} (exists)`);
      continue;
    }
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, f.content, "utf8");
    console.log(`  created ${f.path}`);
  }

  const envPath = resolve(cwd, ".env");
  const envExample = resolve(cwd, ".env.example");
  if (!existsSync(envPath) && existsSync(envExample)) {
    await copyFile(envExample, envPath);
    console.log("  created .env (from .env.example)");
  } else if (!existsSync(envPath)) {
    await writeFile(envPath, ENV_EXAMPLE, "utf8");
    console.log("  created .env");
  }

  console.log("\nNext steps:");
  console.log("  1. Start LM Studio and load a model");
  console.log(`  2. Edit ${DEFAULT_REQUIREMENT_PATH}`);
  console.log("  3. alignx doctor");
  console.log("  4. alignx generate --all");
}
