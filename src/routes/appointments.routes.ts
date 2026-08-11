import { Router } from "express";
import { createAppointment, listAppointments, updateStatus } from "../controllers/appointmentsController";
import { adminAuth } from "../middleware/adminAuth";
import { validateBody } from "../middleware/validate";
import { appointmentStatusSchema, createAppointmentSchema } from "../types/schemas";

export const appointmentsRouter = Router();

appointmentsRouter.post("/appointments", validateBody(createAppointmentSchema), createAppointment);
appointmentsRouter.get("/appointments", adminAuth, listAppointments);
appointmentsRouter.post("/appointments/:id/status", adminAuth, validateBody(appointmentStatusSchema), updateStatus);
