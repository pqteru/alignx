import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AlignxManifest, ArtifactType } from "../types.js";
import { artifactOutputPath } from "../artifacts/registry.js";
import { effectiveOutputDir } from "../core/output-dir.js";
import type { AppConfig } from "../types.js";
import { checkDrift } from "../core/drift.js";
import { artifactTitles, getLabels, resolveLocale } from "../core/locale.js";
import { ALL_ARTIFACTS } from "../types.js";
import { buildDashboardStats } from "./stats.js";

export const DASHBOARD_FILENAME = "dashboard.html";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status: string, locale: ReturnType<typeof resolveLocale>): string {
  const L = getLabels(locale);
  if (status === "ok") return L.statusOk;
  if (status === "stale") return L.statusStale;
  return L.statusMissing;
}

function artifactStatus(
  type: ArtifactType,
  issueSet: Set<string | ArtifactType>,
): "ok" | "stale" | "missing" {
  if (issueSet.has(type)) return "stale";
  return "ok";
}

async function resolveDashboardArtifacts(
  config: AppConfig,
  manifest: AlignxManifest | null,
): Promise<ArtifactType[]> {
  const fromManifest = manifest
    ? (Object.keys(manifest.artifacts) as ArtifactType[])
    : [];

  if (fromManifest.length > 0) {
    return ALL_ARTIFACTS.filter((t) => fromManifest.includes(t));
  }

  const found: ArtifactType[] = [];
  for (const type of ALL_ARTIFACTS) {
    if (existsSync(artifactOutputPath(config, type))) found.push(type);
  }
  return found;
}

interface DocPanel {
  id: ArtifactType;
  title: string;
  status: "ok" | "stale" | "missing";
  markdown: string;
  path: string;
  generatedAt: string;
}

export async function buildDashboard(
  config: AppConfig,
  manifest: AlignxManifest | null,
): Promise<string> {
  const locale = resolveLocale();
  const L = getLabels(locale);
  const ARTIFACT_LABELS = artifactTitles[locale];

  const artifactTypes = await resolveDashboardArtifacts(config, manifest);
  const issues = await checkDrift(manifest, config.requirementPath, artifactTypes);
  const issueSet = new Set(issues.map((i) => i.artifact));

  const docs: DocPanel[] = [];
  for (const type of artifactTypes) {
    const path = artifactOutputPath(config, type);
    const entry = manifest?.artifacts[type];
    let markdown = "";
    let status: DocPanel["status"] = "missing";

    try {
      markdown = await readFile(path, "utf8");
      status = artifactStatus(type, issueSet);
    } catch {
      status = "missing";
    }

    docs.push({
      id: type,
      title: ARTIFACT_LABELS[type],
      status,
      markdown,
      path,
      generatedAt: entry?.generated_at
        ? new Date(entry.generated_at).toLocaleString(locale === "zh-TW" ? "zh-TW" : "en-US")
        : "—",
    });
  }

  const reqStatus = issueSet.has("requirement") ? "stale" : manifest ? "ok" : "missing";
  const reqHash = manifest?.requirement.sha256?.slice(0, 12) ?? "—";
  const runId = manifest?.run_id ?? "";

  const docPayload = docs.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    statusLabel: statusLabel(d.status, locale),
    markdown: d.markdown,
    path: d.path,
    generatedAt: d.generatedAt,
  }));

  const stats = buildDashboardStats(
    locale,
    docPayload.map((d) => ({
      id: d.id,
      title: d.title,
      markdown: d.markdown,
      status: d.status,
    })),
    { reqStatus },
  );

  const payload = {
    locale,
    labels: {
      overview: L.navOverview,
      requirement: L.requirement,
      hash: L.hash,
      generated: L.generated,
      statsOverview: L.statsOverview,
      docMap: L.docMap,
      issues: issues.map((i) => ({ artifact: i.artifact, message: i.message })),
    },
    meta: {
      title: L.dashboardTitle,
      subtitle: L.dashboardSubtitle,
      runId,
      requirementPath: config.requirementPath,
      reqHash,
      reqStatus,
      reqStatusLabel: statusLabel(reqStatus, locale),
    },
    stats,
    docs: docPayload,
  };

  const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="${locale === "zh-TW" ? "zh-Hant" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(L.dashboardTitle)}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    window.mermaid = mermaid;
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
  </script>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --sidebar: #141b26;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --ok: #3dd68c;
      --stale: #f5a524;
      --missing: #f31260;
      --border: #2d3a4f;
      --accent: #5b9cff;
      --sidebar-w: 240px;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "SF Pro Text", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      line-height: 1.55;
    }
    .layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: var(--sidebar-w);
      flex-shrink: 0;
      background: var(--sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar-header {
      padding: 1.25rem 1rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-header h1 {
      font-size: 1.05rem;
      margin: 0 0 0.35rem;
    }
    .sidebar-header .run-id {
      font-size: 0.75rem;
      color: var(--muted);
      font-family: ui-monospace, monospace;
    }
    nav {
      padding: 0.75rem 0.5rem;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      text-align: left;
      padding: 0.55rem 0.75rem;
      margin-bottom: 0.2rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text);
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .nav-item:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
    .nav-item.active {
      background: color-mix(in srgb, var(--accent) 22%, transparent);
      color: #fff;
      font-weight: 600;
    }
    .badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      font-weight: 600;
      flex-shrink: 0;
      margin-left: 0.5rem;
    }
    .badge-ok { background: color-mix(in srgb, var(--ok) 25%, transparent); color: var(--ok); }
    .badge-stale { background: color-mix(in srgb, var(--stale) 25%, transparent); color: var(--stale); }
    .badge-missing { background: color-mix(in srgb, var(--missing) 25%, transparent); color: var(--missing); }
    .main {
      flex: 1;
      min-width: 0;
      padding: 1.5rem 2rem 3rem;
      overflow-y: auto;
    }
    .panel { display: none; }
    .panel.active { display: block; }
    .req-bar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
      font-size: 0.9rem;
    }
    .issues {
      margin: 0 0 1.25rem;
      padding: 0.75rem 1rem;
      list-style: none;
      background: color-mix(in srgb, var(--stale) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--stale) 35%, transparent);
      border-radius: 10px;
    }
    .issues li { color: var(--stale); font-size: 0.88rem; padding: 0.2rem 0; }
    .doc-meta {
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 1.25rem;
    }
    .doc-meta code {
      background: #0d1117;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .md-body h1 { font-size: 1.5rem; margin-top: 0; }
    .md-body h2 { font-size: 1.2rem; margin-top: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; }
    .md-body h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    .md-body table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      margin: 1rem 0;
    }
    .md-body th, .md-body td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.65rem;
      text-align: left;
    }
    .md-body th { background: var(--surface); }
    .md-body pre:not(.mermaid) {
      background: #0d1117;
      border-radius: 8px;
      padding: 0.85rem;
      overflow-x: auto;
      font-size: 0.82rem;
    }
    .md-body code {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.88em;
    }
    .md-body pre.mermaid, .md-body .mermaid {
      background: #fff;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .md-body ul { padding-left: 1.25rem; }
    .md-body blockquote {
      margin: 1rem 0;
      padding-left: 1rem;
      border-left: 3px solid var(--accent);
      color: var(--muted);
    }
    .empty {
      color: var(--muted);
      padding: 2rem;
      text-align: center;
      border: 1px dashed var(--border);
      border-radius: 12px;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem;
      color: var(--text);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .kpi {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .kpi .value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .kpi .label { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }
    .kpi .hint { font-size: 0.72rem; color: var(--muted); margin-top: 0.35rem; }
    .kpi.tone-ok .value { color: var(--ok); }
    .kpi.tone-stale .value { color: var(--stale); }
    .kpi.tone-accent .value { color: var(--accent); }
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .chart-card h3 {
      font-size: 0.85rem;
      margin: 0 0 0.75rem;
      color: var(--muted);
      font-weight: 600;
    }
    .chart-card canvas { max-height: 220px; }
    .map-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }
    .map-card .mermaid { background: #fff; border-radius: 8px; padding: 0.75rem; }
    .doc-hints {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .doc-hint {
      font-size: 0.8rem;
      padding: 0.35rem 0.65rem;
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      border-radius: 999px;
      color: var(--accent);
    }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 id="app-title"></h1>
        <div class="run-id" id="run-id"></div>
      </div>
      <nav id="nav"></nav>
    </aside>
    <main class="main" id="main"></main>
  </div>
  <script type="application/json" id="alignx-data">${dataJson}</script>
  <script>
    const DATA = JSON.parse(document.getElementById('alignx-data').textContent);

    marked.use({
      gfm: true,
      breaks: true,
      renderer: {
        code({ text, lang }) {
          if (lang === 'mermaid') {
            return '<pre class="mermaid">' + text + '</pre>';
          }
          const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;');
          return '<pre><code>' + esc + '</code></pre>';
        }
      }
    });

    function badgeClass(status) {
      return 'badge badge-' + status;
    }

    const CHART_COLORS = ['#5b9cff','#3dd68c','#f5a524','#a78bfa','#f472b6','#38bdf8'];

    let chartInstances = [];

    function renderOverview() {
      const m = DATA.meta;
      const s = DATA.stats;
      let html = '<section class="panel active" id="panel-overview">';
      html += '<div class="req-bar">';
      html += '<strong>' + DATA.labels.requirement + '</strong>';
      html += '<code>' + m.requirementPath + '</code>';
      html += '<span>' + DATA.labels.hash + '：' + m.reqHash + '…</span>';
      html += '<span class="' + badgeClass(m.reqStatus) + '">' + m.reqStatusLabel + '</span>';
      html += '</div>';
      if (DATA.labels.issues.length) {
        html += '<ul class="issues">';
        DATA.labels.issues.forEach(i => {
          html += '<li>[' + i.artifact + '] ' + i.message + '</li>';
        });
        html += '</ul>';
      }
      html += '<h2 class="section-title">' + DATA.labels.statsOverview + '</h2>';
      html += '<div class="kpi-grid">';
      s.kpis.forEach(k => {
        html += '<div class="kpi tone-' + k.tone + '">';
        html += '<div class="value">' + k.value + '</div>';
        html += '<div class="label">' + k.label + '</div>';
        if (k.hint) html += '<div class="hint">' + k.hint + '</div>';
        html += '</div>';
      });
      html += '</div>';
      if (s.charts.length) {
        html += '<div class="chart-grid">';
        s.charts.forEach(c => {
          html += '<div class="chart-card"><h3>' + c.title + '</h3><canvas id="chart-' + c.id + '"></canvas></div>';
        });
        html += '</div>';
      }
      html += '<h2 class="section-title">' + DATA.labels.docMap + '</h2>';
      html += '<div class="map-card"><pre class="mermaid" id="overview-mermaid">' + s.overviewMermaid + '</pre></div>';
      html += '</section>';
      return html;
    }

    function renderDocPanel(doc) {
      const hints = DATA.stats.docHints[doc.id] || [];
      let html = '<section class="panel" id="panel-' + doc.id + '">';
      if (hints.length) {
        html += '<div class="doc-hints">';
        hints.forEach(h => { html += '<span class="doc-hint">' + h + '</span>'; });
        html += '</div>';
      }
      html += '<div class="doc-meta">';
      html += DATA.labels.generated + '：' + doc.generatedAt + '<br>';
      html += '<code>' + doc.path + '</code>';
      html += '</div>';
      if (doc.markdown) {
        html += '<div class="md-body">' + marked.parse(doc.markdown) + '</div>';
      } else {
        html += '<div class="empty">（無內容）</div>';
      }
      html += '</section>';
      return html;
    }

    function renderCharts() {
      if (!window.Chart || !DATA.stats.charts.length) return;
      chartInstances.forEach(c => c.destroy());
      chartInstances = [];
      const gridColor = 'rgba(139,156,179,0.2)';
      const textColor = '#8b9cb3';
      DATA.stats.charts.forEach(cfg => {
        const el = document.getElementById('chart-' + cfg.id);
        if (!el) return;
        const colors = cfg.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
        chartInstances.push(new Chart(el, {
          type: cfg.type,
          data: {
            labels: cfg.labels,
            datasets: [{
              data: cfg.values,
              backgroundColor: colors,
              borderColor: colors.map(c => c + '99'),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: cfg.type === 'bar' ? 'top' : 'right',
                labels: { color: textColor, boxWidth: 12 }
              }
            },
            scales: cfg.type === 'bar' ? {
              x: { ticks: { color: textColor, maxRotation: 45 }, grid: { color: gridColor } },
              y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
            } : {}
          }
        }));
      });
    }

    function init() {
      document.title = DATA.meta.title;
      document.getElementById('app-title').textContent = DATA.meta.title;
      document.getElementById('run-id').textContent = DATA.meta.runId || '';

      const nav = document.getElementById('nav');

      const items = [
        { id: 'overview', title: DATA.labels.overview, status: DATA.meta.reqStatus, statusLabel: DATA.meta.reqStatusLabel },
        ...DATA.docs
      ];

      let mainHtml = renderOverview();
      DATA.docs.forEach(d => { mainHtml += renderDocPanel(d); });
      document.getElementById('main').innerHTML = mainHtml;

      items.forEach((item, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-item' + (idx === 0 ? ' active' : '');
        btn.dataset.panel = item.id;
        btn.innerHTML = '<span>' + item.title + '</span><span class="' + badgeClass(item.status) + '">' + item.statusLabel + '</span>';
        btn.addEventListener('click', () => switchPanel(item.id, btn));
        nav.appendChild(btn);
      });

      switchPanel('overview', nav.querySelector('.nav-item'));
    }

    async function switchPanel(id, btn) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const panel = document.getElementById('panel-' + id);
      if (panel) panel.classList.add('active');
      if (btn) btn.classList.add('active');
      const root = panel || document;
      const nodes = root.querySelectorAll('.mermaid:not([data-processed])');
      if (nodes.length && window.mermaid) {
        try {
          await mermaid.run({ nodes });
        } catch (e) { console.warn('mermaid', e); }
      }
      if (id === 'overview') {
        renderCharts();
      }
    }

    init();
  </script>
</body>
</html>`;
}

export function dashboardPath(config: AppConfig): string {
  return join(effectiveOutputDir(config), DASHBOARD_FILENAME);
}

export async function writeDashboard(
  config: AppConfig,
  manifest: AlignxManifest | null,
): Promise<string> {
  const html = await buildDashboard(config, manifest);
  const outPath = dashboardPath(config);
  await writeFile(outPath, html, "utf8");
  return outPath;
}
