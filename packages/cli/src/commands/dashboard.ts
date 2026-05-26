import { loadConfig } from "../core/config.js";
import { readManifest } from "../core/manifest.js";
import { writeDashboard } from "../dashboard/html.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function runDashboard(openBrowser: boolean): Promise<void> {
  const config = await loadConfig();
  const manifest = await readManifest(config.outputDir);
  const path = await writeDashboard(config, manifest);
  console.log(`Dashboard written to ${path}`);

  if (openBrowser) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    try {
      await execAsync(`${cmd} "${path}"`);
    } catch {
      console.log("Could not open browser automatically.");
    }
  }
}
