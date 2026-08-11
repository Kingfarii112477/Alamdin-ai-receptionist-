-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "language" TEXT NOT NULL DEFAULT 'english',
    "stage" TEXT NOT NULL DEFAULT 'IDLE',
    "patientName" TEXT,
    "phone" TEXT,
    "reason" TEXT,
    "preferredDateRaw" TEXT,
    "preferredDateISO" TEXT,
    "preferredTimeRaw" TEXT,
    "preferredTimeNormalized" TEXT,
    "confirmationStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "preferredDateRaw" TEXT NOT NULL,
    "preferredDateISO" TEXT NOT NULL,
    "preferredTimeRaw" TEXT NOT NULL,
    "preferredTimeNormalized" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentRequest_status_idx" ON "AppointmentRequest"("status");

-- CreateIndex
CREATE INDEX "AppointmentRequest_createdAt_idx" ON "AppointmentRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

