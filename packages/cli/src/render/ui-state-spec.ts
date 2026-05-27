import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import type { UiStateSpecResponse } from "../schemas/ui-state-spec.js";

function dispositionLabel(
  d: "allowed" | "ignored" | "impossible" | "error",
  zh: boolean,
): string {
  if (d === "allowed") return zh ? "允許" : "allowed";
  if (d === "ignored") return "ignored";
  if (d === "impossible") return "impossible";
  return "error";
}

export function renderUiStateSpec(
  data: UiStateSpecResponse,
  meta: { title?: string; requirementId?: string },
): string {
  const locale = resolveLocale();
  const zh = locale === "zh-TW";
  const L = getLabels(locale);
  const docTitle = artifactTitles[locale]["ui-state-spec"];

  const lines: string[] = [`# ${docTitle}`, ""];
  if (meta.title) lines.push(`> **${meta.title}**`, "");
  if (meta.requirementId) lines.push(`> ${L.requirementId}：\`${meta.requirementId}\``, "", "");
  if (data.feature_scope) {
    lines.push(`> ${zh ? "範圍" : "Scope"}：${data.feature_scope}`, "");
  }

  lines.push(
    `## 1. State Space`,
    "",
    data.state_space.modeling_notes,
    "",
    `| ${zh ? "狀態 ID" : "State ID"} | ${zh ? "名稱" : "Label"} | ${zh ? "說明" : "Description"} | ${zh ? "互斥狀態" : "Mutually exclusive"} |`,
    "|------|------|------|------|",
  );
  for (const s of data.state_space.states) {
    const ex = s.mutual_excludes.length ? s.mutual_excludes.join("、") : "—";
    lines.push(`| \`${s.id}\` | ${s.label} | ${s.description} | ${ex} |`);
  }
  lines.push("");

  lines.push(`## 2. Events / Actions`, "");

  const eventGroups: { key: "user" | "system" | "async"; title: string }[] = [
    { key: "user", title: zh ? "User events" : "User events" },
    { key: "system", title: zh ? "System events" : "System events" },
    { key: "async", title: zh ? "Async events" : "Async events" },
  ];
  for (const g of eventGroups) {
    const list = data.events[g.key];
    if (list.length === 0) continue;
    lines.push(`### ${g.title}`, "");
    lines.push(
      `| ID | ${zh ? "名稱" : "Label"} | ${zh ? "說明" : "Description"} |`,
      "|------|------|------|",
    );
    for (const e of list) {
      lines.push(`| \`${e.id}\` | ${e.label} | ${e.description} |`);
    }
    lines.push("");
  }

  lines.push(`## 3. Transition Table`, "");
  lines.push(
    `| ${zh ? "目前狀態" : "Current"} | ${zh ? "事件" : "Event"} | ${zh ? "下一狀態" : "Next"} | ${zh ? "處置" : "Disposition"} | ${zh ? "備註" : "Notes"} |`,
    "|------|------|------|------|------|",
  );
  for (const t of data.transitions) {
    const next =
      t.disposition === "allowed" && t.next_state
        ? `\`${t.next_state}\``
        : t.next_state
          ? `\`${t.next_state}\``
          : "—";
    lines.push(
      `| \`${t.current_state}\` | \`${t.event}\` | ${next} | ${dispositionLabel(t.disposition, zh)} | ${t.notes ?? "—"} |`,
    );
  }
  lines.push("");

  lines.push(`## 4. Derived UI`, "");
  lines.push(
    `> ${zh ? "原則" : "Principle"}：**UI = Render(State)** — ${zh ? "畫面僅由狀態推導，不在 UI 層保存 business state。" : "UI must not hold business state."}`,
    "",
  );
  for (const row of data.derived_ui) {
    lines.push(`### \`${row.state_id}\``, "");
    lines.push(row.render_summary, "");
    if (row.ui_elements.length > 0) {
      lines.push(zh ? "**畫面元素**" : "**UI elements**", "");
      for (const el of row.ui_elements) lines.push(`- ${el}`);
      lines.push("");
    }
    if (row.must_not_persist.length > 0) {
      lines.push(zh ? "**不可在 UI 持久化**" : "**Must not persist in UI**", "");
      for (const n of row.must_not_persist) lines.push(`- ${n}`);
      lines.push("");
    }
  }

  lines.push(`## 5. Side Effects`, "");
  if (data.side_effects.length === 0) {
    lines.push(zh ? "（無）" : "(none)", "");
  } else {
    lines.push(
      `| ID | ${zh ? "類型" : "Kind"} | ${zh ? "觸發事件" : "On event"} | ${zh ? "行為" : "Effect"} | ${zh ? "完成後事件" : "Emits"} |`,
      "|------|------|------|------|------|",
    );
    for (const fx of data.side_effects) {
      lines.push(
        `| \`${fx.id}\` | ${fx.kind} | \`${fx.on_event}\` | ${fx.description} | \`${fx.emits_event}\` |`,
      );
    }
    lines.push("");
    lines.push(
      `> ${zh ? "Side effect 不可直接改 UI；結果必須以 event 回到狀態機。" : "Side effects must emit events; they must not mutate UI directly."}`,
      "",
    );
  }

  lines.push(`## 6. Invalid States`, "");
  lines.push(
    `| ${zh ? "非法狀態" : "Invalid state"} | ${zh ? "為何應排除" : "Why illegal"} | ${zh ? "設計防護" : "Prevention"} |`,
    "|------|------|------|",
  );
  for (const inv of data.invalid_states) {
    lines.push(`| ${inv.name} | ${inv.why_illegal} | ${inv.prevention} |`);
  }
  lines.push("");

  lines.push(`## 7. State Diagram`, "", "```mermaid");
  const diagram = data.state_diagram_mermaid.trim();
  if (diagram.startsWith("stateDiagram")) {
    lines.push(diagram);
  } else {
    lines.push("stateDiagram-v2");
    lines.push(diagram);
  }
  lines.push("```", "");

  lines.push(
    "---",
    "",
    zh ? "**核心原則**" : "**Core principles**",
    "",
    "- Make invalid states impossible",
    "- UI = Render(State)",
    "- State_next = Transition(State_current, Event)",
    "",
  );

  return lines.join("\n");
}
