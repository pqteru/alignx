import {
  artifactTitles,
  formatPriority,
  getLabels,
  resolveLocale,
} from "../core/locale.js";
import type { AcceptanceCriteriaResponse } from "../schemas/acceptance-criteria.js";

export function renderAcceptanceCriteria(
  data: AcceptanceCriteriaResponse,
  meta: { title?: string; requirementId?: string },
): string {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const zh = locale === "zh-TW";
  const docTitle = artifactTitles[locale]["acceptance-criteria"];

  const lines: string[] = [`# ${docTitle}`, ""];

  if (meta.title || meta.requirementId) {
    lines.push(`> **${meta.title ?? (zh ? "功能需求" : "Feature")}**`, ">");
    const story =
      data.user_story_line ??
      (zh ? "使用者故事見 requirement.md" : "See requirement.md for user story");
    const idPart = meta.requirementId ? `${L.requirementId}：\`${meta.requirementId}\` · ` : "";
    lines.push(`> ${idPart}${story}`, "", "");
  }

  if (data.coverage?.length) {
    lines.push(`## ${L.coverageOverview}`, "");
    lines.push(
      `| ${zh ? "情境" : "Scenario"} | ${zh ? "編號" : "ID"} | ${L.colPriority} | ${zh ? "摘要" : "Summary"} |`,
      "|------|------|--------|------|",
    );
    for (const row of data.coverage) {
      const pri = formatPriority(row.priority, locale);
      lines.push(`| ${row.scenario} | ${row.ac_id} | ${pri} | ${row.summary} |`);
    }
    for (const p of data.pending_items ?? []) {
      lines.push(`| ${p.cos_ref} ${zh ? "待確認" : "TBD"} | — | — | ${p.note} |`);
    }
    lines.push("", "---", "");
  }

  lines.push(`## ${L.criteriaList}`, "");
  lines.push(
    `| ${L.colId} | ${zh ? "情境" : "Scenario"} | ${L.colPriority} | ${L.colGiven} | ${L.colWhen} | ${L.colThen} | ${L.testable} |`,
    "|------|------|--------|------|-----|-----|------|",
  );

  for (const c of data.criteria) {
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const pri = formatPriority(c.priority, locale);
    lines.push(
      `| ${c.id} | ${esc(c.cos_ref)} | ${pri} | ${esc(c.given)} | ${esc(c.when)} | ${esc(c.then)} | ${c.testable ? "✓" : "—"} |`,
    );
  }

  lines.push("", "---", "", `## ${L.criteriaDetail}`, "");

  for (const c of data.criteria) {
    const pri = formatPriority(c.priority, locale);
    lines.push(`### ${c.id}（${pri}）— ${c.title}`, "");
    lines.push(`- **${L.given}** ${c.given}`);
    lines.push(`- **${L.when}** ${c.when}`);
    lines.push(`- **${L.then}** ${c.then}`);
    if (c.ui_mapping) {
      lines.push(`- **${L.uiMapping}** ${c.ui_mapping}`);
    }
    lines.push("");
  }

  if (data.test_data?.length) {
    lines.push("---", "", `## ${L.testData}`, "");
    for (const t of data.test_data) {
      lines.push(
        `### ${zh ? "案例" : "Case"} ${t.case_id}${t.title ? ` — ${t.title}` : ""}`,
        "",
      );

      if (t.preconditions.length > 0) {
        lines.push(`- **${zh ? "前置條件" : "Preconditions"}**`);
        for (const item of t.preconditions) {
          lines.push(`  - ${item}`);
        }
      }

      if (t.steps.length > 0) {
        lines.push(`- **${zh ? "步驟" : "Steps"}**`);
        for (const item of t.steps) {
          lines.push(`  - ${item}`);
        }
      }

      if (t.expected.length > 0) {
        lines.push(`- **${zh ? "預期結果" : "Expected"}**`);
        for (const item of t.expected) {
          lines.push(`  - ${item}`);
        }
      }

      if (t.expected_ac_ids.length > 0) {
        lines.push(`- **${zh ? "預期 AC" : "Expected AC"}**: ${t.expected_ac_ids.join("、")}`);
      }

      if (t.notes?.length) {
        lines.push(`- **${zh ? "備註" : "Notes"}**`);
        for (const item of t.notes) {
          lines.push(`  - ${item}`);
        }
      }

      lines.push("");
    }
  }

  lines.push("---", "", `## ${L.flowOverview}`, "", "```mermaid");
  lines.push(data.flow_mermaid ?? buildDefaultFlowMermaid(data));
  lines.push("```", "");

  if (data.ac_ui_mapping?.length) {
    lines.push("", "---", "", `## ${L.acUiMapping}`, "");
    lines.push(
      `| ${zh ? "驗收編號" : "AC"} | ${zh ? "UI 狀態矩陣章節" : "UI matrix section"} |`,
      "|----------|----------------|",
    );
    for (const m of data.ac_ui_mapping) {
      lines.push(`| ${m.ac_ids} | ${m.ui_section} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildDefaultFlowMermaid(data: AcceptanceCriteriaResponse): string {
  const ids = data.criteria.map((c) => c.id.replace(/-/g, "_"));
  if (ids.length === 0) return "flowchart TB\n  A[No criteria]";

  return [
    "flowchart TB",
    "  S[進入首頁 / Enter homepage]",
    `  S --> ${ids[0]}`,
    ...ids.slice(1).map((id, i) => `  ${ids[i]} --> ${id}`),
  ].join("\n");
}
