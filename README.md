# AlignX

Generate aligned, visual product documents from `input/requirement.md` — powered by local [LM Studio](https://lmstudio.ai/).

**Goals:** reduce document drift, produce easy-to-read artifacts (tables, Mermaid diagrams), and verify alignment with `alignx check`.

## Quick start

```bash
pnpm install
pnpm build

# In your project directory (run init first)
node packages/cli/dist/index.js init
node packages/cli/dist/index.js doctor    # LM Studio must be running
node packages/cli/dist/index.js generate --all
node packages/cli/dist/index.js dashboard --open
```

Or link globally after build:

```bash
cd packages/cli && pnpm link --global
alignx init && alignx generate --all
```

## Configuration

Copy `.env.example` to `.env` (or run `alignx init`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ALIGNX_LLM_BASE_URL` | `http://localhost:1234/v1` | LM Studio OpenAI-compatible API |
| `ALIGNX_LLM_API_KEY` | `lm-studio` | API key (LM Studio accepts any value) |
| `ALIGNX_LLM_MODEL` | _(auto)_ | Model id; empty = first available |
| `ALIGNX_LLM_TEMPERATURE` | `0` | Lower = more deterministic |
| `ALIGNX_OUTPUT_DIR` | `./output` | Generated files |
| `ALIGNX_REQUIREMENT_PATH` | `./input/requirement.md` | Source of truth |
| `ALIGNX_LOCALE` | `zh-TW` | Output language (`zh-TW` or `en`) |

Optional `alignx.config.yaml` lists default artifacts to generate.

## Commands

| Command | Description |
|---------|-------------|
| `alignx init` | Create `input/requirement.md`, `.env`, config |
| `alignx doctor` | Test LM Studio connection |
| `alignx generate` | Generate artifacts (default: AC + UI matrix) |
| `alignx generate --all` | All types including sprint backlog |
| `alignx generate -t acceptance-criteria` | Single artifact |
| `alignx check` | Fail if requirement changed or files drifted |
| `alignx dashboard` | Build `output/dashboard/index.html` |

## Project layout

Run `alignx init` once to scaffold:

```
input/requirement.md        # source of truth (local, not in this tool repo)
output/                     # generated artifacts (gitignored except .gitkeep)
```

Example requirement: `docs/example/requirement.md`

## Outputs

```
output/
├── .alignx-manifest.json   # source hashes — drift detection
├── acceptance-criteria.md
├── ui-state-matrix.md
├── sprint-backlog.md
└── dashboard/
    └── index.html
```

Each markdown file includes an HTML comment footer with `source` hash and generator version.

## Language

By default, generated documents use **Traditional Chinese (Taiwan)**. Set `ALIGNX_LOCALE=en` in `.env` for English output.

## requirement.md format

Use YAML frontmatter plus `##` sections (content can be written in 繁體中文):

```yaml
---
id: PROJ-001
title: My Feature
version: 1.0.0
---

## Goals
## User stories
## UI surfaces
```

## Drift workflow

1. Edit `input/requirement.md`
2. `alignx check` → exit 1 if stale
3. `alignx generate` → refresh artifacts + manifest
4. Use in CI: `alignx check` after generation step

## License

MIT
