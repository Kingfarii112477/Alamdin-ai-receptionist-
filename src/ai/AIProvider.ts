import type { Language } from "../types/conversation";

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateParams {
  systemPrompt: string;
  history: AIChatMessage[];
  userMessage: string;
  language: Language;
}

/**
 * Provider-agnostic interface for the "AI Brain". Implementations must never
 * be imported directly by the receptionist engine — always go through
 * providerFactory so the engine stays portable across vendors.
 */
export interface AIProvider {
  readonly name: string;
  generateReply(params: AIGenerateParams): Promise<string>;
}
