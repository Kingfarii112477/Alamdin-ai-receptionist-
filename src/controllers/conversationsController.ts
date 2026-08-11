import type { Request, Response } from "express";
import { getConversationById } from "../conversations/conversationsService";
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const conv = await getConversationById(req.params.id);
  if (!conv) throw new AppError(404, "Conversation not found");

  res.json({
    conversationId: conv.id,
    channel: conv.channel,
    language: conv.language,
    state: {
      stage: conv.stage,
      name: conv.patientName,
      phone: conv.phone,
      reason: conv.reason,
      preferredDate: conv.preferredDateISO,
      preferredTime: conv.preferredTimeNormalized
    },
    messages: conv.messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
    appointmentRequests: conv.appointmentRequests,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
  });
});
