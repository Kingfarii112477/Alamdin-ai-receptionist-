import { env } from "../config/env";
import type { AIProvider } from "./AIProvider";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";
import { TemplateProvider } from "./TemplateProvider";

let instance: AIProvider | null = null;

/** Returns the configured AI provider singleton. See src/config/env.ts. */
export function getAIProvider(): AIProvider {
  if (instance) return instance;

  instance = env.AI_PROVIDER === "openai-compatible" ? new OpenAICompatibleProvider() : new TemplateProvider();

  return instance;
}
