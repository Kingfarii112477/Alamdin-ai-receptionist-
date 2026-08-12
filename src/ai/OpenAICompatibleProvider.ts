import { env } from "../config/env";
import type { AIGenerateParams, AIProvider } from "./AIProvider";

/**
 * Works with any OpenAI-compatible /chat/completions endpoint: OpenAI,
 * OpenRouter, Azure OpenAI (with a compatible base URL), or a
 * Gemini-compatible proxy. Configured purely via env vars — no vendor
 * lock-in in the receptionist engine.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";

  async generateReply({ systemPrompt, history, userMessage }: AIGenerateParams): Promise<string> {
    const url = `${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: userMessage }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages,
          temperature: 0.4,
          max_tokens: 500,
          ...(env.AI_REASONING_EFFORT ? { reasoning_effort: env.AI_REASONING_EFFORT } : {})
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`AI provider error ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("AI provider returned an empty response");
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
