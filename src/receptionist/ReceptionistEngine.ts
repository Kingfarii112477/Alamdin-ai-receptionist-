import { getAIProvider } from "../ai/providerFactory";
import { buildSystemPrompt } from "../ai/promptBuilder";
import { createAppointmentRequest } from "../appointments/appointmentsService";
import {
  addMessage,
  getOrCreateConversation,
  recentHistory,
  updateConversation
} from "../conversations/conversationsService";
import type { AIChatMessage } from "../ai/AIProvider";
import type { ChatResponseBody, ConversationStateDTO, Language, Stage } from "../types/conversation";
import { isoToLabel } from "../utils/dateTimeParser";
import { detectLanguage } from "../utils/language";
import { sanitizeText } from "../utils/sanitize";
import { logger } from "../utils/logger";
import { classifyIntent, detectSecondaryFactIntent, isAffirmative, isEmergency, type FactIntent } from "./intents";
import { R, SUMMARY_LABELS, t } from "./responses";
import { detectCorrection, detectImplicitValueChange } from "./correction";
import { extractEmbeddedFields } from "./slotExtractor";
import { findServiceByAlias } from "../config/clinic";
import {
  applyFieldAnswer,
  detectFieldFromText,
  nextCollectingStage,
  type AppointmentFields
} from "./stateMachine";

function toFields(conv: {
  patientName: string | null;
  phone: string | null;
  reason: string | null;
  preferredDateRaw: string | null;
  preferredDateISO: string | null;
  preferredTimeRaw: string | null;
  preferredTimeNormalized: string | null;
}): AppointmentFields {
  return {
    patientName: conv.patientName,
    phone: conv.phone,
    reason: conv.reason,
    preferredDateRaw: conv.preferredDateRaw,
    preferredDateISO: conv.preferredDateISO,
    preferredTimeRaw: conv.preferredTimeRaw,
    preferredTimeNormalized: conv.preferredTimeNormalized
  };
}

function emptyFieldsFrom(stage: Stage): Partial<AppointmentFields> {
  switch (stage) {
    case "COLLECTING_NAME":
      return { patientName: null };
    case "COLLECTING_PHONE":
      return { phone: null };
    case "COLLECTING_REASON":
      return { reason: null };
    case "COLLECTING_DATE":
      return { preferredDateRaw: null, preferredDateISO: null };
    case "COLLECTING_TIME":
      return { preferredTimeRaw: null, preferredTimeNormalized: null };
    default:
      return {};
  }
}

function promptForStage(stage: Stage, language: Language, fields: AppointmentFields): string {
  switch (stage) {
    case "COLLECTING_NAME":
      return t(R.askName, language);
    case "COLLECTING_PHONE":
      return t(R.askPhone, language, fields.patientName);
    case "COLLECTING_REASON":
      return t(R.askReason, language);
    case "COLLECTING_DATE":
      return t(R.askDate, language);
    case "COLLECTING_TIME":
      return t(R.askTime, language);
    default:
      return t(R.askName, language);
  }
}

function buildSummaryMessage(fields: AppointmentFields, language: Language): string {
  const labels = SUMMARY_LABELS[language];
  const dateLabel = fields.preferredDateISO ? isoToLabel(fields.preferredDateISO) : (fields.preferredDateRaw ?? "");
  const lines = [
    t(R.summaryHeader, language),
    "",
    `👤 ${labels.name}: ${fields.patientName ?? ""}`,
    `📱 ${labels.phone}: ${fields.phone ?? ""}`,
    `🩺 ${labels.reason}: ${fields.reason ?? ""}`,
    `📅 ${labels.date}: ${dateLabel}`,
    `🕐 ${labels.time}: ${fields.preferredTimeNormalized ?? ""}`,
    "",
    t(R.summaryConfirmQuestion, language)
  ];
  return lines.join("\n");
}

function fieldLabelFor(stage: Stage, language: Language): string {
  const labels = SUMMARY_LABELS[language];
  switch (stage) {
    case "COLLECTING_NAME":
      return labels.name;
    case "COLLECTING_PHONE":
      return labels.phone;
    case "COLLECTING_REASON":
      return labels.reason;
    case "COLLECTING_DATE":
      return labels.date;
    case "COLLECTING_TIME":
      return labels.time;
    default:
      return "";
  }
}

/** Answers a clinic-fact question layered onto another message — see detectSecondaryFactIntent. Takes the raw message too, since SERVICE_INQUIRY needs it to resolve which catalog entry matched. */
function factReply(intent: FactIntent, language: Language, rawMessage: string): string {
  switch (intent) {
    case "SERVICE_INQUIRY": {
      const service = findServiceByAlias(rawMessage);
      return service ? t(R.serviceInfo, language, service) : t(R.servicesOverview, language);
    }
    case "SERVICES_OVERVIEW":
      return t(R.servicesOverview, language);
    case "CONSULTATION_FEE":
      return t(R.consultationInfo, language);
    case "HOURS":
      return t(R.hoursInfo, language);
    case "LOCATION":
      return t(R.locationInfo, language);
    case "DOCTOR":
      return t(R.doctorInfo, language);
    case "CONTACT":
      return t(R.contactInfo, language);
    case "RATINGS":
      return t(R.ratingsInfo, language);
  }
}

/** Fills in only the fields that are still unset — never overwrites a field the patient already gave a different value for. */
function fillMissingFields(base: AppointmentFields, extra: Partial<AppointmentFields>): AppointmentFields {
  const merged: AppointmentFields = { ...base };
  (Object.keys(extra) as (keyof AppointmentFields)[]).forEach((key) => {
    if (merged[key] == null && extra[key] != null) {
      (merged[key] as string | null) = extra[key] as string;
    }
  });
  return merged;
}

function toStateDTO(stage: Stage, fields: AppointmentFields): ConversationStateDTO {
  return {
    stage,
    name: fields.patientName,
    phone: fields.phone,
    reason: fields.reason,
    preferredDate: fields.preferredDateISO,
    preferredTime: fields.preferredTimeNormalized
  };
}

async function generateOpenEndedReply(conversationId: string, language: Language, message: string): Promise<string> {
  const provider = getAIProvider();
  const history: AIChatMessage[] = (await recentHistory(conversationId, 10)).map((m) => ({
    role: m.role as AIChatMessage["role"],
    content: m.content
  }));

  try {
    return await provider.generateReply({
      systemPrompt: buildSystemPrompt(language),
      history,
      userMessage: message,
      language
    });
  } catch (err) {
    logger.warn({ err }, "AI provider failed, using safe fallback");
    const fallback: Record<Language, string> = {
      english: "Sorry, I'm having trouble answering that right now. Please call the clinic and our team will help.",
      urdu: "معذرت، ابھی اس کا جواب دینے میں مسئلہ ہو رہا ہے۔ براہ کرم کلینک کو کال کریں۔",
      "roman-urdu": "Sorry, abhi is ka jawab dene mein masla ho raha hai. Baraye meharbani clinic ko call karein."
    };
    return fallback[language];
  }
}

/**
 * The single entry point for turning one patient message into one
 * receptionist reply. Channel-agnostic (web today; WhatsApp/voice adapters
 * later call this exact function) — see README architecture section.
 */
export async function processMessage(conversationId: string | undefined, rawMessage: string): Promise<ChatResponseBody> {
  const message = sanitizeText(rawMessage);
  const conv = await getOrCreateConversation(conversationId);
  // A reply with no letters at all (e.g. a bare phone number or "8pm") carries
  // no language signal — keep the conversation's established language rather
  // than resetting to the English default.
  const hasLetters = /[a-zA-Z؀-ۿ]/.test(message);
  const language = hasLetters ? detectLanguage(message) : (conv.language as Language);

  await addMessage(conv.id, "user", message);

  let stage = conv.stage as Stage;
  let fields = toFields(conv);
  let confirmationStatus = conv.confirmationStatus;
  let reply: string;

  const isCollecting = stage.startsWith("COLLECTING_");
  const primaryIntent = classifyIntent(message);

  if (!isCollecting && primaryIntent === "SAFETY_MOLE_CANCER") {
    reply = t(R.moleCancerDecline, language);
  } else if (!isCollecting && primaryIntent === "SAFETY_TREATMENT_RECOMMENDATION") {
    reply = t(R.treatmentRecommendationDecline, language);
  } else if (!isCollecting && primaryIntent === "SAFETY_DIAGNOSIS") {
    reply = t(R.diagnosisDecline, language);
  } else if (!isCollecting && isEmergency(message)) {
    reply = t(R.emergencyGuidance, language);
  } else if (!isCollecting && primaryIntent === "HUMAN_HANDOFF") {
    reply = t(R.humanHandoff, language);
  } else if (isCollecting) {
    if (primaryIntent === "CANCEL") {
      fields = {
        patientName: null,
        phone: null,
        reason: null,
        preferredDateRaw: null,
        preferredDateISO: null,
        preferredTimeRaw: null,
        preferredTimeNormalized: null
      };
      stage = "IDLE";
      confirmationStatus = "NOT_APPLICABLE";
      reply = t(R.cancelled, language);
    } else {
      // A message can (a) directly answer the field currently being asked —
      // possibly with an inline self-correction like "8 nahi 9 baje" — or
      // (b) correct a DIFFERENT, already-provided field while the current
      // question is still unanswered, e.g. "actually mera naam Bilal hai"
      // while COLLECTING_PHONE. detectCorrection tells these apart; a
      // message that isn't a recognizable correction at all (the ordinary
      // case — a plain "Ahmed", "03301234567", "Kal") returns null and
      // falls straight through to the unchanged original per-field parsing.
      const correction = detectCorrection(message);

      if (correction && correction.stage === stage) {
        fields = { ...fields, ...correction.fields };
        const next = nextCollectingStage(fields);
        stage = next;
        const secondaryFact = detectSecondaryFactIntent(message);
        const factAnswer = secondaryFact ? `${factReply(secondaryFact, language, message)}\n\n` : "";
        reply = factAnswer + (next === "CONFIRMING_SUMMARY" ? buildSummaryMessage(fields, language) : promptForStage(next, language, fields));
        if (next === "CONFIRMING_SUMMARY") confirmationStatus = "PENDING";
      } else {
        let ackPrefix = "";
        if (correction && correction.stage !== stage) {
          fields = { ...fields, ...correction.fields };
          ackPrefix = `${t(R.correctionAck, language, fieldLabelFor(correction.stage, language), correction.displayValue)}\n\n`;
        }

        const result = applyFieldAnswer(stage, message);
        if (!result.ok) {
          if (correction) {
            // A different field was just corrected; the current question is
            // still unanswered — re-ask it with the correction acknowledged.
            reply = ackPrefix + promptForStage(stage, language, fields);
          } else if (result.reason === "ambiguous") {
            reply = stage === "COLLECTING_DATE" ? t(R.dateAmbiguous, language) : t(R.timeAmbiguous, language);
          } else if (stage === "COLLECTING_PHONE") {
            reply = t(R.invalidPhone, language);
          } else {
            reply = promptForStage(stage, language, fields);
          }
        } else {
          fields = { ...fields, ...result.fields };
          const next = nextCollectingStage(fields);
          stage = next;
          const secondaryFact = detectSecondaryFactIntent(message);
          const factAnswer = secondaryFact ? `${factReply(secondaryFact, language, message)}\n\n` : "";
          reply = ackPrefix + factAnswer + (next === "CONFIRMING_SUMMARY" ? buildSummaryMessage(fields, language) : promptForStage(next, language, fields));
          if (next === "CONFIRMING_SUMMARY") confirmationStatus = "PENDING";
        }
      }
    }
  } else if (stage === "CONFIRMING_SUMMARY") {
    // An explicit correction takes priority over confirming/denying: a
    // message that both confirms AND corrects in the same turn (e.g. "haan
    // par kal nahi parson") applies the correction and shows the updated
    // summary for a fresh explicit confirmation, rather than guessing that
    // both were meant to happen at once — consistent with never treating an
    // appointment as settled without an unambiguous yes on the final details.
    const correction = detectCorrection(message) ?? detectImplicitValueChange(message, fields);
    if (correction) {
      fields = { ...fields, ...correction.fields };
      const ack = t(R.correctionAck, language, fieldLabelFor(correction.stage, language), correction.displayValue);
      reply = `${ack}\n\n${buildSummaryMessage(fields, language)}`;
    } else if (primaryIntent === "AFFIRM" || (isAffirmative(message) && primaryIntent !== "DENY")) {
      await createAppointmentRequest({
        conversationId: conv.id,
        patientName: fields.patientName!,
        phone: fields.phone!,
        reason: fields.reason!,
        preferredDateRaw: fields.preferredDateRaw!,
        preferredDateISO: fields.preferredDateISO!,
        preferredTimeRaw: fields.preferredTimeRaw!,
        preferredTimeNormalized: fields.preferredTimeNormalized!
      });
      stage = "REQUEST_SUBMITTED";
      confirmationStatus = "REQUESTED";
      reply = t(R.requestReceived, language);
    } else if (primaryIntent === "DENY" || primaryIntent === "EDIT_REQUEST") {
      stage = "AWAITING_EDIT_FIELD";
      reply = t(R.editWhichField, language);
    } else {
      const fieldStage = detectFieldFromText(message);
      if (fieldStage) {
        const result = applyFieldAnswer(fieldStage, message);
        if (result.ok) {
          fields = { ...fields, ...result.fields };
          reply = buildSummaryMessage(fields, language);
        } else {
          stage = fieldStage;
          reply = promptForStage(fieldStage, language, fields);
        }
      } else {
        reply = t(R.summaryConfirmQuestion, language);
      }
    }
  } else if (stage === "AWAITING_EDIT_FIELD") {
    const fieldStage = detectFieldFromText(message);
    if (fieldStage) {
      fields = { ...fields, ...emptyFieldsFrom(fieldStage) };
      stage = fieldStage;
      reply = promptForStage(fieldStage, language, fields);
    } else {
      reply = t(R.editFieldNotUnderstood, language);
    }
  } else {
    // IDLE or REQUEST_SUBMITTED
    switch (primaryIntent) {
      case "APPOINTMENT_TRIGGER": {
        // A trigger message can volunteer several fields at once, e.g.
        // "Mera naam Ahmed hai aur mujhe kal 8 baje Botox ke liye
        // appointment chahiye" — extract whatever's confidently there so
        // nextCollectingStage only asks for what's genuinely still missing.
        fields = fillMissingFields(fields, extractEmbeddedFields(message));
        const next = nextCollectingStage(fields);
        stage = next;
        const secondaryFact = detectSecondaryFactIntent(message);
        const factAnswer = secondaryFact ? `${factReply(secondaryFact, language, message)}\n\n` : "";
        if (next === "CONFIRMING_SUMMARY") {
          confirmationStatus = "PENDING";
          reply = factAnswer + buildSummaryMessage(fields, language);
        } else {
          reply = factAnswer + promptForStage(next, language, fields);
        }
        break;
      }
      case "HUMAN_HANDOFF":
        reply = t(R.humanHandoff, language);
        break;
      case "SERVICE_INQUIRY": {
        const service = findServiceByAlias(message);
        reply = service ? t(R.serviceInfo, language, service) : t(R.servicesOverview, language);
        break;
      }
      case "SERVICES_OVERVIEW":
        reply = t(R.servicesOverview, language);
        break;
      case "CONSULTATION_FEE":
        reply = t(R.consultationInfo, language);
        break;
      case "HOURS":
        reply = t(R.hoursInfo, language);
        break;
      case "LOCATION":
        reply = t(R.locationInfo, language);
        break;
      case "DOCTOR":
        reply = t(R.doctorInfo, language);
        break;
      case "CONTACT":
        reply = t(R.contactInfo, language);
        break;
      case "RATINGS":
        reply = t(R.ratingsInfo, language);
        break;
      case "GREETING":
        reply = t(R.greeting, language);
        break;
      case "CANCEL":
        reply = t(R.cancelled, language);
        break;
      case "EDIT_REQUEST":
        // No active summary to edit here (that's handled inside
        // CONFIRMING_SUMMARY/AWAITING_EDIT_FIELD) — this is a patient asking
        // to change an already-submitted request, which the chat flow can't
        // do on its own; point them to staff.
        reply = t(R.rescheduleInfo, language);
        break;
      default:
        reply = await generateOpenEndedReply(conv.id, language, message);
    }
  }

  await addMessage(conv.id, "assistant", reply);

  await updateConversation(conv.id, {
    language,
    stage,
    confirmationStatus,
    patientName: fields.patientName,
    phone: fields.phone,
    reason: fields.reason,
    preferredDateRaw: fields.preferredDateRaw,
    preferredDateISO: fields.preferredDateISO,
    preferredTimeRaw: fields.preferredTimeRaw,
    preferredTimeNormalized: fields.preferredTimeNormalized
  });

  return {
    conversationId: conv.id,
    message: reply,
    state: toStateDTO(stage, fields)
  };
}
