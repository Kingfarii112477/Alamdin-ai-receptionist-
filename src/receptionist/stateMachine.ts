import { parseDateExpression, parseTimeExpression } from "../utils/dateTimeParser";
import type { Stage } from "../types/conversation";

export interface AppointmentFields {
  patientName: string | null;
  phone: string | null;
  reason: string | null;
  preferredDateRaw: string | null;
  preferredDateISO: string | null;
  preferredTimeRaw: string | null;
  preferredTimeNormalized: string | null;
}

export function parseName(raw: string): { ok: true; value: string } | { ok: false } {
  const value = raw.trim();
  if (value.length < 2 || value.length > 80) return { ok: false };
  return { ok: true, value };
}

const PHONE_DIGITS = /\d/g;

export function parsePhone(raw: string): { ok: true; value: string } | { ok: false } {
  const digits = (raw.match(PHONE_DIGITS) ?? []).join("");
  // Accepts Pakistani mobile numbers (03XXXXXXXXX, +923XXXXXXXXX) and is
  // lenient enough for other reasonable-length numbers. Storing the cleaned
  // digits (not the raw sentence) matters once phone numbers can arrive
  // embedded in a longer message, e.g. "number ye hai 0330 123 4567".
  if (digits.length < 10 || digits.length > 13) return { ok: false };
  const value = /^\s*\+/.test(raw) ? `+${digits}` : digits;
  return { ok: true, value };
}

export function parseReason(raw: string): { ok: true; value: string } | { ok: false } {
  const value = raw.trim();
  if (value.length < 2 || value.length > 300) return { ok: false };
  return { ok: true, value };
}

/** The order fields are collected in when none are known yet. */
export const FIELD_ORDER: Stage[] = [
  "COLLECTING_NAME",
  "COLLECTING_PHONE",
  "COLLECTING_REASON",
  "COLLECTING_DATE",
  "COLLECTING_TIME"
];

export function nextCollectingStage(fields: AppointmentFields): Stage {
  if (!fields.patientName) return "COLLECTING_NAME";
  if (!fields.phone) return "COLLECTING_PHONE";
  if (!fields.reason) return "COLLECTING_REASON";
  if (!fields.preferredDateISO) return "COLLECTING_DATE";
  if (!fields.preferredTimeNormalized) return "COLLECTING_TIME";
  return "CONFIRMING_SUMMARY";
}

export interface FieldUpdateResult {
  ok: boolean;
  fields?: Partial<AppointmentFields>;
  /** Set when the raw input couldn't be parsed and the same question should be re-asked. */
  reason?: "invalid" | "ambiguous";
}

export function applyFieldAnswer(stage: Stage, raw: string): FieldUpdateResult {
  switch (stage) {
    case "COLLECTING_NAME": {
      const r = parseName(raw);
      return r.ok ? { ok: true, fields: { patientName: r.value } } : { ok: false, reason: "invalid" };
    }
    case "COLLECTING_PHONE": {
      const r = parsePhone(raw);
      return r.ok ? { ok: true, fields: { phone: r.value } } : { ok: false, reason: "invalid" };
    }
    case "COLLECTING_REASON": {
      const r = parseReason(raw);
      return r.ok ? { ok: true, fields: { reason: r.value } } : { ok: false, reason: "invalid" };
    }
    case "COLLECTING_DATE": {
      const r = parseDateExpression(raw);
      if (r.ambiguous || !r.iso) return { ok: false, reason: "ambiguous" };
      return { ok: true, fields: { preferredDateRaw: raw.trim(), preferredDateISO: r.iso } };
    }
    case "COLLECTING_TIME": {
      const r = parseTimeExpression(raw);
      if (r.ambiguous || !r.hhmm) return { ok: false, reason: "ambiguous" };
      return { ok: true, fields: { preferredTimeRaw: raw.trim(), preferredTimeNormalized: r.label } };
    }
    default:
      return { ok: false, reason: "invalid" };
  }
}

const FIELD_KEYWORDS: { stage: Stage; words: string[] }[] = [
  { stage: "COLLECTING_NAME", words: ["name", "naam", "نام"] },
  { stage: "COLLECTING_PHONE", words: ["phone", "number", "contact", "nmbr", "نمبر"] },
  { stage: "COLLECTING_REASON", words: ["reason", "wajah", "وجہ"] },
  { stage: "COLLECTING_DATE", words: ["date", "din", "tareekh", "تاریخ"] },
  { stage: "COLLECTING_TIME", words: ["time", "waqt", "وقت"] }
];

/** Detects which field the patient wants to edit, from free text like "date change karo". */
export function detectFieldFromText(raw: string): Stage | null {
  const text = raw.toLowerCase();
  for (const { stage, words } of FIELD_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return stage;
  }
  return null;
}

export function formatSummaryLines(fields: AppointmentFields): {
  name: string;
  phone: string;
  reason: string;
  date: string;
  time: string;
} {
  return {
    name: fields.patientName ?? "",
    phone: fields.phone ?? "",
    reason: fields.reason ?? "",
    date: fields.preferredDateRaw ?? "",
    time: fields.preferredTimeNormalized ?? ""
  };
}
