import { z } from "zod";

export const chatSchema = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  message: z.string().min(1, "message is required").max(2000, "message is too long")
});

export const createAppointmentSchema = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  patientName: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  reason: z.string().min(2).max(300),
  preferredDate: z.string().min(1).max(100),
  preferredTime: z.string().min(1).max(100)
});

export const appointmentStatusSchema = z.object({
  status: z.enum(["NEW", "PENDING_CONFIRMATION", "CONFIRMED_BY_CLINIC", "CANCELLED", "COMPLETED"])
});
