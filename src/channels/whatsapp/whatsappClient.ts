import { env } from "../../config/env";
import { logger } from "../../utils/logger";

/**
 * Sends one outbound text message through the WhatsApp Business Cloud API.
 * Never throws — a delivery failure is logged (without the access token)
 * and swallowed, matching the brief's "never crash the application, never
 * expose the access token" requirement. The caller can't do anything useful
 * with a failed send anyway (there's no synchronous retry channel back to
 * the patient), so surfacing it as a thrown error would only risk a 500
 * back to Meta, which then just retries the whole webhook delivery.
 */
export async function sendWhatsAppTextMessage(to: string, body: string): Promise<boolean> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn("WhatsApp send skipped — WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID not configured");
    return false;
  }

  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: false }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      // Body may contain Meta's error details but never the access token
      // (that's a request header, not part of the response body).
      const errorBody = await res.text().catch(() => "");
      logger.error({ status: res.status, errorBody }, "WhatsApp Cloud API send failed");
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err }, "WhatsApp Cloud API send threw");
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
