import { prisma } from "../../database/prisma";
import type { Language } from "../../types/conversation";

/**
 * Returns the existing Conversation id for this WhatsApp number, or creates
 * both a new channel="whatsapp" Conversation and the WhatsAppContact row
 * mapping the number to it. Either way, the caller then drives the reply
 * through the same `processMessage()` the web chat uses — this function's
 * only job is "which conversation does this phone number belong to".
 *
 * A unique constraint on `phoneNumber` makes a concurrent double-create
 * (two webhook deliveries for a brand-new number arriving at once) resolve
 * safely: the loser's insert fails, and it re-reads the winner's row.
 */
export async function getOrCreateConversationIdForPhoneNumber(phoneNumber: string): Promise<string> {
  const existing = await prisma.whatsAppContact.findUnique({ where: { phoneNumber } });
  if (existing) return existing.conversationId;

  const conversation = await prisma.conversation.create({ data: { channel: "whatsapp" } });

  try {
    await prisma.whatsAppContact.create({ data: { phoneNumber, conversationId: conversation.id } });
    return conversation.id;
  } catch {
    // Lost a race with another delivery for the same number — the other
    // request's conversation is the one of record; use it instead, and
    // leave the orphaned conversation we just created (harmless, empty).
    const winner = await prisma.whatsAppContact.findUnique({ where: { phoneNumber } });
    if (winner) return winner.conversationId;
    throw new Error("Failed to resolve a WhatsApp conversation mapping");
  }
}

/** Best-effort lookup of a returning contact's last known conversation language, for the one message type (unsupported media) that has no text to detect a language from. */
export async function getKnownLanguageForPhoneNumber(phoneNumber: string): Promise<Language | null> {
  const contact = await prisma.whatsAppContact.findUnique({ where: { phoneNumber } });
  if (!contact) return null;
  const conversation = await prisma.conversation.findUnique({ where: { id: contact.conversationId } });
  return (conversation?.language as Language) ?? null;
}

/**
 * Idempotency guard. Returns true (and records the id) the first time a
 * given WhatsApp message id is seen; returns false on every redelivery, so
 * the caller can skip reprocessing it. Meta redelivers webhooks it didn't
 * get a fast 200 for, so this is expected to trigger in normal operation,
 * not just under failure.
 */
export async function claimWhatsAppMessageId(whatsappMessageId: string): Promise<boolean> {
  const alreadySeen = await prisma.whatsAppProcessedMessage.findUnique({ where: { whatsappMessageId } });
  if (alreadySeen) return false;

  try {
    await prisma.whatsAppProcessedMessage.create({ data: { whatsappMessageId } });
    return true;
  } catch {
    // Lost a race with a near-simultaneous redelivery of the same id.
    return false;
  }
}
