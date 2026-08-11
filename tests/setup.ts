import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/database/prisma";

beforeEach(async () => {
  // Conversation deletion cascades to Message and AppointmentRequest.
  await prisma.conversation.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
