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
import { classifyIntent, isAffirmative, isEmergency } from "./intents";
import { R, SUMMARY_LABELS, t } from "./responses";
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
    `${labels.name}: ${fields.patientName ?? ""}`,
    `${labels.phone}: ${fields.phone ?? ""}`,
    `${labels.reason}: ${fields.reason ?? ""}`,
    `${labels.date}: ${dateLabel}`,
    `${labels.time}: ${fields.preferredTimeNormalized ?? ""}`,
    "",
    t(R.summaryConfirmQuestion, language)
  ];
  return lines.join("\n");
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

  if (!isCollecting && classifyIntent(message) === "SAFETY_CONCERN") {
    reply = t(R.safetyDecline, language);
  } else if (!isCollecting && isEmergency(message)) {
    reply = t(R.emergencyGuidance, language);
  } else if (isCollecting) {
    if (classifyIntent(message) === "CANCEL") {
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
      const result = applyFieldAnswer(stage, message);
      if (!result.ok) {
        if (result.reason === "ambiguous") {
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
        reply = next === "CONFIRMING_SUMMARY" ? buildSummaryMessage(fields, language) : promptForStage(next, language, fields);
        if (next === "CONFIRMING_SUMMARY") confirmationStatus = "PENDING";
      }
    }
  } else if (stage === "CONFIRMING_SUMMARY") {
    const intent = classifyIntent(message);
    if (intent === "AFFIRM" || (isAffirmative(message) && intent !== "DENY")) {
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
    } else if (intent === "DENY" || intent === "EDIT_REQUEST") {
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
    const intent = classifyIntent(message);
    switch (intent) {
      case "APPOINTMENT_TRIGGER": {
        const next = nextCollectingStage(fields);
        stage = next;
        if (next === "CONFIRMING_SUMMARY") {
          confirmationStatus = "PENDING";
          reply = buildSummaryMessage(fields, language);
        } else {
          reply = promptForStage(next, language, fields);
        }
        break;
      }
      case "FEE":
        reply = t(R.feeInfo, language);
        break;
      case "HOURS_CLINIC":
        reply = t(R.hoursInfo, language, "clinic");
        break;
      case "HOURS_HOSPITAL":
        reply = t(R.hoursInfo, language, "hospital");
        break;
      case "HOURS_GENERAL":
        reply = t(R.hoursInfo, language, "both");
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
      case "SOCIAL":
        reply = t(R.socialInfo, language);
        break;
      case "GREETING":
        reply = t(R.greeting, language);
        break;
      case "CANCEL":
        reply = t(R.cancelled, language);
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
