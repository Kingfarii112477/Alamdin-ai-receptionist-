-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppProcessedMessage" (
    "id" TEXT NOT NULL,
    "whatsappMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppProcessedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_phoneNumber_key" ON "WhatsAppContact"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_conversationId_key" ON "WhatsAppContact"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppProcessedMessage_whatsappMessageId_key" ON "WhatsAppProcessedMessage"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppProcessedMessage_createdAt_idx" ON "WhatsAppProcessedMessage"("createdAt");
