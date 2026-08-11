import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./testApp";

describe("POST /api/v1/chat validation", () => {
  it("rejects an empty message", async () => {
    const res = await request(app).post("/api/v1/chat").send({ message: "" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing message field", async () => {
    const res = await request(app).post("/api/v1/chat").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/conversations/:id", () => {
  it("returns 404 for an unknown conversation", async () => {
    const res = await request(app).get("/api/v1/conversations/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns the conversation with its message history", async () => {
    const chatRes = await request(app).post("/api/v1/chat").send({ message: "Hello" });
    const cid = chatRes.body.conversationId;

    const res = await request(app).get(`/api/v1/conversations/${cid}`);
    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe(cid);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Appointments API", () => {
  it("creates an appointment request directly via POST /api/v1/appointments", async () => {
    const res = await request(app).post("/api/v1/appointments").send({
      patientName: "Hina",
      phone: "03009998888",
      reason: "Root canal follow-up",
      preferredDate: "2026-08-20",
      preferredTime: "9 pm"
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("NEW");
    expect(res.body.preferredDateISO).toBe("2026-08-20");
    expect(res.body.preferredTimeNormalized).toBe("9:00 PM");
  });

  it("rejects an unparseable preferredDate", async () => {
    const res = await request(app).post("/api/v1/appointments").send({
      patientName: "Hina",
      phone: "03009998888",
      reason: "Root canal follow-up",
      preferredDate: "whenever",
      preferredTime: "9 pm"
    });
    expect(res.status).toBe(400);
  });

  it("requires an admin key to list appointments", async () => {
    const res = await request(app).get("/api/v1/appointments");
    expect(res.status).toBe(401);
  });

  it("rejects the wrong admin key", async () => {
    const res = await request(app).get("/api/v1/appointments").set("X-Admin-Key", "wrong-key");
    expect(res.status).toBe(401);
  });

  it("lists appointments with the correct admin key", async () => {
    await request(app).post("/api/v1/appointments").send({
      patientName: "Omar",
      phone: "03211234567",
      reason: "Checkup",
      preferredDate: "2026-09-01",
      preferredTime: "8 pm"
    });
    const res = await request(app).get("/api/v1/appointments").set("X-Admin-Key", "test-admin-key");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("requires an admin key to update appointment status", async () => {
    const create = await request(app).post("/api/v1/appointments").send({
      patientName: "Sami",
      phone: "03451112222",
      reason: "Cleaning",
      preferredDate: "2026-09-02",
      preferredTime: "8 pm"
    });
    const res = await request(app).post(`/api/v1/appointments/${create.body.id}/status`).send({ status: "CONFIRMED_BY_CLINIC" });
    expect(res.status).toBe(401);
  });

  it("allows staff to update appointment status with the admin key", async () => {
    const create = await request(app).post("/api/v1/appointments").send({
      patientName: "Sami",
      phone: "03451112222",
      reason: "Cleaning",
      preferredDate: "2026-09-02",
      preferredTime: "8 pm"
    });
    const res = await request(app)
      .post(`/api/v1/appointments/${create.body.id}/status`)
      .set("X-Admin-Key", "test-admin-key")
      .send({ status: "CONFIRMED_BY_CLINIC" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CONFIRMED_BY_CLINIC");
  });

  it("rejects an invalid status value", async () => {
    const create = await request(app).post("/api/v1/appointments").send({
      patientName: "Sami",
      phone: "03451112222",
      reason: "Cleaning",
      preferredDate: "2026-09-02",
      preferredTime: "8 pm"
    });
    const res = await request(app)
      .post(`/api/v1/appointments/${create.body.id}/status`)
      .set("X-Admin-Key", "test-admin-key")
      .send({ status: "NOT_A_REAL_STATUS" });
    expect(res.status).toBe(400);
  });
});
