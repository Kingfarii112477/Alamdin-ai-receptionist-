import type { Request, Response } from "express";
import { handleWhatsAppWebhookPayload } from "../channels/whatsapp/whatsappAdapter";
import { verifyWhatsAppWebhook } from "../channels/whatsapp/webhookVerification";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

/** GET /api/v1/webhooks/whatsapp — Meta's one-time subscription handshake. */
export const verifyWebhook = (req: Request, res: Response) => {
  const challenge = verifyWhatsAppWebhook(req.query as Record<string, unknown>);
  if (challenge === null) {
    res.status(403).json({ error: "Verification failed" });
    return;
  }
  res.status(200).send(challenge);
};

/**
 * POST /api/v1/webhooks/whatsapp — incoming message delivery.
 *
 * Always acknowledges with 200 once the payload has been handled, even if
 * handling itself failed internally (a bad AI response, a transient
 * WhatsApp API error, etc. are already handled/logged further down the
 * pipeline). A non-200 here makes Meta retry the same delivery repeatedly,
 * which would just resend a message we already understood, not fix
 * whatever went wrong.
 */
export const receiveWebhook = asyncHandler(async (req: Request, res: Response) => {
  try {
    await handleWhatsAppWebhookPayload(req.body);
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook processing failed");
  }
  res.status(200).json({ received: true });
});
