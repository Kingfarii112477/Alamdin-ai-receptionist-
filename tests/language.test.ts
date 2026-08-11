import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./testApp";

async function chat(message: string, conversationId?: string) {
  const res = await request(app).post("/api/v1/chat").send({ conversationId, message });
  expect(res.status).toBe(200);
  return res.body as { conversationId: string; message: string; state: any };
}

describe("Multilingual support", () => {
  it("responds in Roman Urdu when the patient writes Roman Urdu", async () => {
    const res = await chat("Mujhe appointment book karni hai");
    expect(res.message).toMatch(/naam/i);
    expect(res.message).not.toMatch(/[؀-ۿ]/); // no Urdu script
  });

  it("responds in Urdu script when the patient writes Urdu script", async () => {
    const res = await chat("مجھے اپائنٹمنٹ بک کروانی ہے");
    expect(res.message).toMatch(/[؀-ۿ]/);
  });

  it("responds in English when the patient writes English", async () => {
    const res = await chat("I would like to book an appointment please");
    expect(res.message).toMatch(/what's your name|name/i);
  });

  it("keeps replying in Urdu script through a multi-turn conversation", async () => {
    const r1 = await chat("اپائنٹمنٹ چاہیے");
    const cid = r1.conversationId;
    expect(r1.message).toMatch(/[؀-ۿ]/);
    const r2 = await chat("احمد", cid);
    expect(r2.message).toMatch(/[؀-ۿ]/);
  });
});
