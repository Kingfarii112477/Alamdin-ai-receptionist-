import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./testApp";
import { parseDateExpression, parseTimeExpression } from "../src/utils/dateTimeParser";

async function chat(message: string, conversationId?: string) {
  const res = await request(app).post("/api/v1/chat").send({ conversationId, message });
  expect(res.status).toBe(200);
  return res.body as { conversationId: string; message: string; state: any };
}

describe("Appointment request flow", () => {
  it("walks through the exact spec conversation, one question at a time, and never falsely confirms", async () => {
    const r1 = await chat("Mujhe appointment book karni hai");
    expect(r1.state.stage).toBe("COLLECTING_NAME");
    expect(r1.message.toLowerCase()).toMatch(/naam/);
    // Only one question asked — no other field names mentioned yet.
    expect(r1.message).not.toMatch(/phone|number/i);

    const cid = r1.conversationId;

    const r2 = await chat("Ahmed", cid);
    expect(r2.state.stage).toBe("COLLECTING_PHONE");
    expect(r2.state.name).toBe("Ahmed");
    expect(r2.message.toLowerCase()).toMatch(/phone number/);

    const r3 = await chat("03301234567", cid);
    expect(r3.state.stage).toBe("COLLECTING_REASON");
    expect(r3.state.phone).toBe("03301234567");
    expect(r3.message.toLowerCase()).toMatch(/wajah|reason/);

    const r4 = await chat("Daant mein dard hai", cid);
    expect(r4.state.stage).toBe("COLLECTING_DATE");
    expect(r4.state.reason).toBe("Daant mein dard hai");
    expect(r4.message.toLowerCase()).toMatch(/din|date/);

    const r5 = await chat("Kal", cid);
    expect(r5.state.stage).toBe("COLLECTING_TIME");
    const expectedDate = parseDateExpression("Kal").iso;
    expect(r5.state.preferredDate).toBe(expectedDate);
    expect(r5.message.toLowerCase()).toMatch(/waqt|time/);

    const r6 = await chat("8 baje", cid);
    expect(r6.state.stage).toBe("CONFIRMING_SUMMARY");
    const expectedTime = parseTimeExpression("8 baje").label;
    expect(expectedTime).toBe("8:00 PM");
    expect(r6.state.preferredTime).toBe("8:00 PM");
    expect(r6.message).toContain("Ahmed");
    expect(r6.message).toContain("03301234567");
    expect(r6.message).toContain("Daant mein dard hai");
    expect(r6.message).toContain("8:00 PM");
    expect(r6.message.toLowerCase()).toMatch(/correct/);

    const r7 = await chat("Yes", cid);
    expect(r7.state.stage).toBe("REQUEST_SUBMITTED");
    expect(r7.message).not.toMatch(/appointment confirmed/i);
    expect(r7.message).toMatch(/request/i);
    expect(r7.message).toMatch(/not.*confirmed appointment|nahi.*confirmed/i);

    // Verify the AppointmentRequest was actually created with status NEW.
    const list = await request(app).get("/api/v1/appointments").set("X-Admin-Key", "test-admin-key");
    expect(list.status).toBe(200);
    const created = list.body.find((a: any) => a.conversationId === cid);
    expect(created).toBeTruthy();
    expect(created.status).toBe("NEW");
    expect(created.patientName).toBe("Ahmed");
  });

  it("remembers already-provided fields and does not ask again", async () => {
    const r1 = await chat("Mujhe appointment chahiye");
    const cid = r1.conversationId;
    const r2 = await chat("Bilal", cid);
    expect(r2.state.name).toBe("Bilal");

    // Patient answers phone; name must not be asked again anywhere downstream.
    const r3 = await chat("03211112222", cid);
    expect(r3.state.name).toBe("Bilal");
    expect(r3.message.toLowerCase()).not.toMatch(/naam|name/);
  });

  it("rejects an invalid phone number and re-asks instead of advancing", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Sara", cid);
    const r2 = await chat("abc", cid);
    expect(r2.state.stage).toBe("COLLECTING_PHONE");
    expect(r2.message.toLowerCase()).toMatch(/valid phone|number/);
  });

  it("asks for clarification on an ambiguous date instead of guessing", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Zain", cid);
    await chat("03001112222", cid);
    await chat("checkup", cid);
    const r = await chat("jald hi", cid);
    expect(r.state.stage).toBe("COLLECTING_DATE");
  });

  it("creates only a NEW appointment status, never CONFIRMED_BY_CLINIC, from the AI flow", async () => {
    const r1 = await chat("book an appointment");
    const cid = r1.conversationId;
    await chat("Nadia", cid);
    await chat("03451234567", cid);
    await chat("cleaning", cid);
    await chat("13 August", cid);
    const timeRes = await chat("9 pm", cid);
    expect(timeRes.state.stage).toBe("CONFIRMING_SUMMARY");
    const confirmRes = await chat("haan bilkul theek hai", cid);
    expect(confirmRes.state.stage).toBe("REQUEST_SUBMITTED");

    const list = await request(app).get("/api/v1/appointments").set("X-Admin-Key", "test-admin-key");
    const created = list.body.find((a: any) => a.conversationId === cid);
    expect(created.status).toBe("NEW");
  });

  it("allows cancelling an in-progress appointment request", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ali", cid);
    const r = await chat("cancel", cid);
    expect(r.state.stage).toBe("IDLE");
    expect(r.state.phone).toBeNull();
  });
});
