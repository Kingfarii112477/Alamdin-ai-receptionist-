import type { Language } from "../types/conversation";

const URDU_SCRIPT_RANGE = /[؀-ۿ]/;

// A small but high-precision set of Roman Urdu function words/particles.
// These rarely appear in English sentences, so a single hit is a strong
// signal, unlike content words that could be shared (e.g. clinic names).
const ROMAN_URDU_MARKERS = [
  "mujhe",
  "mera",
  "meri",
  "aap",
  "aapka",
  "aapki",
  "hai",
  "hain",
  "ho",
  "kya",
  "kyun",
  "kaise",
  "kahan",
  "kab",
  "chahiye",
  "chahta",
  "chahti",
  "karni",
  "karna",
  "karo",
  "kardo",
  "krna",
  "krni",
  "bilkul",
  "shukriya",
  "theek",
  "thik",
  "nahi",
  "nahin",
  "haan",
  "han",
  "ji",
  "sahb",
  "sahab",
  "sy",
  "se",
  "ka",
  "ki",
  "ke",
  "mein",
  "main",
  "wajah",
  "dard",
  "daant",
  "dant",
  "waqt",
  "baje",
  "raat",
  "subah",
  "shaam",
  "dopher",
  "kal",
  "parso",
  "parson",
  "aaj",
  "abhi",
  "please rabta",
  "rabta"
];

/**
 * Detects the patient's language so the receptionist can reply in kind.
 * Order of checks matters: Urdu script is unambiguous, so it wins first.
 * Roman Urdu is detected via function-word matching (robust to typos in
 * content words). Anything else defaults to English.
 */
export function detectLanguage(message: string): Language {
  if (URDU_SCRIPT_RANGE.test(message)) {
    return "urdu";
  }

  const normalized = message.toLowerCase();
  const words = normalized.split(/[^a-z]+/).filter(Boolean);
  const hit = words.some((w) => ROMAN_URDU_MARKERS.includes(w));

  return hit ? "roman-urdu" : "english";
}
