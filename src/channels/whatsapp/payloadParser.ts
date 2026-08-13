import type { ParsedWhatsAppEvent, WhatsAppWebhookPayload } from "./types";

/**
 * Pulls the one inbound message that matters out of a raw Meta webhook
 * delivery. Pure and side-effect-free on purpose — every branch here is
 * unit-testable without a network call or a database.
 *
 * A single delivery can technically carry more than one message, but in
 * practice the Cloud API always sends one message per webhook call; taking
 * the first is the documented-safe assumption every WhatsApp integration
 * makes.
 */
export function parseWhatsAppWebhookPayload(payload: unknown): ParsedWhatsAppEvent {
  if (!payload || typeof payload !== "object") return { kind: "ignored" };

  const body = payload as WhatsAppWebhookPayload;
  if (body.object !== "whatsapp_business_account") return { kind: "ignored" };

  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || !message.from || !message.id) return { kind: "ignored" };

  const from = message.from;
  const whatsappMessageId = message.id;
  const timestamp = message.timestamp ?? String(Math.floor(Date.now() / 1000));

  if (message.type === "text" && message.text?.body) {
    return { kind: "text", from, whatsappMessageId, timestamp, text: message.text.body };
  }

  return { kind: "unsupported_media", from, whatsappMessageId, timestamp, mediaType: message.type ?? "unknown" };
}
