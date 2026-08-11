export type Language = "english" | "urdu" | "roman-urdu";

/**
 * Appointment intake state machine. IDLE/GENERAL handle info questions and
 * small talk. COLLECTING_* walk through the five required fields one at a
 * time. CONFIRMING_SUMMARY shows the recap and waits for yes/no/edit.
 * REQUEST_SUBMITTED is a terminal state for that request (a new one can
 * still be started later in the same conversation).
 */
export type Stage =
  | "IDLE"
  | "COLLECTING_NAME"
  | "COLLECTING_PHONE"
  | "COLLECTING_REASON"
  | "COLLECTING_DATE"
  | "COLLECTING_TIME"
  | "CONFIRMING_SUMMARY"
  | "AWAITING_EDIT_FIELD"
  | "REQUEST_SUBMITTED";

export type ConfirmationStatus = "NOT_APPLICABLE" | "PENDING" | "REQUESTED";

export type AppointmentStatus =
  | "NEW"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED_BY_CLINIC"
  | "CANCELLED"
  | "COMPLETED";

export interface ConversationStateDTO {
  stage: Stage;
  name: string | null;
  phone: string | null;
  reason: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
}

export interface ChatRequestBody {
  conversationId?: string;
  message: string;
}

export interface ChatResponseBody {
  conversationId: string;
  message: string;
  state: ConversationStateDTO;
}
