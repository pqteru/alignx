import type { ArtifactType } from "../types.js";

export type AlignxLocale = "zh-TW" | "en";

export function resolveLocale(): AlignxLocale {
  const v = (process.env.ALIGNX_LOCALE ?? "zh-TW").trim();
  return v === "en" ? "en" : "zh-TW";
}

export function llmLanguageRule(locale: AlignxLocale): string {
  if (locale === "en") {
    return "Write ALL reader-facing string values in English. Keep JSON keys, ids (AC-001), and priority enum (must/should/could) in English.";
  }
  return [
    "語言：所有面向讀者的字串內容必須使用「繁體中文（台灣用語）」。",
    "保持 JSON 的 key、id 代碼（如 AC-001、TASK-001）、priority 枚舉（must/should/could）、surface_id 使用英文或 kebab-case。",
    "狀態名稱 state、觸發 trigger 等欄位的「值」請用繁體中文（例如：閒置、載入中、成功、錯誤、空白）。",
  ].join("\n");
}

export function formatPriority(
  priority: "must" | "should" | "could",
  locale: AlignxLocale,
): string {
  if (locale === "en") return priority;
  const map = { must: "必須", should: "應該", could: "可以" } as const;
  return map[priority];
}

export const artifactTitles: Record<AlignxLocale, Record<ArtifactType, string>> = {
  "zh-TW": {
    "acceptance-criteria": "驗收標準",
    "ui-state-matrix": "UI 狀態矩陣",
    "sprint-backlog": "衝刺待辦",
  },
  en: {
    "acceptance-criteria": "Acceptance Criteria",
    "ui-state-matrix": "UI State Matrix",
    "sprint-backlog": "Sprint Backlog",
  },
};

export const labels = {
  "zh-TW": {
    requirement: "需求文件",
    requirementId: "需求編號",
    criteriaDetail: "驗收條目詳述",
    flowOverview: "流程總覽",
    given: "假設",
    when: "當",
    then: "則",
    testable: "可測",
    colId: "編號",
    colStory: "故事",
    colPriority: "優先級",
    colGiven: "假設",
    colWhen: "當",
    colThen: "則",
    colState: "狀態",
    colDescription: "說明",
    colUserSees: "使用者所見",
    colActions: "可執行動作",
    transitions: "狀態轉換",
    colFrom: "來源",
    colTo: "目標",
    colTrigger: "觸發",
    stateDiagram: "狀態圖",
    sprintGoal: "衝刺目標",
    velocity: "速率",
    points: "點",
    planned: "已規劃",
    colTitle: "標題",
    colPoints: "點數",
    colDepends: "依賴",
    tasks: "工作項目",
    story: "使用者故事",
    estimate: "估算",
    definitionOfDone: "完成定義",
    timeline: "時程",
    ganttSection: "工作項目",
    dashboardTitle: "AlignX 儀表板",
    dashboardSubtitle: "由 input/requirement.md 衍生的對齊文件 — 支援 drift 偵測",
    generated: "產生時間",
    hash: "雜湊",
    statusOk: "已對齊",
    statusStale: "已過期",
    statusMissing: "缺少",
  },
  en: {
    requirement: "Requirement",
    requirementId: "Requirement ID",
    criteriaDetail: "Criteria detail",
    flowOverview: "Flow overview",
    given: "Given",
    when: "When",
    then: "Then",
    testable: "Testable",
    colId: "ID",
    colStory: "Story",
    colPriority: "Priority",
    colGiven: "Given",
    colWhen: "When",
    colThen: "Then",
    colState: "State",
    colDescription: "Description",
    colUserSees: "User sees",
    colActions: "Actions",
    transitions: "Transitions",
    colFrom: "From",
    colTo: "To",
    colTrigger: "Trigger",
    stateDiagram: "State diagram",
    sprintGoal: "Sprint goal",
    velocity: "Velocity",
    points: "pts",
    planned: "Planned",
    colTitle: "Title",
    colPoints: "Points",
    colDepends: "Depends on",
    tasks: "Tasks",
    story: "Story",
    estimate: "Estimate",
    definitionOfDone: "Definition of Done",
    timeline: "Timeline",
    ganttSection: "Tasks",
    dashboardTitle: "AlignX Dashboard",
    dashboardSubtitle: "Aligned artifacts from input/requirement.md — drift-aware",
    generated: "Generated",
    hash: "hash",
    statusOk: "ok",
    statusStale: "stale",
    statusMissing: "missing",
  },
} as const;

export type LabelSet = (typeof labels)[AlignxLocale];

export function getLabels(locale: AlignxLocale): LabelSet {
  return labels[locale];
}

export function driftMessages(locale: AlignxLocale) {
  if (locale === "en") {
    return {
      missingRequirement: (p: string) => `Missing requirement: ${p}`,
      noManifest: "No manifest found — run `alignx generate` first",
      requirementChanged: "input/requirement.md changed since last generation",
      missingArtifact: (t: string) => `Missing artifact: ${t}`,
      fileMissing: (p: string) => `File missing: ${p}`,
      fileModified: (p: string) => `File modified outside alignx: ${p}`,
      artifactStale: (t: string) => `${t} is stale (requirement changed)`,
      checkOk: "✓ No drift detected — all artifacts aligned with input/requirement.md",
      checkFail: "✗ Drift detected:\n",
    };
  }
  return {
    missingRequirement: (p: string) => `找不到需求文件：${p}`,
    noManifest: "尚無 manifest — 請先執行 `alignx generate`",
    requirementChanged: "input/requirement.md 已變更，尚未重新產生文件",
    missingArtifact: (t: string) => `缺少產物：${t}`,
    fileMissing: (p: string) => `檔案不存在：${p}`,
    fileModified: (p: string) => `檔案在 alignx 外被修改：${p}`,
    artifactStale: (t: string) => `${t} 已過期（需求已變更）`,
    checkOk: "✓ 未偵測到 drift — 所有產物與 input/requirement.md 對齊",
    checkFail: "✗ 偵測到 drift：\n",
  };
}
