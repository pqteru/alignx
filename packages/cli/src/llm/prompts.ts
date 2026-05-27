import { llmLanguageRule, resolveLocale } from "../core/locale.js";

export const SYSTEM_JSON = (locale = resolveLocale()) =>
  [
    locale === "zh-TW"
      ? "你是資深產品分析師，擅長將需求轉成可測試、可對照的結構化文件。輸出須完整、禁止省略需求中的情境組合（例如僅售、僅租）。"
      : "You are a senior product analyst producing testable structured docs.",
    "Output ONLY valid JSON. No markdown, no commentary.",
    llmLanguageRule(locale),
  ].join(" ");

function localeBlock(): string {
  return `\n${llmLanguageRule(resolveLocale())}\n`;
}

export function acceptanceCriteriaPrompt(summary: string): string {
  return `From the requirement below, produce acceptance criteria as JSON matching the quality bar of a professional PRD.
${localeBlock()}
Schema:
{
  "user_story_line": "一句話使用者故事（繁中）",
  "coverage": [
    { "scenario": "Cos-3 雙入口", "ac_id": "AC-001", "priority": "must", "summary": "簡短摘要" }
  ],
  "pending_items": [{ "cos_ref": "Cos-1", "note": "若需求與本次範圍不一致時說明" }],
  "criteria": [
    {
      "id": "AC-001",
      "cos_ref": "Cos-3",
      "title": "Cos-3 雙入口",
      "given": "...",
      "when": "...",
      "then": "...",
      "priority": "must",
      "testable": true,
      "ui_mapping": "決策表列 1 或 surface_id"
    }
  ],
  "test_data": [
    {
      "case_id": "A",
      "title": "雙入口可見",
      "preconditions": ["已登入房仲身份", "帳號具備售+租刊登"],
      "steps": ["進入首頁", "點擊出售物件更新"],
      "expected": ["顯示售+租兩個按鈕", "成功導向出售更新排序頁"],
      "expected_ac_ids": ["AC-001", "AC-005"]
    }
  ],
  "ac_ui_mapping": [
    { "ac_ids": "AC-001～004", "ui_section": "決策表：手動更新捷徑區塊顯示邏輯" }
  ],
  "flow_mermaid": "flowchart TB\\n  subgraph ...（繁中節點，依顯示/跳轉/頻道分組）"
}

Rules (MUST):
- Separate criteria for: 售+租雙入口、僅售、僅租、皆無隱藏 (Cos-3/4), 出售跳轉、出租跳轉 (Cos-2), 頻道清單可見, 外部URL（若有）, 非目標（不內嵌操作、排除身份等）
- Never skip 僅售-only case
- coverage table row per criterion; pending_items for ambiguous Cos (e.g. Cos-1 全部更新 vs 雙按鈕)
- test_data: keep it generic and case-by-case (preconditions/steps/expected), not fixed domain columns
- when requirement has condition combinations (e.g. 刊登組合), include at least A/B/C/D style cases
- flow_mermaid: branch by 刊登組合, not linear chain of all ACs
- ui_mapping on each criterion linking to UI matrix section
- IDs AC-001, AC-002 sequential; priority must for core

Requirement:
${summary}`;
}

export function uiStateMatrixPrompt(summary: string): string {
  return `From the requirement below, produce a UI state matrix as JSON matching professional quality.
${localeBlock()}
Schema:
{
  "doc_subtitle": "需求編號與 Cos 範圍一句話",
  "overview_mermaid": "flowchart LR with 首頁 subgraph linking surfaces",
  "decision_table": {
    "title": "決策表：手動更新捷徑區塊顯示邏輯",
    "entry_condition": "已登入房仲、於首頁",
    "columns": ["有售屋刊登", "有租屋刊登", "區塊顯示（使用者所見）", "對應"],
    "rows": [
      { "cells": ["✓", "✓", "兩個按鈕", "Cos-3"], "cos_ref": "Cos-3" }
    ],
    "footnote": "Cos-1 與本次範圍差異備註（若適用）"
  },
  "surfaces": [
    {
      "surface_id": "homepage-manual-update",
      "name": "首頁－手動更新捷徑區塊",
      "kind": "decision",
      "cos_refs": ["Cos-3", "Cos-4"],
      "surface_type_note": "區塊級顯示結果，由上表決策",
      "steady_states": [
        { "state": "雙入口", "description": "...", "user_visible": "..." }
      ],
      "states": [],
      "transitions": []
    },
    {
      "surface_id": "selling-update-entry",
      "name": "出售物件更新入口",
      "kind": "fsm",
      "cos_refs": ["Cos-2", "Cos-3"],
      "entry_condition": "...",
      "states": [
        { "state": "可見", "description": "", "user_visible": "", "actions": ["點擊按鈕"] },
        { "state": "隱藏", "description": "", "user_visible": "", "actions": [] },
        { "state": "導航中", "description": "", "user_visible": "", "actions": [] },
        { "state": "錯誤", "description": "", "user_visible": "", "actions": ["重試"] }
      ],
      "transitions": [{ "from": "可見", "to": "導航中", "trigger": "點擊出售更新" }],
      "navigation_target": "既有出售更新排序頁"
    },
    {
      "surface_id": "agent-channel-links",
      "name": "房仲頻道快速入口",
      "kind": "static",
      "cos_refs": ["本次包含"],
      "entry_condition": "...",
      "static_groups": [
        { "group_name": "賣方／經營相關", "rows": [{ "item": "預約客戶", "target": "維持舊有導向", "note": "本次不變" }] }
      ],
      "exclusions_note": "新客、舊客、屋主；首頁內嵌更新"
    }
  ],
  "ac_cross_ref": [
    { "scenario": "Cos-3 僅售／僅租／雙入口", "test_focus": "決策表四列＋截圖" }
  ]
}

Rules (MUST):
- decision_table with ALL 4 combos: 售+租、僅售、僅租、皆無
- kind=static: list EVERY channel from requirement in static_groups; no state machine, no self-loop transitions
- kind=fsm: 可見/隱藏/導航中/錯誤 for navigation surfaces; separate 出售 vs 租屋 targets
- homepage-manual-update: kind=decision + steady_states (雙入口/僅售/僅租/隱藏), not idle/loading English
- overview_mermaid required
- ac_cross_ref for QA alignment with acceptance criteria
- Forbidden: transitions from X to X; vague single state for entire channel list

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

export function observabilityPrompt(summary: string): string {
  return `From the requirement below, produce an observability plan as JSON.
${localeBlock()}
Schema:
{
  "objective": "觀測目標一句話",
  "north_star": "可選，北極星指標",
  "events": [
    {
      "name": "event_name_snake_or_dot",
      "category": "navigation|conversion|quality|retention|feedback",
      "trigger": "何時觸發",
      "properties": ["key1", "key2"],
      "pii_risk": "none|low|medium|high",
      "sampling": "100% 或 20%",
      "owner": "team",
      "related_surface": "surface_id"
    }
  ],
  "metrics": [
    {
      "name": "metric_name",
      "type": "counter|gauge|histogram|ratio",
      "definition": "定義",
      "target": "目標值",
      "dimensions": ["platform", "channel"]
    }
  ],
  "alerts": [
    {
      "name": "alert name",
      "condition": "5m error_rate > 3%",
      "severity": "info|warning|critical",
      "action": "oncall + ticket"
    }
  ],
  "dashboards": ["Dashboard 1", "Dashboard 2"],
  "retention_notes": ["留存多久", "匿名化策略"],
  "feedback_loop": ["收集", "分析", "迭代"]
}

Rules (MUST):
- Cover full funnel where applicable: exposure -> click -> navigation -> success/failure
- Include events for tracking, review, feedback, retention outcomes
- Every event must have trigger + properties + pii_risk + sampling
- Include at least one quality metric and one retention/engagement metric
- Include concrete alert conditions for critical failures
- Keep names implementation-friendly and unambiguous

Requirement:
${summary}`;
}

/** UI State Architect — state transition system modeling (not generic requirements). */
export const SYSTEM_UI_STATE_SPEC = (locale = resolveLocale()) =>
  [
    "你是 UI State Architect。",
    "Output ONLY valid JSON. No markdown, no commentary.",
    llmLanguageRule(locale),
  ].join(" ");

const UI_STATE_SPEC_ROLE = `你是一個 UI State Architect。

請不要產出一般需求文件。
請把這個功能建模成「狀態轉移系統」。

輸入：我會提供一個 UI 功能描述。

你要產出以下文件：

1. State Space
- 列出所有合法狀態
- 不要用多個 boolean 拼狀態
- 用 enum / union / sealed class 思考
- 標示哪些狀態互斥

2. Events / Actions
- 列出所有會觸發狀態改變的事件
- 分成 user event、system event、async event

3. Transition Table
- 用表格表示：
  current state + event → next state
- 不允許模糊描述
- 不合法轉移要標示 ignored / impossible / error

4. Derived UI
- 說明每個 state 對應畫面怎麼 render
- UI 只能由 state 推導
- 不允許 UI 自己保存 business state

5. Side Effects
- API request、navigation、timer、storage 都要獨立列出
- side effect 不可直接改 UI
- side effect 結果必須回到 event/action

6. Invalid States
- 列出原本可能出現但應該被設計排除的非法狀態
- 說明如何用 state model 避免

7. State Diagram
- 用 Mermaid stateDiagram-v2 畫出狀態圖

核心原則：
- Make invalid states impossible
- UI = Render(State)
- State_next = Transition(State_current, Event)
- 不要用 loading/success/error 這種模板化分類
- 以狀態空間、事件、轉移、約束來描述`;

export function uiStateSpecPrompt(summary: string): string {
  return `${UI_STATE_SPEC_ROLE}
${localeBlock()}
將上述七個章節的內容輸出為 JSON，結構如下：

Schema:
{
  "feature_scope": "此功能在狀態模型中的邊界一句話",
  "state_space": {
    "modeling_notes": "如何用 enum/union 建模、為何不用 boolean 組合",
    "states": [
      {
        "id": "HomepageShortcutPanel",
        "label": "繁中狀態名",
        "description": "語意說明",
        "mutual_excludes": ["OtherStateId"]
      }
    ]
  },
  "events": {
    "user": [{ "id": "TapSellUpdate", "label": "...", "description": "..." }],
    "system": [{ "id": "SessionResolved", "label": "...", "description": "..." }],
    "async": [{ "id": "NavigationCompleted", "label": "...", "description": "..." }]
  },
  "transitions": [
    {
      "current_state": "StateId",
      "event": "EventId",
      "next_state": "NextStateId",
      "disposition": "allowed",
      "notes": "可選"
    },
    {
      "current_state": "StateId",
      "event": "ForbiddenEvent",
      "disposition": "ignored|impossible|error",
      "notes": "為何不合法"
    }
  ],
  "derived_ui": [
    {
      "state_id": "StateId",
      "render_summary": "此狀態下畫面如何呈現",
      "ui_elements": ["可見元件"],
      "must_not_persist": ["不可在 UI 保存的 business 欄位"]
    }
  ],
  "side_effects": [
    {
      "id": "fx_nav_sell",
      "kind": "navigation|api|timer|storage|other",
      "on_event": "TapSellUpdate",
      "description": "導向出售更新排序頁",
      "emits_event": "NavigationCompleted"
    }
  ],
  "invalid_states": [
    {
      "name": "例如：售租按鈕同時顯示但無刊登",
      "why_illegal": "業務上不可能",
      "prevention": "用單一 enum 狀態涵蓋四種刊登組合"
    }
  ],
  "state_diagram_mermaid": "stateDiagram-v2\\n  [*] --> Idle\\n  ..."
}

Rules (MUST):
- state id / event id 用 PascalCase 或 snake_case，穩定可當程式 enum
- 涵蓋需求中所有 UI 條件組合；互斥關係寫在 mutual_excludes
- transitions：每個 (state, event) 至多一列；合法用 disposition=allowed + next_state
- 禁止用 Loading / Success / Error 當狀態名；用領域語意狀態（如：雙入口可見、導向出售頁中）
- derived_ui 必須覆蓋 state_space 中每個 state
- side_effects 的 emits_event 必須出現在 events 區塊
- state_diagram_mermaid 必須是 stateDiagram-v2，節點名與 state id 一致
- 若需求有決策表（如售/租組合），用單一狀態 enum 表達，不用多 boolean

UI 功能描述（requirement）：
${summary}`;
}
