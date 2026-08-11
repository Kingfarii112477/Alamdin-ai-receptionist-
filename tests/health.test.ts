import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./testApp";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("alamdin-ai-receptionist");
  });
});
