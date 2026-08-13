import { parseDateExpression, parseTimeExpression } from "../utils/dateTimeParser";
import { parsePhone } from "./stateMachine";
import type { AppointmentFields } from "./stateMachine";

/**
 * Pulls a name out of a sentence that names it explicitly, e.g.
 * "mera naam Ahmed hai", "actually naam Bilal hai", "name is Muhammad Farooq",
 * "nahi mera naam Muhammad Farooq hai". Deliberately does NOT try to guess a
 * name from a bare word with no marker — that's the job of the ordinary
 * per-stage collector (stateMachine.parseName), which already handles a
 * plain "Ahmed" reply correctly. This only fires for longer, sentence-style
 * messages where a name is named alongside other content.
 */
const NAME_MARKER_PATTERN =
  /(?:mera\s+naam|mera\s+nam|my\s+name\s+is|name\s+is|naam|name)\s+(?:hai\s+)?([a-zA-Z؀-ۿ][a-zA-Z؀-ۿ'.\s]{1,49}?)(?:\s+hai\b|\s+h\b|[.,!?]|$)/i;

const NAME_STOPWORDS = new Set(["kya", "hai", "chahiye", "kar", "karo", "update"]);

export function extractNameFromText(text: string): string | null {
  const match = text.match(NAME_MARKER_PATTERN);
  if (!match) return null;
  const value = match[1].trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 60) return null;
  if (NAME_STOPWORDS.has(value.toLowerCase())) return null;
  return value;
}

/**
 * Common dental-visit reasons, longest/most specific first so a fuller
 * phrase like "tooth mein pain" is preferred over a bare "pain" when both
 * are present. Used both to spot a reason embedded in a longer message and
 * (by the caller, on an already-negation-scoped substring) to read out a
 * corrected reason — see correction.ts.
 */
const REASON_HINT_PHRASES = [
  "daant mein dard",
  "daant me dard",
  "dant mein dard",
  "dant me dard",
  "tooth mein pain",
  "tooth mein dard",
  "mere tooth mein pain",
  "tooth ache",
  "toothache",
  "tooth pain",
  "root canal",
  "check up",
  "checkup",
  "cleaning",
  "filling",
  "extraction",
  "nikalna",
  "implant",
  "crown",
  "veneers",
  "swelling",
  "sensitivity",
  "cavity",
  "dard",
  "pain"
];

export function extractReasonFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of REASON_HINT_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}

/**
 * Scans a free-form message for as many appointment fields as can be
 * confidently identified at once — used when a patient volunteers several
 * fields in one message (the trigger message itself, or a later message
 * that happens to answer more than was asked). Date/time reuse the existing
 * parsers directly since they already tolerate surrounding words; name and
 * reason use the marker/phrase matching above. Never guesses — every field
 * is either a clean match or omitted entirely.
 */
export function extractEmbeddedFields(text: string): Partial<AppointmentFields> {
  const fields: Partial<AppointmentFields> = {};

  const name = extractNameFromText(text);
  if (name) fields.patientName = name;

  const phone = parsePhone(text);
  if (phone.ok) fields.phone = phone.value;

  const reason = extractReasonFromText(text);
  if (reason) fields.reason = reason;

  // Store the parsed label, not the whole surrounding sentence, as the "raw"
  // value — this is shown to staff as-is in the admin dashboard, and a
  // multi-field trigger message like "Mera naam Ahmed hai aur mujhe kal 8
  // baje..." would otherwise dump its entire text into that column.
  const date = parseDateExpression(text);
  if (!date.ambiguous && date.iso) {
    fields.preferredDateRaw = date.label ?? text.trim();
    fields.preferredDateISO = date.iso;
  }

  const time = parseTimeExpression(text);
  if (!time.ambiguous && time.hhmm) {
    fields.preferredTimeRaw = time.label ?? text.trim();
    fields.preferredTimeNormalized = time.label;
  }

  return fields;
}
