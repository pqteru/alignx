# AlignX

從 `input/requirement.md` 產出對齊、可視覺化的產品文件，透過本機 [LM Studio](https://lmstudio.ai/) 驅動。

**目標：** 減少文件 drift、產出易讀的產物（表格、Mermaid 圖表），並以 `alignx check` 驗證與需求是否一致。

## 快速開始

```bash
pnpm install
pnpm build

# 在專案目錄（請先執行 init）
node packages/cli/dist/index.js init
node packages/cli/dist/index.js doctor    # 需先啟動 LM Studio
node packages/cli/dist/index.js generate --all
node packages/cli/dist/index.js dashboard --open
```

建置後也可全域連結：

```bash
cd packages/cli && pnpm link --global
alignx init && alignx generate --all
```

## 設定

複製 `.env.example` 為 `.env`（或執行 `alignx init`）：

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `ALIGNX_LLM_BASE_URL` | `http://localhost:1234/v1` | LM Studio OpenAI 相容 API |
| `ALIGNX_LLM_API_KEY` | `lm-studio` | API 金鑰（LM Studio 可填任意值） |
| `ALIGNX_LLM_MODEL` | _（自動）_ | 模型 id；留空則使用第一個可用模型 |
| `ALIGNX_LLM_TEMPERATURE` | `0` | 愈低愈穩定 |
| `ALIGNX_OUTPUT_DIR` | `./output` | 產物根目錄 |
| `ALIGNX_REQUIREMENT_PATH` | `./input/requirement.md` | 需求單一來源（SoT） |
| `ALIGNX_LOCALE` | `zh-TW` | 產物語言（`zh-TW` 或 `en`） |

可選的 `alignx.config.yaml` 可設定預設要產生的 artifact 類型。

## 指令

| 指令 | 說明 |
|------|------|
| `alignx init` | 建立 `input/requirement.md`、`.env`、設定檔 |
| `alignx doctor` | 測試 LM Studio 連線 |
| `alignx generate` | 產生產物（預設：驗收標準 + UI 狀態矩陣） |
| `alignx generate --all` | 含衝刺待辦在內的全部類型 |
| `alignx generate -t acceptance-criteria` | 只產生單一類型 |
| `alignx check` | 檢查需求是否變更或檔案 drift（最新一筆 run） |
| `alignx check --run 20260526_111111` | 檢查指定 run 資料夾 |
| `alignx dashboard` | 為最新 run 建立儀表板 |
| `alignx dashboard --open` | 建立並用瀏覽器開啟 |

## 專案結構

執行一次 `alignx init` 建立骨架：

```
input/requirement.md        # 需求單一來源（本機，不納入此工具 repo）
output/                     # 產物目錄（git 僅保留 .gitkeep）
```

需求範例：`docs/example/requirement.md`

## 產物輸出

每次 `alignx generate` 會在 `output/` 下建立時間戳資料夾（`YYYYMMDD_HHmmss`）：

```
output/
└── 20260526_111111/
    ├── .alignx-manifest.json
    ├── acceptance-criteria.md
    ├── ui-state-matrix.md
    ├── sprint-backlog.md
    └── dashboard.html          # 儀表板（左側選單切換各文件）
```

`alignx check` 與 `alignx dashboard` **預設使用最新一筆 run**。指定某次產出請加 `--run 20260526_111111`。

每份 Markdown 底部含 HTML 註解，記錄 `source` 雜湊與產生器版本。

## 語言

預設產物為**繁體中文（台灣）**。若需英文，在 `.env` 設定 `ALIGNX_LOCALE=en`。

## requirement.md 格式

使用 YAML frontmatter 與 `##` 章節（內文建議繁體中文）：

```yaml
---
id: PROJ-001
title: 我的功能
version: 1.0.0
---

## Goals
## User stories
## UI surfaces
```

## Drift 工作流程

1. 編輯 `input/requirement.md`
2. `alignx check` → 若已過期則 exit 1
3. `alignx generate` → 產生新的時間戳資料夾與 manifest
4. CI 可在產生步驟後執行 `alignx check`

## 授權

MIT
