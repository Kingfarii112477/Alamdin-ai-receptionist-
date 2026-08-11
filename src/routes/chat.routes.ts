import { Router } from "express";
import { chat } from "../controllers/chatController";
import { validateBody } from "../middleware/validate";
import { chatSchema } from "../types/schemas";

export const chatRouter = Router();
chatRouter.post("/chat", validateBody(chatSchema), chat);
