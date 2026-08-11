import type { Conversation } from "@prisma/client";
import { prisma } from "../database/prisma";

export async function getOrCreateConversation(conversationId?: string): Promise<Conversation> {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (existing) return existing;
  }
  return prisma.conversation.create({ data: {} });
}

export async function getConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } }, appointmentRequests: true }
  });
}

export async function addMessage(conversationId: string, role: "user" | "assistant" | "system", content: string) {
  return prisma.message.create({ data: { conversationId, role, content } });
}

export async function recentHistory(conversationId: string, limit = 10) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return messages.reverse();
}

export type ConversationUpdate = Partial<{
  language: string;
  stage: string;
  patientName: string | null;
  phone: string | null;
  reason: string | null;
  preferredDateRaw: string | null;
  preferredDateISO: string | null;
  preferredTimeRaw: string | null;
  preferredTimeNormalized: string | null;
  confirmationStatus: string;
}>;

export async function updateConversation(conversationId: string, data: ConversationUpdate): Promise<Conversation> {
  return prisma.conversation.update({ where: { id: conversationId }, data });
}
