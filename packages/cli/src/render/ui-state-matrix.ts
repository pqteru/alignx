import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import type { UiStateMatrixResponse, UiSurface } from "../schemas/ui-state-matrix.js";

function kindLabel(kind: string, zh: boolean): string {
  if (kind === "decision") return zh ? "決策＋穩態" : "Decision";
  if (kind === "static") return zh ? "靜態清單" : "Static";
  return zh ? "狀態機" : "FSM";
}

export function renderUiStateMatrix(
  data: UiStateMatrixResponse,
  meta: { title?: string; requirementId?: string },
): string {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const zh = locale === "zh-TW";
  const docTitle = artifactTitles[locale]["ui-state-matrix"];

  const lines: string[] = [`# ${docTitle}`, ""];

  if (meta.title) {
    lines.push(`> **${meta.title}**`, ">");
    const sub =
      data.doc_subtitle ??
      (meta.requirementId
        ? `${L.requirementId}：\`${meta.requirementId}\``
        : "");
    if (sub) lines.push(`> ${sub}`, "", "");
    else lines.push("");
  }

  lines.push(`## ${L.uiOverview}`, "");
  lines.push(
    `| Surface ID | ${zh ? "名稱" : "Name"} | ${zh ? "類型" : "Kind"} | ${zh ? "對應情境" : "COS"} |`,
    "|------------|------|------|----------|",
  );
  for (const s of data.surfaces) {
    lines.push(
      `| \`${s.surface_id}\` | ${s.name} | ${kindLabel(s.kind, zh)} | ${s.cos_refs.join("、") || "—"} |`,
    );
  }
  lines.push("");

  if (data.overview_mermaid) {
    lines.push("```mermaid", data.overview_mermaid.trim(), "```", "", "---", "");
  }

  if (data.decision_table) {
    lines.push(...renderDecisionTable(data.decision_table, zh));
    lines.push("---", "");
  }

  for (const surface of data.surfaces) {
    if (surface.kind === "decision" && (surface.steady_states?.length ?? 0) > 0) {
      lines.push(...renderSteadySurface(surface, L, zh));
    } else {
      lines.push(...renderSurface(surface, L, zh));
    }
    lines.push("---", "");
  }

  if (data.ac_cross_ref?.length) {
    lines.push(`## ${L.acCrossRef}`, "");
    lines.push(`| ${zh ? "情境" : "Scenario"} | ${zh ? "建議對應 AC 測試重點" : "AC focus"} |`, "|------|----------------------|");
    for (const r of data.ac_cross_ref) {
      lines.push(`| ${r.scenario} | ${r.test_focus} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderDecisionTable(
  dt: NonNullable<UiStateMatrixResponse["decision_table"]>,
  zh: boolean,
): string[] {
  const lines: string[] = [`## ${dt.title}`, ""];
  if (dt.entry_condition) {
    lines.push(`**${zh ? "進入條件" : "Entry"}：** ${dt.entry_condition}`, "", "");
  }
  const cols = dt.columns;
  const hasCosCol = cols.some((c) => /對應|COS|Ref/i.test(c));
  const headerCols = hasCosCol ? cols : [...cols, zh ? "對應" : "Ref"];
  lines.push(`| ${headerCols.join(" | ")} |`, `|${headerCols.map(() => ":------:").join("|")}|`);
  for (const row of dt.rows) {
    const cells = [...row.cells];
    if (!hasCosCol && row.cos_ref) cells.push(row.cos_ref);
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");
  if (dt.footnote) lines.push(`> ${dt.footnote}`, "", "");
  return lines;
}

function renderSteadySurface(
  surface: UiSurface,
  L: ReturnType<typeof import("../core/locale.js").getLabels>,
  zh: boolean,
): string[] {
  const lines: string[] = [`## ${surface.name}（\`${surface.surface_id}\`）`, ""];
  if (surface.surface_type_note) {
    lines.push(`**${zh ? "類型" : "Type"}：** ${surface.surface_type_note}`, "", "");
  }
  if (surface.steady_states?.length) {
    lines.push(`| ${zh ? "穩態" : "Steady"} | ${L.colDescription} | ${L.colUserSees} |`, "|------|------|------------|");
    for (const s of surface.steady_states) {
      lines.push(`| **${s.state}** | ${s.description} | ${s.user_visible} |`);
    }
    lines.push("");
  }
  return lines;
}

function renderSurface(
  surface: UiSurface,
  L: ReturnType<typeof import("../core/locale.js").getLabels>,
  zh: boolean,
): string[] {
  const lines: string[] = [`## ${surface.name}（\`${surface.surface_id}\`）`, ""];

  if (surface.entry_condition) {
    lines.push(`**${zh ? "進入條件" : "Entry"}：** ${surface.entry_condition}`, "", "");
  }
  if (surface.surface_type_note) {
    lines.push(`**${zh ? "類型" : "Type"}：** ${surface.surface_type_note}`, "", "");
  }

  if (surface.kind === "static" && surface.static_groups?.length) {
    for (const group of surface.static_groups) {
      lines.push(`### ${group.group_name}`, "");
      lines.push(`| ${zh ? "入口" : "Item"} | ${zh ? "導向" : "Target"} | ${zh ? "備註" : "Note"} |`, "|------|------|------|");
      for (const row of group.rows) {
        lines.push(`| ${row.item} | ${row.target} | ${row.note ?? (zh ? "本次不變" : "unchanged")} |`);
      }
      lines.push("");
    }
    if (surface.exclusions_note) {
      lines.push(`> **${zh ? "本次不包含" : "Out of scope"}：** ${surface.exclusions_note}`, "", "");
    }
    return lines;
  }

  if (surface.states.length > 0) {
    lines.push(
      `| ${L.colState} | ${L.colDescription} | ${L.colUserSees} | ${L.colActions} |`,
      "|-------|-------------|-----------|---------|",
    );
    for (const s of surface.states) {
      const esc = (x: string) => x.replace(/\|/g, "\\|");
      const actions =
        s.actions.length > 0 ? s.actions.map((a) => `\`${a}\``).join("、") : "—";
      lines.push(
        `| **${s.state}** | ${esc(s.description)} | ${esc(s.user_visible)} | ${actions} |`,
      );
    }
    lines.push("");
  }

  const realTransitions = surface.transitions.filter(
    (t) =>
      t.from !== t.to &&
      !/無狀態|no transition|僅為固定/i.test(t.trigger),
  );

  if (realTransitions.length > 0) {
    lines.push(`### ${L.transitions}`, "");
    lines.push(`| ${L.colFrom} | ${L.colTo} | ${L.colTrigger} |`, "|------|-----|---------|");
    for (const t of realTransitions) {
      lines.push(`| ${t.from} | ${t.to} | ${t.trigger} |`);
    }
    lines.push("");
  }

  if (surface.kind === "fsm" && surface.states.length > 0 && realTransitions.length > 0) {
    lines.push(`### ${L.stateDiagram}`, "", "```mermaid", "stateDiagram-v2");
    const stateIds = new Map<string, string>();
    for (const s of surface.states) {
      const id = s.state.replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, "_") || "s";
      stateIds.set(s.state, id);
      lines.push(`  ${id}: ${s.state}`);
    }
    for (const t of realTransitions) {
      const from = stateIds.get(t.from) ?? t.from;
      const to = stateIds.get(t.to) ?? t.to;
      lines.push(`  ${from} --> ${to}: ${t.trigger}`);
    }
    lines.push("```", "");
  }

  if (surface.navigation_target) {
    lines.push(`**${zh ? "跳轉目標" : "Navigation"}：** ${surface.navigation_target}`, "", "");
  }

  return lines;
}
