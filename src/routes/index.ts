import { Router } from "express";
import { appointmentsRouter } from "./appointments.routes";
import { chatRouter } from "./chat.routes";
import { conversationsRouter } from "./conversations.routes";
import { healthRouter } from "./health.routes";

export const apiV1Router = Router();
apiV1Router.use(chatRouter);
apiV1Router.use(conversationsRouter);
apiV1Router.use(appointmentsRouter);

export { healthRouter };
