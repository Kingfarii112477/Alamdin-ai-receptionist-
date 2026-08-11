import { Router } from "express";
import { getConversation } from "../controllers/conversationsController";

export const conversationsRouter = Router();
conversationsRouter.get("/conversations/:id", getConversation);
