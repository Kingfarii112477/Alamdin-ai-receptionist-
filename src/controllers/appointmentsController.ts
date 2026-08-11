import type { Request, Response } from "express";
import {
  createAppointmentRequest,
  getAppointmentRequestById,
  isValidStatus,
  listAppointmentRequests,
  updateAppointmentStatus
} from "../appointments/appointmentsService";
import { getOrCreateConversation, updateConversation } from "../conversations/conversationsService";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { parseDateExpression, parseTimeExpression } from "../utils/dateTimeParser";
import type { AppointmentStatus } from "../types/conversation";

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, patientName, phone, reason, preferredDate, preferredTime } = req.body as {
    conversationId?: string;
    patientName: string;
    phone: string;
    reason: string;
    preferredDate: string;
    preferredTime: string;
  };

  const date = parseDateExpression(preferredDate);
  if (date.ambiguous || !date.iso) {
    throw new AppError(400, "preferredDate could not be understood — please provide a specific day (e.g. 2026-08-13).");
  }

  const time = parseTimeExpression(preferredTime);
  if (time.ambiguous || !time.label) {
    throw new AppError(400, "preferredTime could not be understood — please clarify AM/PM (e.g. \"8 PM\").");
  }

  const conv = await getOrCreateConversation(conversationId);

  const appointment = await createAppointmentRequest({
    conversationId: conv.id,
    patientName,
    phone,
    reason,
    preferredDateRaw: preferredDate,
    preferredDateISO: date.iso,
    preferredTimeRaw: preferredTime,
    preferredTimeNormalized: time.label
  });

  await updateConversation(conv.id, {
    stage: "REQUEST_SUBMITTED",
    confirmationStatus: "REQUESTED",
    patientName,
    phone,
    reason,
    preferredDateRaw: preferredDate,
    preferredDateISO: date.iso,
    preferredTimeRaw: preferredTime,
    preferredTimeNormalized: time.label
  });

  res.status(201).json(appointment);
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = req.query.status as string | undefined;
  if (statusParam && !isValidStatus(statusParam)) {
    throw new AppError(400, "Invalid status filter");
  }
  const appointments = await listAppointmentRequests(statusParam as AppointmentStatus | undefined);
  res.json(appointments);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: AppointmentStatus };
  const existing = await getAppointmentRequestById(req.params.id);
  if (!existing) throw new AppError(404, "Appointment request not found");

  const updated = await updateAppointmentStatus(req.params.id, status);
  res.json(updated);
});
