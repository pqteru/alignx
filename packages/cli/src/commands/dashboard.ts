import { loadConfig } from "../core/config.js";
import { readManifest } from "../core/manifest.js";
import { withRunOutputDir } from "../core/output-dir.js";
import { resolveRunOutputDir } from "../core/output-run.js";
import { writeDashboard } from "../dashboard/html.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface DashboardOptions {
  open?: boolean;
  run?: string;
}

export async function runDashboard(opts: DashboardOptions = {}): Promise<void> {
  const config = await loadConfig();

  const runOutputDir = await resolveRunOutputDir(config.outputDir, opts.run);
  const runConfig = withRunOutputDir(config, runOutputDir);
  const manifest = await readManifest(runOutputDir);

  const path = await writeDashboard(runConfig, manifest);
  console.log(`Dashboard written to ${path}`);

  if (opts.open) {
    const cmd =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    try {
      await execAsync(`${cmd} "${path}"`);
    } catch {
      console.log("Could not open browser automatically.");
    }
  }
}
