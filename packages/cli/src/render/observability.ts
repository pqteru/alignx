import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import type { ObservabilityResponse } from "../schemas/observability.js";

export function renderObservability(
  data: ObservabilityResponse,
  meta: { title?: string; requirementId?: string },
): string {
  const locale = resolveLocale();
  const zh = locale === "zh-TW";
  const L = getLabels(locale);
  const title = artifactTitles[locale]["observability"];

  const lines: string[] = [`# ${title}`, ""];
  if (meta.title) lines.push(`> **${meta.title}**`, "");
  if (meta.requirementId) lines.push(`> ${L.requirementId}：\`${meta.requirementId}\``, "", "");

  lines.push(
    `## ${zh ? "目標與觀測策略" : "Objective"}`,
    "",
    `- **${zh ? "觀測目標" : "Objective"}**: ${data.objective}`,
  );
  if (data.north_star) {
    lines.push(`- **${zh ? "北極星指標" : "North star"}**: ${data.north_star}`);
  }
  lines.push("");

  lines.push(`## ${zh ? "關鍵事件埋點" : "Key events"}`, "");
  lines.push(
    `| ${zh ? "事件名稱" : "Event"} | ${zh ? "分類" : "Category"} | ${zh ? "觸發時機" : "Trigger"} | ${zh ? "關鍵屬性" : "Properties"} | ${zh ? "PII 風險" : "PII"} | ${zh ? "取樣" : "Sampling"} |`,
    "|------|------|----------|----------|----------|--------|",
  );
  for (const e of data.events) {
    const props = e.properties.join("、") || "—";
    lines.push(
      `| ${e.name} | ${e.category} | ${e.trigger} | ${props} | ${e.pii_risk} | ${e.sampling} |`,
    );
  }
  lines.push("");

  lines.push(`## ${zh ? "核心指標" : "Core metrics"}`, "");
  lines.push(
    `| ${zh ? "指標" : "Metric"} | ${zh ? "型態" : "Type"} | ${zh ? "定義" : "Definition"} | ${zh ? "目標值" : "Target"} | ${zh ? "維度" : "Dimensions"} |`,
    "|------|------|------|------|------|",
  );
  for (const m of data.metrics) {
    lines.push(
      `| ${m.name} | ${m.type} | ${m.definition} | ${m.target ?? "—"} | ${m.dimensions.join("、") || "—"} |`,
    );
  }
  lines.push("");

  if (data.alerts.length > 0) {
    lines.push(`## ${zh ? "告警規則" : "Alert rules"}`, "");
    lines.push(
      `| ${zh ? "告警名稱" : "Alert"} | ${zh ? "條件" : "Condition"} | ${zh ? "等級" : "Severity"} | ${zh ? "處置" : "Action"} |`,
      "|------|------|------|------|",
    );
    for (const a of data.alerts) {
      lines.push(`| ${a.name} | ${a.condition} | ${a.severity} | ${a.action} |`);
    }
    lines.push("");
  }

  if (data.dashboards.length > 0) {
    lines.push(`## ${zh ? "建議儀表板" : "Suggested dashboards"}`, "");
    for (const d of data.dashboards) lines.push(`- ${d}`);
    lines.push("");
  }

  if (data.retention_notes.length > 0) {
    lines.push(`## ${zh ? "資料留存與隱私" : "Retention & privacy"}`, "");
    for (const n of data.retention_notes) lines.push(`- ${n}`);
    lines.push("");
  }

  if (data.feedback_loop.length > 0) {
    lines.push(`## ${zh ? "回饋迴圈" : "Feedback loop"}`, "");
    data.feedback_loop.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push("");
  }

  lines.push(`## ${zh ? "追蹤流程圖" : "Tracking flow"}`, "", "```mermaid", "flowchart LR");
  lines.push("  U[使用者行為] --> E[事件埋點]");
  lines.push("  E --> M[指標聚合]");
  lines.push("  M --> D[Dashboard]");
  lines.push("  M --> A[Alert]");
  lines.push("  D --> F[產品回饋與優化]");
  lines.push("```", "");

  return lines.join("\n");
}
