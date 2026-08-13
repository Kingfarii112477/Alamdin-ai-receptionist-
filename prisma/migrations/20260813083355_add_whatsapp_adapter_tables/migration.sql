-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsAppProcessedMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "whatsappMessageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_phoneNumber_key" ON "WhatsAppContact"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_conversationId_key" ON "WhatsAppContact"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppProcessedMessage_whatsappMessageId_key" ON "WhatsAppProcessedMessage"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppProcessedMessage_createdAt_idx" ON "WhatsAppProcessedMessage"("createdAt");
