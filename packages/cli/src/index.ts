#!/usr/bin/env node
import { Command } from "commander";
import { runCheck } from "./commands/check.js";
import { runDashboard } from "./commands/dashboard.js";
import { runDoctor } from "./commands/doctor.js";
import { runGenerate } from "./commands/generate.js";
import { runInit } from "./commands/init.js";
import type { ArtifactType } from "./types.js";

const program = new Command();

program
  .name("alignx")
  .description("Generate aligned, visual docs from input/requirement.md via local LM Studio")
  .version("0.1.0");

program
  .command("init")
  .description("Create input/requirement.md, .env, and alignx.config.yaml templates")
  .action(async () => {
    console.log("Initializing AlignX project…\n");
    await runInit();
  });

program
  .command("doctor")
  .description("Verify LM Studio connection and model availability")
  .action(runDoctor);

program
  .command("generate")
  .description("Generate artifacts from input/requirement.md")
  .option("-i, --input <path>", "Path to requirement file (default: input/requirement.md)")
  .option(
    "-t, --type <types>",
    "Comma-separated: acceptance-criteria,ui-state-matrix,observability,sprint-backlog",
  )
  .option("--all", "Generate all artifact types")
  .option("--no-dashboard", "Skip dashboard HTML generation")
  .action(async (opts: { input?: string; type?: string; all?: boolean; dashboard?: boolean }) => {
    const types = opts.type
      ? (opts.type.split(",").map((s) => s.trim()) as ArtifactType[])
      : undefined;
    await runGenerate({
      input: opts.input,
      types,
      all: opts.all,
      dashboard: opts.dashboard,
    });
  });

program
  .command("check")
  .description("Detect drift between input/requirement.md and generated artifacts")
  .option("--all", "Check every artifact listed in alignx.config.yaml")
  .option("--run <id>", "Run folder id (YYYYMMDD_HHmmss), default: latest")
  .action((opts: { all?: boolean; run?: string }) =>
    runCheck({ all: opts.all, run: opts.run }),
  );

program
  .command("dashboard")
  .description("Build or refresh the HTML dashboard")
  .option("--open", "Open dashboard in default browser")
  .option("--run <id>", "Run folder id (YYYYMMDD_HHmmss), default: latest")
  .action(async (opts: { open?: boolean; run?: string }) => {
    await runDashboard({ open: opts.open, run: opts.run });
  });

program.parse();
