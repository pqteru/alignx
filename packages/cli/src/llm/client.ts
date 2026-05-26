import type { LlmConfig } from "../types.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return !lower.includes("embed");
}

export async function listModels(config: LlmConfig): Promise<string[]> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!res.ok) {
    throw new LlmError(`Failed to list models: ${res.status} ${res.statusText}`, res.status);
  }
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => m.id).filter(isChatModel);
}

export async function resolveModel(config: LlmConfig): Promise<string> {
  if (config.model) return config.model;
  const models = await listModels(config);
  if (models.length === 0) {
    throw new LlmError(
      "No chat models available from LM Studio. Load a chat model (not embedding).",
    );
  }
  return models[0]!;
}

export async function chatJson<T>(
  config: LlmConfig,
  messages: ChatMessage[],
  parse: (raw: unknown) => T,
  options?: { maxRetries?: number },
): Promise<{ data: T; model: string }> {
  const maxRetries = options?.maxRetries ?? 3;
  const model = await resolveModel(config);
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new LlmError(`LLM request failed: ${res.status} ${body}`, res.status);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      lastError = new LlmError("Empty response from LLM");
      continue;
    }

    try {
      const json = extractJson(content);
      return { data: parse(json), model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const detail = err instanceof Error ? err.message.slice(0, 500) : String(err);
        messages = [
          ...messages,
          {
            role: "user",
            content: `Invalid JSON or schema validation failed: ${detail}\nReply with ONLY valid JSON matching the schema. Include ALL required fields. No markdown fences.`,
          },
        ];
      }
    }
  }

  throw lastError ?? new LlmError("Failed to get valid JSON from LLM");
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const text = fence ? fence[1]!.trim() : trimmed;
  return JSON.parse(text);
}

export async function pingLlm(config: LlmConfig): Promise<{
  model: string;
  latencyMs: number;
}> {
  const start = Date.now();
  const model = await resolveModel(config);
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: 'Reply with only JSON, no markdown: {"ok":true}',
        },
      ],
      temperature: 0,
      max_tokens: 64,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LlmError(`Ping failed: ${res.status} ${body}`, res.status);
  }

  return { model, latencyMs: Date.now() - start };
}
