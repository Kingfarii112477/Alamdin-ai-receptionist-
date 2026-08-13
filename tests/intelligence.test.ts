import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./testApp";

async function chat(message: string, conversationId?: string) {
  const res = await request(app).post("/api/v1/chat").send({ conversationId, message });
  expect(res.status).toBe(200);
  return res.body as { conversationId: string; message: string; state: any };
}

describe("Smart slot extraction — multiple fields in one message", () => {
  it("extracts name, reason, date, and time from a single trigger message, asking only for what's missing", async () => {
    const r = await chat("Mera naam Ahmed hai aur mujhe kal 8 baje toothache ke liye appointment chahiye.");
    expect(r.state.name).toBe("Ahmed");
    expect(r.state.reason).toBe("toothache");
    expect(r.state.preferredTime).toBe("8:00 PM");
    expect(r.state.stage).toBe("COLLECTING_PHONE");
    // Never re-asks for a field already given.
    expect(r.message.toLowerCase()).not.toMatch(/naam|name/);
  });

  it("still asks one field at a time when nothing extra was volunteered", async () => {
    const r = await chat("doctor se milna hai");
    expect(r.state.stage).toBe("COLLECTING_NAME");
    expect(r.message).not.toMatch(/phone|reason|date|time/i);
  });
});

describe("Correction intelligence", () => {
  it("updates the name when corrected at CONFIRMING_SUMMARY, without re-asking for it", async () => {
    const r1 = await chat("Mujhe appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    await chat("03301234567", cid);
    await chat("checkup", cid);
    await chat("kal", cid);
    const atSummary = await chat("8 baje", cid);
    expect(atSummary.state.stage).toBe("CONFIRMING_SUMMARY");

    const corrected = await chat("Nahi mera naam Muhammad Farooq hai", cid);
    expect(corrected.state.name).toBe("Muhammad Farooq");
    expect(corrected.state.stage).toBe("CONFIRMING_SUMMARY");
    expect(corrected.message).toContain("Muhammad Farooq");
    expect(corrected.message.toLowerCase()).not.toMatch(/what's your name|aapka naam kya hai/);
  });

  it("corrects a different field mid-collection without losing the current question", async () => {
    const r1 = await chat("appointment leni hai");
    const cid = r1.conversationId;
    const afterName = await chat("Ahmed", cid);
    expect(afterName.state.stage).toBe("COLLECTING_PHONE");

    const corrected = await chat("actually mera naam Bilal hai", cid);
    expect(corrected.state.name).toBe("Bilal");
    // Phone still wasn't answered — stays on the same question.
    expect(corrected.state.stage).toBe("COLLECTING_PHONE");
    expect(corrected.message.toLowerCase()).toMatch(/phone number/);
  });

  it("corrects a phone number given as 'actually number ye hai ...'", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Sara", cid);
    await chat("03001112222", cid);
    const corrected = await chat("actually number ye hai 0300 9998888", cid);
    expect(corrected.state.phone).toBe("03009998888");
  });

  it("resolves 'reason X nahi Y hai' to the new reason", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Sara", cid);
    await chat("03001112222", cid);
    await chat("cleaning", cid);
    const corrected = await chat("reason cleaning nahi checkup hai", cid);
    expect(corrected.state.reason).toBe("checkup");
  });

  it("resolves 'kal nahi parson' to the day after tomorrow, not tomorrow", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Sara", cid);
    await chat("03001112222", cid);
    await chat("cleaning", cid);
    const withKal = await chat("kal", cid);
    const kalIso = withKal.state.preferredDate;
    const corrected = await chat("sorry, kal nahi parson", cid);
    expect(corrected.state.preferredDate).not.toBe(kalIso);
  });

  it("resolves '8 nahi 9 baje' to 9 PM, not 8 PM", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Sara", cid);
    await chat("03001112222", cid);
    await chat("cleaning", cid);
    await chat("kal", cid);
    const withTime = await chat("8 baje", cid);
    expect(withTime.state.preferredTime).toBe("8:00 PM");
    const corrected = await chat("8 nahi 9 baje", cid);
    expect(corrected.state.preferredTime).toBe("9:00 PM");
  });

  it("never mishandles a plain single-word answer as a correction (no regression)", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    const r2 = await chat("Ahmed", cid);
    expect(r2.state.name).toBe("Ahmed");
    expect(r2.state.stage).toBe("COLLECTING_PHONE");
  });
});

describe("Context memory — never re-asks an already-known field", () => {
  it("remembers name across several turns and never re-asks it", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    const r3 = await chat("03301234567", cid);
    expect(r3.message.toLowerCase()).not.toMatch(/naam|name/);
    const r4 = await chat("Daant mein dard hai", cid);
    expect(r4.message.toLowerCase()).not.toMatch(/naam|name|phone/);
  });
});

describe("Smart date understanding", () => {
  async function toDateStage(): Promise<{ cid: string }> {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Zain", cid);
    await chat("03211234567", cid);
    await chat("checkup", cid);
    return { cid };
  }

  it("understands 'parson' as two days from now", async () => {
    const { cid } = await toDateStage();
    const r = await chat("parson", cid);
    expect(r.state.stage).toBe("COLLECTING_TIME");
    expect(r.state.preferredDate).toBeTruthy();
  });

  it("understands 'next Monday' and resolves to a real date", async () => {
    const { cid } = await toDateStage();
    const r = await chat("next Monday", cid);
    expect(r.state.stage).toBe("COLLECTING_TIME");
    const day = new Date(`${r.state.preferredDate}T00:00:00Z`).getUTCDay();
    expect(day).toBe(1); // Monday
  });

  it("stays ambiguous rather than guessing for a vague expression", async () => {
    const { cid } = await toDateStage();
    const r = await chat("aglay hafte", cid);
    expect(r.state.stage).toBe("COLLECTING_DATE");
  });
});

describe("Smart time understanding", () => {
  async function toTimeStage(): Promise<{ cid: string }> {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Zain", cid);
    await chat("03211234567", cid);
    await chat("checkup", cid);
    await chat("kal", cid);
    return { cid };
  }

  it("understands explicit 24-hour format", async () => {
    const { cid } = await toTimeStage();
    const r = await chat("20:00", cid);
    expect(r.state.preferredTime).toBe("8:00 PM");
  });

  it("understands 'raat ko 9'", async () => {
    const { cid } = await toTimeStage();
    const r = await chat("raat ko 9", cid);
    expect(r.state.preferredTime).toBe("9:00 PM");
  });

  it("asks a clarifying question for a genuinely ambiguous hour, never guessing", async () => {
    const { cid } = await toTimeStage();
    const r = await chat("3 baje", cid);
    expect(r.state.stage).toBe("COLLECTING_TIME");
    expect(r.message).toMatch(/am or pm|subah ya shaam|subah ya raat/i);
  });
});

describe("Multi-intent handling — FAQ answered without losing appointment state", () => {
  it("answers the fee question and still asks for the next appointment field", async () => {
    const r = await chat("Appointment kal chahiye, waise consultation fee kitni hai?");
    expect(r.message).toContain("500");
    expect(r.state.stage).toBe("COLLECTING_NAME");
  });

  it("answers a location question mid-collection and still records the date being answered", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    await chat("03301234567", cid);
    await chat("checkup", cid);
    const r2 = await chat("kal, waise clinic kahan hai?", cid);
    expect(r2.message).toMatch(/Zain Business Center|Zarghoon/);
    expect(r2.state.stage).toBe("COLLECTING_TIME");
    expect(r2.state.preferredDate).toBeTruthy();
  });
});

describe("Confirmation and rejection intelligence", () => {
  async function toSummary(): Promise<{ cid: string }> {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    await chat("03301234567", cid);
    await chat("checkup", cid);
    await chat("kal", cid);
    await chat("8 baje", cid);
    return { cid };
  }

  it.each(["haan", "ji", "jee", "theek hai", "bilkul", "confirm", "book kar dein"])(
    "understands '%s' as confirmation once a summary has been shown",
    async (word) => {
      const { cid } = await toSummary();
      const r = await chat(word, cid);
      expect(r.state.stage).toBe("REQUEST_SUBMITTED");
      expect(r.message).not.toMatch(/appointment confirmed/i);
    }
  );

  it.each(["nahi", "wait", "rukain"])("understands '%s' as rejection, moving to edit", async (word) => {
    const { cid } = await toSummary();
    const r = await chat(word, cid);
    expect(r.state.stage).toBe("AWAITING_EDIT_FIELD");
  });
});

describe("Human handoff", () => {
  it.each(["doctor se baat karni hai", "staff se baat karwa dein", "I want to speak to someone"])(
    "responds with clinic contact info for '%s' without pretending a human was contacted",
    async (msg) => {
      const r = await chat(msg);
      expect(r.message).toMatch(/0330-3786289/);
      expect(r.message.toLowerCase()).not.toMatch(/connected you|i have contacted|transferring you now/);
    }
  );
});

describe("Expanded emergency safety", () => {
  it.each(["severe facial swelling", "difficulty breathing", "uncontrolled bleeding", "mera daant toot gaya hai"])(
    "gives urgent-care guidance for '%s' without diagnosing or claiming emergency services were contacted",
    async (msg) => {
      const r = await chat(msg);
      expect(r.message).toMatch(/urgent|foran/i);
      expect(r.message.toLowerCase()).not.toMatch(/ambulance (has been|is on)|dispatched|i have called/);
    }
  );
});

describe("Typo tolerance", () => {
  it("still triggers the appointment flow for a misspelled 'apointment'", async () => {
    const r = await chat("mujhe apointment chahiye");
    expect(r.state.stage).toBe("COLLECTING_NAME");
  });
});

describe("Mixed Urdu + English and Roman Urdu phrasing", () => {
  it.each(["doctor se milna hai", "checkup karwana hai", "mere tooth mein pain hai"])(
    "recognizes '%s' as wanting an appointment",
    async (msg) => {
      const r = await chat(msg);
      expect(r.state.stage).toBe("COLLECTING_NAME");
    }
  );
});

describe("Services intent — deterministic, sourced only from clinic data", () => {
  it("answers a root canal / implants question from doctor qualifications, not an invented catalog", async () => {
    const r = await chat("kya aap root canal karte hain?");
    expect(r.message).toMatch(/root canal/i);
    expect(r.message).toContain("C-Endo");
  });
});

describe("Database safety — no duplicate appointment requests", () => {
  it("does not create a second appointment request from a repeated confirmation after submission", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    await chat("03301234567", cid);
    await chat("checkup", cid);
    await chat("kal", cid);
    await chat("8 baje", cid);
    const submitted = await chat("haan", cid);
    expect(submitted.state.stage).toBe("REQUEST_SUBMITTED");

    await chat("haan", cid); // repeated confirmation after already submitted
    await chat("haan", cid);

    const list = await request(app).get("/api/v1/appointments").set("X-Admin-Key", "test-admin-key");
    const forThisConversation = list.body.filter((a: any) => a.conversationId === cid);
    expect(forThisConversation.length).toBe(1);
  });

  it("never produces the phrase 'Appointment Confirmed' anywhere in a full booking flow", async () => {
    const r1 = await chat("Mera naam Hina hai aur mujhe kal 9 baje cleaning ke liye appointment chahiye.");
    const cid = r1.conversationId;
    const messages = [r1.message];
    messages.push((await chat("03211234567", cid)).message);
    const confirmMsg = await chat("haan bilkul", cid);
    messages.push(confirmMsg.message);
    for (const m of messages) {
      expect(m).not.toMatch(/appointment confirmed/i);
    }
    expect(confirmMsg.state.stage).toBe("REQUEST_SUBMITTED");
  });
});

describe("Unknown input recovery", () => {
  it("interprets 'haan kal' contextually at CONFIRMING_SUMMARY as a date correction, not a blind confirm", async () => {
    const r1 = await chat("appointment chahiye");
    const cid = r1.conversationId;
    await chat("Ahmed", cid);
    await chat("03301234567", cid);
    await chat("checkup", cid);
    await chat("parson", cid);
    const atSummary = await chat("9 baje", cid);
    expect(atSummary.state.stage).toBe("CONFIRMING_SUMMARY");
    const parsonIso = atSummary.state.preferredDate;

    const r = await chat("haan kal", cid);
    // Treated as an explicit date correction (kal), not an accidental confirm.
    expect(r.state.preferredDate).not.toBe(parsonIso);
    expect(r.state.stage).toBe("CONFIRMING_SUMMARY");
  });
});
