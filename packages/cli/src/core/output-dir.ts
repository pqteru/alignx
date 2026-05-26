import type { AppConfig } from "../types.js";

export function effectiveOutputDir(config: AppConfig): string {
  return config.runOutputDir ?? config.outputDir;
}

export function withRunOutputDir(config: AppConfig, runOutputDir: string): AppConfig {
  return { ...config, runOutputDir };
}
