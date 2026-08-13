// Minimal shape of a WhatsApp Cloud API webhook delivery — only the fields
// this adapter actually reads. Meta's real payload has more fields than
// this; everything else is ignored on purpose.
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id?: string;
  changes?: WhatsAppChange[];
}

export interface WhatsAppChange {
  field?: string;
  value?: WhatsAppChangeValue;
}

export interface WhatsAppChangeValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WhatsAppInboundMessage[];
  statuses?: unknown[]; // delivery/read receipts — not handled, not an error
}

/**
 * `type` covers every message kind Meta can deliver. Only "text" is
 * supported for now (see README.md → "WhatsApp integration" §Media); every
 * other type gets the polite "text only for now" reply instead of being
 * dropped silently.
 */
export interface WhatsAppInboundMessage {
  from?: string; // sender's WhatsApp phone number, no "+" prefix
  id?: string; // WhatsApp message id (wamid...) — used for de-duplication
  timestamp?: string; // unix seconds, as a string
  type?: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contacts" | "interactive" | "button" | "reaction" | "unknown" | string;
  text?: { body?: string };
}

/** Result of parsing one webhook delivery down to "what should we do". */
export type ParsedWhatsAppEvent =
  | { kind: "text"; from: string; whatsappMessageId: string; timestamp: string; text: string }
  | { kind: "unsupported_media"; from: string; whatsappMessageId: string; timestamp: string; mediaType: string }
  | { kind: "ignored" }; // e.g. status callbacks, malformed/empty payloads
