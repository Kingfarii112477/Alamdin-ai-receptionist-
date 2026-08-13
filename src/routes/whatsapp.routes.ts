import { Router } from "express";
import { receiveWebhook, verifyWebhook } from "../controllers/whatsappWebhookController";

export const whatsappRouter = Router();
whatsappRouter.get("/webhooks/whatsapp", verifyWebhook);
whatsappRouter.post("/webhooks/whatsapp", receiveWebhook);
