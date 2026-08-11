import { prisma } from "../database/prisma";
import type { AppointmentStatus } from "../types/conversation";

export interface CreateAppointmentRequestInput {
  conversationId: string;
  patientName: string;
  phone: string;
  reason: string;
  preferredDateRaw: string;
  preferredDateISO: string;
  preferredTimeRaw: string;
  preferredTimeNormalized: string;
}

/**
 * Creates an appointment REQUEST. Always starts at status "NEW" — the AI
 * engine must never write CONFIRMED_BY_CLINIC or any other status; only
 * clinic staff do that via the admin status-update endpoint.
 */
export async function createAppointmentRequest(input: CreateAppointmentRequestInput) {
  return prisma.appointmentRequest.create({
    data: { ...input, status: "NEW" satisfies AppointmentStatus }
  });
}

export async function listAppointmentRequests(status?: AppointmentStatus) {
  return prisma.appointmentRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" }
  });
}

export async function getAppointmentRequestById(id: string) {
  return prisma.appointmentRequest.findUnique({ where: { id } });
}

const VALID_STATUSES: AppointmentStatus[] = ["NEW", "PENDING_CONFIRMATION", "CONFIRMED_BY_CLINIC", "CANCELLED", "COMPLETED"];

export function isValidStatus(status: string): status is AppointmentStatus {
  return (VALID_STATUSES as string[]).includes(status);
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return prisma.appointmentRequest.update({ where: { id }, data: { status } });
}
