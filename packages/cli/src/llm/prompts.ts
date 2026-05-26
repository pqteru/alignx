import { llmLanguageRule, resolveLocale } from "../core/locale.js";

export const SYSTEM_JSON = (locale = resolveLocale()) =>
  [
    locale === "zh-TW"
      ? "你是資深產品分析師，擅長將需求轉成結構化文件。"
      : "You are a technical product analyst.",
    "Output ONLY valid JSON. No markdown, no commentary.",
    llmLanguageRule(locale),
  ].join(" ");

function localeBlock(): string {
  return `\n${llmLanguageRule(resolveLocale())}\n`;
}

export function acceptanceCriteriaPrompt(summary: string): string {
  return `From the requirement below, produce acceptance criteria as JSON.
${localeBlock()}
Schema:
{
  "criteria": [
    {
      "id": "AC-001",
      "story_ref": "US-001 or story title",
      "given": "...",
      "when": "...",
      "then": "...",
      "priority": "must" | "should" | "could",
      "testable": true
    }
  ]
}

Rules:
- At least 3 criteria covering main user flows
- Use Given/When/Then semantics in given/when/then fields
- IDs sequential AC-001, AC-002, ...
- priority "must" for core flows
- story_ref should reference the user story in the output language

Requirement:
${summary}`;
}

export function uiStateMatrixPrompt(summary: string): string {
  return `From the requirement below, produce a UI state matrix as JSON.
${localeBlock()}
Schema:
{
  "surfaces": [
    {
      "surface_id": "login-form",
      "name": "Login Form display name",
      "states": [
        {
          "state": "idle",
          "description": "...",
          "user_visible": "what user sees",
          "actions": ["action1"]
        }
      ],
      "transitions": [
        { "from": "idle", "to": "loading", "trigger": "submit" }
      ]
    }
  ]
}

Rules:
- Cover each UI surface mentioned (or infer from stories)
- Include states: idle, loading, success, error, empty where applicable (use Traditional Chinese labels for state values when locale is zh-TW)
- transitions must reference existing state names
- name, description, user_visible, actions, trigger must be in the output language

Requirement:
${summary}`;
}

export function sprintBacklogPrompt(summary: string): string {
  return `From the requirement below, produce a sprint backlog as JSON.
${localeBlock()}
Schema:
{
  "sprint_name": "Sprint 1",
  "sprint_goal": "...",
  "velocity_points": 13,
  "tasks": [
    {
      "id": "TASK-001",
      "title": "...",
      "story_ref": "US-001",
      "estimate_points": 3,
      "depends_on": [],
      "definition_of_done": ["..."]
    }
  ]
}

Rules:
- 5-12 tasks, sum estimate_points <= velocity_points
- Link tasks to user stories
- definition_of_done: 2-4 concrete items each
- sprint_name, sprint_goal, title, definition_of_done items in the output language

Requirement:
${summary}`;
}
