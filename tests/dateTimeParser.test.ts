import { describe, expect, it } from "vitest";
import { nowInKarachi, parseDateExpression, parseTimeExpression } from "../src/utils/dateTimeParser";

function addDays(base: { year: number; month: number; day: number }, days: number) {
  const d = new Date(Date.UTC(base.year, base.month - 1, base.day));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function toISO({ year, month, day }: { year: number; month: number; day: number }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("parseDateExpression", () => {
  it("resolves 'kal' to tomorrow", () => {
    const now = nowInKarachi();
    const r = parseDateExpression("Kal");
    expect(r.ambiguous).toBe(false);
    expect(r.iso).toBe(toISO(addDays(now, 1)));
  });

  it("resolves 'aaj' / 'today' to today", () => {
    const now = nowInKarachi();
    expect(parseDateExpression("aaj").iso).toBe(toISO(now));
    expect(parseDateExpression("today").iso).toBe(toISO(now));
  });

  it("resolves 'parso' to two days from now", () => {
    const now = nowInKarachi();
    expect(parseDateExpression("parso").iso).toBe(toISO(addDays(now, 2)));
  });

  it("parses explicit '13 August' dates", () => {
    const r = parseDateExpression("13 August");
    expect(r.ambiguous).toBe(false);
    expect(r.iso?.endsWith("-08-13")).toBe(true);
  });

  it("parses 'August 13' dates", () => {
    const r = parseDateExpression("August 13");
    expect(r.iso?.endsWith("-08-13")).toBe(true);
  });

  it("parses ISO dates directly", () => {
    const r = parseDateExpression("2026-08-13");
    expect(r.iso).toBe("2026-08-13");
  });

  it("returns ambiguous:true for vague expressions instead of guessing", () => {
    const r = parseDateExpression("jald hi");
    expect(r.ambiguous).toBe(true);
    expect(r.iso).toBeNull();
  });

  it("resolves a weekday name to its next occurrence", () => {
    const r = parseDateExpression("Friday");
    expect(r.ambiguous).toBe(false);
    expect(r.label).toContain("Friday");
  });
});

describe("parseTimeExpression", () => {
  it("resolves '8 baje' to 8:00 PM (clinic operating-hours default)", () => {
    const r = parseTimeExpression("8 baje");
    expect(r.ambiguous).toBe(false);
    expect(r.label).toBe("8:00 PM");
  });

  it("resolves explicit '8 PM'", () => {
    expect(parseTimeExpression("8 pm").label).toBe("8:00 PM");
  });

  it("resolves explicit '9 AM'", () => {
    expect(parseTimeExpression("9 am").label).toBe("9:00 AM");
  });

  it("resolves 'raat 8 baje' (night) to PM", () => {
    expect(parseTimeExpression("raat 8 baje").label).toBe("8:00 PM");
  });

  it("resolves 'subah 9 baje' (morning) to AM", () => {
    expect(parseTimeExpression("subah 9 baje").label).toBe("9:00 AM");
  });

  it("flags a bare ambiguous hour (e.g. 3 baje) instead of guessing", () => {
    const r = parseTimeExpression("3 baje");
    expect(r.ambiguous).toBe(true);
    expect(r.label).toBeNull();
  });

  it("parses HH:MM with meridiem", () => {
    expect(parseTimeExpression("8:30 pm").label).toBe("8:30 PM");
  });
});
