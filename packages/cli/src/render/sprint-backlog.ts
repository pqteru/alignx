import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import type { SprintBacklogResponse } from "../schemas/sprint-backlog.js";

export function renderSprintBacklog(data: SprintBacklogResponse): string {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const docTitle = artifactTitles[locale]["sprint-backlog"];

  const total = data.tasks.reduce((s, t) => s + t.estimate_points, 0);
  const lines: string[] = [
    "---",
    `sprint: ${data.sprint_name}`,
    `goal: ${data.sprint_goal}`,
    `velocity: ${data.velocity_points}`,
    `planned_points: ${total}`,
    "---",
    "",
    `# ${docTitle}：${data.sprint_name}`,
    "",
    `**${L.sprintGoal}：** ${data.sprint_goal}`,
    "",
    `**${L.velocity}：** ${data.velocity_points} ${L.points} · **${L.planned}：** ${total} ${L.points}`,
    "",
    `| ${L.colId} | ${L.colTitle} | ${L.colStory} | ${L.colPoints} | ${L.colDepends} |`,
    "|----|-------|-------|--------|------------|",
  ];

  for (const t of data.tasks) {
    const deps = t.depends_on.length ? t.depends_on.join("、") : "—";
    lines.push(`| ${t.id} | ${t.title} | ${t.story_ref} | ${t.estimate_points} | ${deps} |`);
  }

  lines.push("", `## ${L.tasks}`, "");

  for (const t of data.tasks) {
    lines.push(
      `### ${t.id}：${t.title}`,
      "",
      `- **${L.story}：** ${t.story_ref}`,
      `- **${L.estimate}：** ${t.estimate_points} ${L.points}`,
      "",
    );
    lines.push(`**${L.definitionOfDone}**`, "");
    for (const d of t.definition_of_done) {
      lines.push(`- [ ] ${d}`);
    }
    lines.push("");
  }

  lines.push(
    `## ${L.timeline}`,
    "",
    "```mermaid",
    "gantt",
    `    title ${data.sprint_name}`,
    "    dateFormat YYYY-MM-DD",
    `    section ${L.ganttSection}`,
  );

  const start = new Date();
  for (const t of data.tasks) {
    const dayOffset = data.tasks.indexOf(t) * 2;
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    const iso = d.toISOString().slice(0, 10);
    const id = t.id.replace(/-/g, "_");
    lines.push(`    ${id} : ${t.title}, ${iso}, ${t.estimate_points}d`);
  }
  lines.push("```", "");

  return lines.join("\n");
}
