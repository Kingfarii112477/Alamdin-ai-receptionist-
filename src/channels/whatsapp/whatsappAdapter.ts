import { processMessage } from "../../receptionist/ReceptionistEngine";
import { logger } from "../../utils/logger";
import { claimWhatsAppMessageId, getKnownLanguageForPhoneNumber, getOrCreateConversationIdForPhoneNumber } from "./contactMapping";
import { parseWhatsAppWebhookPayload } from "./payloadParser";
import { sendWhatsAppTextMessage } from "./whatsappClient";
import { unsupportedMediaReply } from "./whatsappResponses";

/**
 * The whole WhatsApp channel in one function: parse the raw webhook body,
 * resolve which existing Conversation this phone number belongs to, hand
 * the message text to the exact same `processMessage()` the web chat calls,
 * and relay the reply back over the Cloud API.
 *
 * This is deliberately the *only* place that knows WhatsApp exists —
 * `processMessage()` receives a plain string and a conversationId exactly
 * like it does from `POST /api/v1/chat`, and has no idea the caller is a
 * webhook rather than the browser. See README.md → "WhatsApp integration"
 * for why this calls `processMessage()` directly instead of making a real
 * loopback HTTP request to `/api/v1/chat` (same function, no network hop).
 */
export async function handleWhatsAppWebhookPayload(rawPayload: unknown): Promise<void> {
  const event = parseWhatsAppWebhookPayload(rawPayload);

  if (event.kind === "ignored") return;

  const isNew = await claimWhatsAppMessageId(event.whatsappMessageId);
  if (!isNew) {
    logger.info({ whatsappMessageId: event.whatsappMessageId }, "Duplicate WhatsApp webhook delivery skipped");
    return;
  }

  if (event.kind === "unsupported_media") {
    const knownLanguage = await getKnownLanguageForPhoneNumber(event.from);
    await sendWhatsAppTextMessage(event.from, unsupportedMediaReply(knownLanguage));
    return;
  }

  const conversationId = await getOrCreateConversationIdForPhoneNumber(event.from);
  const result = await processMessage(conversationId, event.text);
  await sendWhatsAppTextMessage(event.from, result.message);
}
