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
  const title = artifactTitles[locale]["acceptance-criteria"];

  const lines: string[] = [`# ${title}`, ""];

  if (meta.title) lines.push(`> **${meta.title}**`, "");
  if (meta.requirementId) {
    lines.push(`> ${L.requirementId}：\`${meta.requirementId}\``, "", "");
  }

  lines.push(
    `| ${L.colId} | ${L.colStory} | ${L.colPriority} | ${L.colGiven} | ${L.colWhen} | ${L.colThen} | ${L.testable} |`,
    "|----|-------|----------|-------|------|------|----------|",
  );

  for (const c of data.criteria) {
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const pri = formatPriority(c.priority, locale);
    lines.push(
      `| ${c.id} | ${esc(c.story_ref)} | ${pri} | ${esc(c.given)} | ${esc(c.when)} | ${esc(c.then)} | ${c.testable ? "✓" : "—"} |`,
    );
  }

  lines.push("", `## ${L.criteriaDetail}`, "");

  for (const c of data.criteria) {
    const pri = formatPriority(c.priority, locale);
    lines.push(
      `### ${c.id}（${pri}）— ${c.story_ref}`,
      "",
      `- **${L.given}** ${c.given}`,
      `- **${L.when}** ${c.when}`,
      `- **${L.then}** ${c.then}`,
      "",
    );
  }

  lines.push(`## ${L.flowOverview}`, "", "```mermaid", "flowchart TD");
  for (let i = 0; i < data.criteria.length; i++) {
    const c = data.criteria[i]!;
    const node = c.id.replace(/-/g, "_");
    const label = c.when.slice(0, 40).replace(/"/g, "'");
    lines.push(`  ${node}["${c.id}: ${label}"]`);
    if (i > 0) {
      const prev = data.criteria[i - 1]!.id.replace(/-/g, "_");
      lines.push(`  ${prev} --> ${node}`);
    }
  }
  lines.push("```", "");

  return lines.join("\n");
}
