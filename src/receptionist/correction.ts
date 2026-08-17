import { parseDateExpression, parseTimeExpression } from "../utils/dateTimeParser";
import type { Stage } from "../types/conversation";
import { detectFieldFromText, parsePhone, type AppointmentFields } from "./stateMachine";
import { extractNameFromText, extractReasonFromText } from "./slotExtractor";

export interface CorrectionResult {
  /** Which COLLECTING_* field this correction targets. */
  stage: Stage;
  fields: Partial<AppointmentFields>;
  /** Human-readable new value, for the acknowledgment message. */
  displayValue: string;
}

const NEGATION_PATTERN = /\bnahi\b|\bnahin\b|\bnot\b/i;

/** The part of the message after "nahi"/"not" — the corrected value in an "old nahi new" swap. */
function textAfterNegation(text: string): string | null {
  const m = text.match(NEGATION_PATTERN);
  if (!m || m.index === undefined) return null;
  const after = text.slice(m.index + m[0].length).trim();
  return after.length > 0 ? after : null;
}

function extractForStage(
  stage: Stage,
  candidate: string,
  fullMessage: string
): { fields: Partial<AppointmentFields>; displayValue: string } | null {
  switch (stage) {
    case "COLLECTING_NAME": {
      const name = extractNameFromText(fullMessage) ?? (candidate.length >= 2 && candidate.length <= 60 ? candidate.trim() : null);
      return name ? { fields: { patientName: name }, displayValue: name } : null;
    }
    case "COLLECTING_PHONE": {
      const phone = parsePhone(candidate);
      return phone.ok ? { fields: { phone: phone.value }, displayValue: phone.value } : null;
    }
    case "COLLECTING_REASON": {
      const reason = extractReasonFromText(candidate) ?? (candidate.length >= 2 && candidate.length <= 300 ? candidate.trim() : null);
      return reason ? { fields: { reason }, displayValue: reason } : null;
    }
    case "COLLECTING_DATE": {
      const date = parseDateExpression(candidate);
      if (date.ambiguous || !date.iso) return null;
      return { fields: { preferredDateRaw: candidate.trim(), preferredDateISO: date.iso }, displayValue: date.label ?? candidate.trim() };
    }
    case "COLLECTING_TIME": {
      const time = parseTimeExpression(candidate);
      if (time.ambiguous || !time.hhmm) return null;
      return {
        fields: { preferredTimeRaw: candidate.trim(), preferredTimeNormalized: time.label },
        displayValue: time.label ?? candidate.trim()
      };
    }
    default:
      return null;
  }
}

/**
 * Detects whether a message is correcting a previously-provided appointment
 * field ("actually mera naam Bilal hai", "8 nahi 9 baje", "reason Botox
 * nahi PRP hai") and, if so, which field and to what value. Returns
 * null for anything that isn't a recognizable correction — callers fall
 * through to their normal handling in that case, so a message that was
 * never meant as a correction is never misread as one.
 */
export function detectCorrection(rawMessage: string): CorrectionResult | null {
  const afterNegation = textAfterNegation(rawMessage);

  // 1) An explicit field-name keyword is present ("naam", "phone", "date",
  // "wajah"...) — the strongest, least ambiguous signal. Prefer the
  // after-negation substring as the value when present (the "new" side of
  // an "old nahi new" swap), otherwise the whole message.
  const keywordStage = detectFieldFromText(rawMessage);
  if (keywordStage) {
    const candidate = afterNegation ?? rawMessage;
    const result = extractForStage(keywordStage, candidate, rawMessage);
    if (result) return { stage: keywordStage, ...result };
  }

  // 2) No explicit keyword, but an "X nahi Y" structure whose Y unambiguously
  // parses as one specific field type — e.g. "8 nahi 9 baje", "kal nahi
  // parson". Reason is deliberately excluded here: free text is too
  // ambiguous to guess as a reason correction without an explicit
  // "reason"/"wajah" marker, unlike a phone number, date, or time, which are
  // structurally distinctive enough to infer safely.
  if (afterNegation) {
    const phone = parsePhone(afterNegation);
    if (phone.ok) {
      return { stage: "COLLECTING_PHONE", fields: { phone: phone.value }, displayValue: phone.value };
    }

    const date = parseDateExpression(afterNegation);
    if (!date.ambiguous && date.iso) {
      return {
        stage: "COLLECTING_DATE",
        fields: { preferredDateRaw: afterNegation, preferredDateISO: date.iso },
        displayValue: date.label ?? afterNegation
      };
    }

    const time = parseTimeExpression(afterNegation);
    if (!time.ambiguous && time.hhmm) {
      return {
        stage: "COLLECTING_TIME",
        fields: { preferredTimeRaw: afterNegation, preferredTimeNormalized: time.label },
        displayValue: time.label ?? afterNegation
      };
    }
  }

  return null;
}

/**
 * CONFIRMING_SUMMARY-only fallback for a correction with no negation word at
 * all — "haan kal" (yes + tomorrow, no "nahi"). Only fires when the message
 * contains an unambiguous phone/date/time value that DIFFERS from what's
 * already on file, so a plain "haan" or a restatement of the same value
 * never gets misread as a change; deliberately not used outside this stage,
 * where a stray parseable value inside free-form field text (e.g. a reason)
 * could otherwise be misattributed to the wrong field.
 */
export function detectImplicitValueChange(rawMessage: string, fields: AppointmentFields): CorrectionResult | null {
  const phone = parsePhone(rawMessage);
  if (phone.ok && phone.value !== fields.phone) {
    return { stage: "COLLECTING_PHONE", fields: { phone: phone.value }, displayValue: phone.value };
  }

  const date = parseDateExpression(rawMessage);
  if (!date.ambiguous && date.iso && date.iso !== fields.preferredDateISO) {
    return {
      stage: "COLLECTING_DATE",
      fields: { preferredDateRaw: rawMessage.trim(), preferredDateISO: date.iso },
      displayValue: date.label ?? rawMessage.trim()
    };
  }

  const time = parseTimeExpression(rawMessage);
  if (!time.ambiguous && time.label && time.label !== fields.preferredTimeNormalized) {
    return {
      stage: "COLLECTING_TIME",
      fields: { preferredTimeRaw: rawMessage.trim(), preferredTimeNormalized: time.label },
      displayValue: time.label
    };
  }

  return null;
}
