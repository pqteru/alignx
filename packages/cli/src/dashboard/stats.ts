import type { ArtifactType } from "../types.js";
import type { AlignxLocale } from "../core/locale.js";

export interface StatKpi {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: "accent" | "ok" | "stale" | "muted";
}

export interface StatChart {
  id: string;
  type: "doughnut" | "bar" | "pie";
  title: string;
  labels: string[];
  values: number[];
}

export interface DashboardStats {
  kpis: StatKpi[];
  charts: StatChart[];
  overviewMermaid: string;
  docHints: Partial<Record<ArtifactType, string[]>>;
}

function parseAcTable(md: string): { must: number; should: number; could: number; count: number } {
  let must = 0;
  let should = 0;
  let could = 0;
  let count = 0;
  const lines = md.split("\n");
  let inListTable = false;
  for (const line of lines) {
    if (/## 驗收條目一覽|## Criteria list/i.test(line)) {
      inListTable = true;
      continue;
    }
    if (inListTable && /^## /.test(line) && !/驗收條目一覽|Criteria list/i.test(line)) {
      break;
    }
    if (!inListTable) continue;
    if (/^\|[-\s|]+\|$/.test(line.trim())) continue;
    if (line.startsWith("|") && /^AC-/i.test(line.split("|")[1]?.trim() ?? "")) {
      count++;
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      const pri = (cols[2] ?? "").toLowerCase();
      if (pri.includes("必須") || pri === "must") must++;
      else if (pri.includes("應該") || pri === "should") should++;
      else if (pri.includes("可以") || pri === "could") could++;
    }
  }
  return { must, should, could, count };
}

function parseUiMatrix(md: string): {
  surfaces: { name: string; states: number; transitions: number }[];
  totalStates: number;
  totalTransitions: number;
} {
  const surfaces: { name: string; states: number; transitions: number }[] = [];
  const sections = md.split(/^## /m).slice(1);
  for (const block of sections) {
    const titleLine = block.split("\n")[0] ?? "";
    const name = titleLine.replace(/（`[^`]+`）/, "").trim();
    if (!name || /^UI\s*(狀態|State)/i.test(name)) continue;
    const stateRows = (block.match(/^\|\s*\*\*[^*]+\*\*/gm) ?? []).length;
    const transSection = block.split(/### (狀態轉換|Transitions)/)[2];
    let transitions = 0;
    if (transSection) {
      transitions = transSection
        .split("\n")
        .filter((l) => l.startsWith("|") && !l.includes("---") && !/來源|From/i.test(l)).length;
    }
    surfaces.push({ name: name.slice(0, 28), states: stateRows, transitions });
  }
  return {
    surfaces,
    totalStates: surfaces.reduce((s, x) => s + x.states, 0),
    totalTransitions: surfaces.reduce((s, x) => s + x.transitions, 0),
  };
}

function parseSprintBacklog(md: string): {
  tasks: number;
  points: number;
  velocity: number;
  sprintName: string;
} {
  const sprintMatch = /#\s*[^:]+:\s*(.+)$/m.exec(md) ?? /#\s*(.+)$/m.exec(md);
  const sprintName = sprintMatch?.[1]?.trim() ?? "Sprint";
  const velocityMatch = /velocity:\s*(\d+)/i.exec(md);
  const velocity = velocityMatch ? Number(velocityMatch[1]) : 0;
  let tasks = 0;
  let points = 0;
  const lines = md.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (/^\|\s*(ID|編號)/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^\|[-\s|]+\|$/.test(line.trim())) continue;
    if (inTable && line.startsWith("|")) {
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4 && /^task-/i.test(cols[0]!)) {
        tasks++;
        const pts = Number(cols[3]);
        if (Number.isFinite(pts)) points += pts;
      }
    }
  }
  return { tasks, points, velocity, sprintName };
}

function buildOverviewMermaid(
  locale: AlignxLocale,
  docTitles: { id: string; title: string }[],
  acCount: number,
  uiSurfaces: number,
): string {
  const root = locale === "zh-TW" ? "需求產出" : "Outputs";
  const lines = ["mindmap", `  root((${root}))`];
  for (const d of docTitles) {
    const id = d.id.replace(/-/g, "_");
    let extra = "";
    if (d.id === "acceptance-criteria" && acCount) extra = locale === "zh-TW" ? ` ${acCount}條` : ` ${acCount}`;
    if (d.id === "ui-state-matrix" && uiSurfaces)
      extra = locale === "zh-TW" ? ` ${uiSurfaces}面` : ` ${uiSurfaces}`;
    const label = d.title.replace(/"/g, "'");
    lines.push(`    ${id}["${label}${extra}"]`);
  }
  return lines.join("\n");
}

export function buildDashboardStats(
  locale: AlignxLocale,
  docs: { id: ArtifactType; title: string; markdown: string; status: string }[],
  meta: { reqStatus: string },
): DashboardStats {
  const zh = locale === "zh-TW";
  const kpis: StatKpi[] = [];
  const charts: StatChart[] = [];
  const docHints: Partial<Record<ArtifactType, string[]>> = {};

  const ok = docs.filter((d) => d.status === "ok").length;
  const stale = docs.filter((d) => d.status === "stale").length;
  const missing = docs.filter((d) => d.status === "missing").length;

  kpis.push({
    id: "docs",
    label: zh ? "產物數" : "Artifacts",
    value: String(docs.length),
    hint: zh ? `${ok} 已對齊` : `${ok} aligned`,
    tone: "accent",
  });

  kpis.push({
    id: "req",
    label: zh ? "需求狀態" : "Requirement",
    value:
      meta.reqStatus === "ok"
        ? zh
          ? "已對齊"
          : "Aligned"
        : meta.reqStatus === "stale"
          ? zh
            ? "已過期"
            : "Stale"
          : zh
            ? "—"
            : "—",
    tone: meta.reqStatus === "ok" ? "ok" : "stale",
  });

  let acCount = 0;
  let uiSurfaces = 0;

  const acDoc = docs.find((d) => d.id === "acceptance-criteria");
  if (acDoc?.markdown) {
    const { must, should, could, count } = parseAcTable(acDoc.markdown);
    acCount = count;
    kpis.push({
      id: "ac",
      label: zh ? "驗收條目" : "Acceptance criteria",
      value: String(count),
      hint: zh ? `必須 ${must} · 應該 ${should} · 可以 ${could}` : `must ${must} · should ${should}`,
      tone: "ok",
    });
    if (count > 0) {
      charts.push({
        id: "ac-priority",
        type: "doughnut",
        title: zh ? "驗收標準 — 優先級" : "AC — Priority",
        labels: zh ? ["必須", "應該", "可以"] : ["Must", "Should", "Could"],
        values: [must, should, could],
      });
    }
    docHints["acceptance-criteria"] = [
      zh ? `共 ${count} 條` : `${count} items`,
      zh ? `必須 ${must} 條` : `${must} must`,
    ];
  }

  const specDoc = docs.find((d) => d.id === "ui-state-spec");
  if (specDoc?.markdown) {
    const stateCount = (specDoc.markdown.split("## 1. State Space")[1]?.split("## 2.")[0] ?? "")
      .split("\n")
      .filter((l) => l.startsWith("| `")).length;
    const transCount = (specDoc.markdown.split("## 3. Transition Table")[1]?.split("## 4.")[0] ?? "")
      .split("\n")
      .filter((l) => l.startsWith("| `")).length;
    if (stateCount > 0) {
      kpis.push({
        id: "spec",
        label: zh ? "狀態模型" : "State model",
        value: String(stateCount),
        hint: zh ? `${transCount} 轉移` : `${transCount} transitions`,
        tone: "accent",
      });
      docHints["ui-state-spec"] = [
        zh ? `${stateCount} 合法狀態` : `${stateCount} states`,
        zh ? `${transCount} 轉移列` : `${transCount} transitions`,
      ];
    }
  }

  const uiDoc = docs.find((d) => d.id === "ui-state-matrix");
  if (uiDoc?.markdown) {
    const ui = parseUiMatrix(uiDoc.markdown);
    uiSurfaces = ui.surfaces.length;
    kpis.push({
      id: "ui",
      label: zh ? "UI 介面" : "UI surfaces",
      value: String(uiSurfaces),
      hint: zh
        ? `${ui.totalStates} 狀態 · ${ui.totalTransitions} 轉換`
        : `${ui.totalStates} states · ${ui.totalTransitions} trans.`,
      tone: "accent",
    });
    if (ui.surfaces.length > 0) {
      charts.push({
        id: "ui-states",
        type: "bar",
        title: zh ? "各介面狀態數" : "States per surface",
        labels: ui.surfaces.map((s) => s.name),
        values: ui.surfaces.map((s) => s.states),
      });
    }
    docHints["ui-state-matrix"] = ui.surfaces.slice(0, 5).map((s) =>
      zh ? `${s.name}：${s.states} 狀態` : `${s.name}: ${s.states}`,
    );
  }

  const sprintDoc = docs.find((d) => d.id === "sprint-backlog");
  if (sprintDoc?.markdown) {
    const sp = parseSprintBacklog(sprintDoc.markdown);
    kpis.push({
      id: "sprint",
      label: zh ? "衝刺任務" : "Tasks",
      value: String(sp.tasks),
      hint: zh ? `${sp.points} / ${sp.velocity || "—"} 點` : `${sp.points} pts`,
      tone: sp.velocity > 0 && sp.points > sp.velocity ? "stale" : "ok",
    });
    if (sp.tasks > 0) {
      charts.push({
        id: "sprint-points",
        type: "bar",
        title: zh ? "衝刺點數" : "Sprint points",
        labels: zh ? ["已規劃", "速率"] : ["Planned", "Velocity"],
        values: [sp.points, sp.velocity || 0],
      });
    }
    docHints["sprint-backlog"] = [sp.sprintName, zh ? `${sp.tasks} 任務` : `${sp.tasks} tasks`];
  }

  charts.push({
    id: "artifact-status",
    type: "pie",
    title: zh ? "產物對齊狀態" : "Artifact status",
    labels: zh ? ["已對齊", "已過期", "缺少"] : ["OK", "Stale", "Missing"],
    values: [ok, stale, missing],
  });

  return {
    kpis,
    charts: charts.filter((c) => c.values.some((v) => v > 0)),
    overviewMermaid: buildOverviewMermaid(
      locale,
      docs.map((d) => ({ id: d.id, title: d.title })),
      acCount,
      uiSurfaces,
    ),
    docHints,
  };
}
