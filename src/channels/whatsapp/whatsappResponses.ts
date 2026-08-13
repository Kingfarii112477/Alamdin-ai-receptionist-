import type { Language } from "../../types/conversation";

/**
 * WhatsApp-only copy (media isn't a concept the web chat has). Kept local to
 * this adapter rather than added to src/receptionist/responses.ts, since
 * the receptionist engine itself never sees a media message — the adapter
 * intercepts and replies to it before `processMessage()` is ever called.
 */
const UNSUPPORTED_MEDIA: Record<Language, string> = {
  english: "At the moment I can only handle text messages. Please send your question as text.",
  urdu: "فی الحال میں صرف ٹیکسٹ میسج سمجھ سکتا ہوں۔ براہ کرم اپنا سوال ٹیکسٹ میں بھیجیں۔",
  "roman-urdu": "Filhaal main sirf text messages handle kar sakta/sakti hoon. Aap apna sawal text mein bhej dein."
};

export function unsupportedMediaReply(language: Language | null): string {
  return UNSUPPORTED_MEDIA[language ?? "roman-urdu"];
}
