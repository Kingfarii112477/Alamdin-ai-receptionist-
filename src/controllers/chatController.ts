import type { Request, Response } from "express";
import { processMessage } from "../receptionist/ReceptionistEngine";
import { asyncHandler } from "../middleware/errorHandler";

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, message } = req.body as { conversationId?: string; message: string };
  const result = await processMessage(conversationId, message);
  res.json(result);
});
