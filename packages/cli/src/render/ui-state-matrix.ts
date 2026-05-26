import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import type { UiStateMatrixResponse } from "../schemas/ui-state-matrix.js";

export function renderUiStateMatrix(
  data: UiStateMatrixResponse,
  meta: { title?: string },
): string {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const docTitle = artifactTitles[locale]["ui-state-matrix"];

  const lines: string[] = [`# ${docTitle}`, ""];

  if (meta.title) lines.push(`> **${meta.title}**`, "", "");

  for (const surface of data.surfaces) {
    lines.push(`## ${surface.name}（\`${surface.surface_id}\`）`, "");
    lines.push(
      `| ${L.colState} | ${L.colDescription} | ${L.colUserSees} | ${L.colActions} |`,
      "|-------|-------------|-----------|---------|",
    );

    for (const s of surface.states) {
      const esc = (x: string) => x.replace(/\|/g, "\\|");
      lines.push(
        `| **${s.state}** | ${esc(s.description)} | ${esc(s.user_visible)} | ${s.actions.map((a) => `\`${a}\``).join("、")} |`,
      );
    }

    lines.push("", `### ${L.transitions}`, "");
    lines.push(
      `| ${L.colFrom} | ${L.colTo} | ${L.colTrigger} |`,
      "|------|-----|---------|",
    );
    for (const t of surface.transitions) {
      lines.push(`| ${t.from} | ${t.to} | ${t.trigger} |`);
    }

    lines.push("", `### ${L.stateDiagram}`, "", "```mermaid", "stateDiagram-v2");
    const stateIds = new Map<string, string>();
    for (const s of surface.states) {
      const id = s.state.replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, "_");
      stateIds.set(s.state, id);
      lines.push(`  ${id}: ${s.state}`);
    }
    for (const t of surface.transitions) {
      const from = stateIds.get(t.from) ?? t.from;
      const to = stateIds.get(t.to) ?? t.to;
      lines.push(`  ${from} --> ${to}: ${t.trigger}`);
    }
    lines.push("```", "", "---", "");
  }

  return lines.join("\n");
}
