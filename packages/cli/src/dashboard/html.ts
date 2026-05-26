import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AlignxManifest, ArtifactType } from "../types.js";
import { artifactOutputPath } from "../artifacts/registry.js";
import type { AppConfig } from "../types.js";
import { checkDrift } from "../core/drift.js";
import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";

function statusLabel(status: string, locale: ReturnType<typeof resolveLocale>): string {
  const L = getLabels(locale);
  if (status === "ok") return L.statusOk;
  if (status === "stale") return L.statusStale;
  return L.statusMissing;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractMermaidBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    blocks.push(m[1]!.trim());
  }
  return blocks;
}

export async function buildDashboard(
  config: AppConfig,
  manifest: AlignxManifest | null,
): Promise<string> {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const ARTIFACT_LABELS = artifactTitles[locale];

  const issues = await checkDrift(manifest, config.requirementPath, config.artifacts);
  const issueSet = new Set(issues.map((i) => i.artifact));

  const cards: string[] = [];

  for (const type of config.artifacts) {
    const path = artifactOutputPath(config, type);
    let status = "missing";
    let preview = "";
    let mermaidBlocks: string[] = [];

    try {
      const md = await readFile(path, "utf8");
      preview = md.split("\n").slice(0, 12).join("\n");
      mermaidBlocks = extractMermaidBlocks(md);
      status = issueSet.has(type) ? "stale" : "ok";
    } catch {
      status = "missing";
    }

    const entry = manifest?.artifacts[type];
    const generated = entry?.generated_at
      ? new Date(entry.generated_at).toLocaleString(locale === "zh-TW" ? "zh-TW" : "en-US")
      : "—";

    const mermaidHtml = mermaidBlocks
      .map((b, i) => `<pre class="mermaid" id="m-${type}-${i}">${b}</pre>`)
      .join("");

    cards.push(`
      <article class="card status-${status}">
        <header>
          <h2>${ARTIFACT_LABELS[type]}</h2>
          <span class="badge">${statusLabel(status, locale)}</span>
        </header>
        <p class="meta">${L.generated}：${escapeHtml(generated)}</p>
        <p class="path"><code>${escapeHtml(path)}</code></p>
        <pre class="preview">${escapeHtml(preview)}${preview ? "\n…" : ""}</pre>
        ${mermaidHtml}
      </article>
    `);
  }

  const reqStatus = issueSet.has("requirement") ? "stale" : manifest ? "ok" : "missing";
  const reqHash = manifest?.requirement.sha256?.slice(0, 12) ?? "—";

  return `<!DOCTYPE html>
<html lang="${locale === "zh-TW" ? "zh-Hant" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(L.dashboardTitle)}</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
  </script>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --ok: #3dd68c;
      --stale: #f5a524;
      --missing: #f31260;
      --border: #2d3a4f;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "SF Pro Text", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
      line-height: 1.5;
    }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    .req-bar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-weight: 600;
    }
    .status-ok .badge { background: color-mix(in srgb, var(--ok) 25%, transparent); color: var(--ok); }
    .status-stale .badge { background: color-mix(in srgb, var(--stale) 25%, transparent); color: var(--stale); }
    .status-missing .badge { background: color-mix(in srgb, var(--missing) 25%, transparent); color: var(--missing); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .card header { display: flex; justify-content: space-between; align-items: center; }
    .card h2 { font-size: 1.1rem; margin: 0; }
    .meta, .path { font-size: 0.85rem; color: var(--muted); }
    .preview {
      background: #0d1117;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.8rem;
      overflow: auto;
      max-height: 160px;
      color: var(--muted);
    }
    .mermaid {
      margin-top: 1rem;
      background: #fff;
      border-radius: 8px;
      padding: 0.5rem;
    }
    .issues {
      margin-top: 1rem;
      padding: 0;
      list-style: none;
    }
    .issues li {
      color: var(--stale);
      font-size: 0.9rem;
      padding: 0.25rem 0;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(L.dashboardTitle)}</h1>
  <p class="subtitle">${escapeHtml(L.dashboardSubtitle)}</p>

  <div class="req-bar status-${reqStatus}">
    <strong>${L.requirement}</strong>
    <code>${escapeHtml(config.requirementPath)}</code>
    <span>${L.hash}：${escapeHtml(reqHash)}…</span>
    <span class="badge">${statusLabel(reqStatus, locale)}</span>
  </div>

  ${
    issues.length
      ? `<ul class="issues">${issues.map((i) => `<li>${escapeHtml(i.artifact)}: ${escapeHtml(i.message)}</li>`).join("")}</ul>`
      : ""
  }

  <div class="grid">${cards.join("")}</div>
</body>
</html>`;
}

export async function writeDashboard(
  config: AppConfig,
  manifest: AlignxManifest | null,
): Promise<string> {
  const html = await buildDashboard(config, manifest);
  const outPath = join(config.outputDir, "dashboard", "index.html");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
  return outPath;
}
