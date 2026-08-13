import { env } from "../../config/env";

/**
 * Meta's one-time webhook verification handshake
 * (GET /api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...).
 * Returns the challenge string to echo back with 200, or null if Meta
 * should be refused (wrong/missing token, or the token isn't configured at
 * all yet — fails closed rather than accepting anything).
 */
export function verifyWhatsAppWebhook(query: Record<string, unknown>): string | null {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (!env.WHATSAPP_VERIFY_TOKEN) return null;
  if (mode !== "subscribe") return null;
  if (typeof token !== "string" || token !== env.WHATSAPP_VERIFY_TOKEN) return null;
  if (typeof challenge !== "string") return null;

  return challenge;
}
