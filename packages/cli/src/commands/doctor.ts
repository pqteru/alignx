import { loadConfig } from "../core/config.js";
import { listModels, pingLlm, LlmError } from "../llm/client.js";

export async function runDoctor(): Promise<void> {
  const config = await loadConfig();
  const { llm } = config;

  console.log("AlignX Doctor\n");
  console.log(`  Base URL:    ${llm.baseUrl}`);
  console.log(`  Model env:   ${llm.model || "(auto-detect)"}`);
  console.log(`  Output:      ${config.outputDir}`);
  console.log(`  Requirement: ${config.requirementPath}`);

  try {
    const models = await listModels(llm);
    console.log(`\n  Models (${models.length}):`);
    for (const m of models.slice(0, 5)) {
      console.log(`    - ${m}`);
    }
    if (models.length > 5) console.log(`    … and ${models.length - 5} more`);
  } catch (err) {
    if (err instanceof LlmError) {
      console.error(`\n  ✗ Cannot reach LM Studio: ${err.message}`);
      console.error("    Ensure LM Studio server is running (default :1234)");
      process.exit(1);
    }
    throw err;
  }

  try {
    const { model, latencyMs } = await pingLlm(llm);
    console.log(`\n  ✓ Ping OK — model: ${model} (${latencyMs}ms)`);
  } catch (err) {
    if (err instanceof LlmError) {
      console.error(`\n  ✗ Completion test failed: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}
