import { CLINIC } from "../config/clinic";

export interface DateParseResult {
  /** ISO date (YYYY-MM-DD) in the clinic's local calendar, or null if unresolved. */
  iso: string | null;
  /** Human-friendly normalized label, e.g. "Wednesday, 13 August 2026". */
  label: string | null;
  ambiguous: boolean;
}

export interface TimeParseResult {
  /** "8:00 PM" style label, or null if unresolved. */
  label: string | null;
  /** 24-hour "HH:MM", or null if unresolved. */
  hhmm: string | null;
  ambiguous: boolean;
}

/** Pakistan Standard Time is UTC+5 year-round — no DST to worry about. */
export function nowInKarachi(): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute")
  };
}

function toEpochDay(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function fromEpochDay(epochDay: number): { year: number; month: number; day: number } {
  const d = new Date(epochDay * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function formatLabel(year: number, month: number, day: number): string {
  const dow = WEEKDAY_LABELS[weekdayOf(year, month, day)];
  return `${dow}, ${day} ${MONTH_LABELS[month - 1]} ${year}`;
}

function toISO(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/** Formats a "YYYY-MM-DD" string as a human-friendly label, e.g. "Wednesday, 13 August 2026". */
export function isoToLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return formatLabel(y, m, d);
}

const RELATIVE_DAY_WORDS: Record<string, number> = {
  aaj: 0,
  today: 0,
  abhi: 0,
  tonight: 0,
  kal: 1,
  tomorrow: 1,
  parso: 2,
  parson: 2,
  parsoon: 2,
  "day after tomorrow": 2
};

const WEEKDAY_WORDS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  itwar: 0,
  aitwar: 0,
  monday: 1,
  mon: 1,
  peer: 1,
  pir: 1,
  somwar: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  mangal: 2,
  wednesday: 3,
  wed: 3,
  budh: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  jumeraat: 4,
  jumerat: 4,
  friday: 5,
  fri: 5,
  juma: 5,
  jumma: 5,
  jummah: 5,
  saturday: 6,
  sat: 6,
  hafta: 6,
  saneechar: 6,
  sanicher: 6
};

const MONTH_WORDS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};

/**
 * Parses a natural-language date expression (English / Urdu / Roman Urdu)
 * relative to "now" in the clinic's timezone. Never silently guesses on
 * genuinely ambiguous input — returns ambiguous:true instead so the caller
 * can ask a clarifying question.
 */
export function parseDateExpression(raw: string, now = nowInKarachi()): DateParseResult {
  const text = raw.trim().toLowerCase();
  const todayEpoch = toEpochDay(now.year, now.month, now.day);

  // 1) Relative day words ("kal", "parso", "today", ...)
  for (const [word, offset] of Object.entries(RELATIVE_DAY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      const { year, month, day } = fromEpochDay(todayEpoch + offset);
      return { iso: toISO(year, month, day), label: formatLabel(year, month, day), ambiguous: false };
    }
  }

  // 2) Explicit ISO date: YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { iso: toISO(year, month, day), label: formatLabel(year, month, day), ambiguous: false };
    }
  }

  // 3) "13 August" / "August 13" (with optional year)
  const monthNamePattern = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join("|");
  const dayMonth = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamePattern})\\b(?:\\s+(\\d{4}))?`, "i");
  const monthDay = new RegExp(`\\b(${monthNamePattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s*,?\\s*(\\d{4}))?`, "i");

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  const dm = text.match(dayMonth);
  const md = text.match(monthDay);

  if (dm) {
    day = Number(dm[1]);
    month = MONTH_WORDS[dm[2]];
    year = dm[3] ? Number(dm[3]) : null;
  } else if (md) {
    month = MONTH_WORDS[md[1]];
    day = Number(md[2]);
    year = md[3] ? Number(md[3]) : null;
  }

  if (day && month) {
    if (!year) {
      year = now.year;
      // If that date has already passed this year, assume next year.
      if (toEpochDay(year, month, day) < todayEpoch) {
        year += 1;
      }
    }
    if (day >= 1 && day <= 31) {
      return { iso: toISO(year, month, day), label: formatLabel(year, month, day), ambiguous: false };
    }
  }

  // 4) Numeric short date: DD/MM or DD-MM (optionally /YYYY)
  const numeric = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    let y = numeric[3] ? Number(numeric[3]) : now.year;
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      if (!numeric[3] && toEpochDay(y, m, d) < todayEpoch) y += 1;
      return { iso: toISO(y, m, d), label: formatLabel(y, m, d), ambiguous: false };
    }
  }

  // 5) Weekday name ("Friday", "juma") -> next occurrence (today counts as day 0)
  for (const [word, dow] of Object.entries(WEEKDAY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      const todayDow = weekdayOf(now.year, now.month, now.day);
      let diff = (dow - todayDow + 7) % 7;
      const { year: y2, month: m2, day: d2 } = fromEpochDay(todayEpoch + diff);
      return { iso: toISO(y2, m2, d2), label: formatLabel(y2, m2, d2), ambiguous: false };
    }
  }

  return { iso: null, label: null, ambiguous: true };
}

const NIGHT_WORDS = ["raat", "night"];
const MORNING_WORDS = ["subah", "subha", "morning"];
const AFTERNOON_WORDS = ["dopher", "dopahar", "afternoon"];
const EVENING_WORDS = ["shaam", "sham", "evening"];

function containsAny(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w}\\b`).test(text));
}

/**
 * Parses a natural-language time expression. When no explicit AM/PM and no
 * time-of-day qualifier is present, hours 8–11 default to PM — the clinic's
 * only operating window (8:00 PM–11:30 PM) — mirroring how a real
 * receptionist would interpret "8 baje" without further clarification.
 * Every other bare hour is genuinely ambiguous and triggers a clarifying
 * question rather than a silent guess.
 */
export function parseTimeExpression(raw: string): TimeParseResult {
  const text = raw.trim().toLowerCase();

  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)?\s*(?:baje|bajay|baj)?\b/);
  if (!match) {
    return { label: null, hhmm: null, ambiguous: true };
  }

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 1 || hour > 12 || minute > 59) {
    return { label: null, hhmm: null, ambiguous: true };
  }

  const explicitAmPm = match[3]?.replace(/\./g, "");
  let meridiem: "AM" | "PM" | null = null;

  if (explicitAmPm === "am") meridiem = "AM";
  else if (explicitAmPm === "pm") meridiem = "PM";
  else if (containsAny(text, NIGHT_WORDS)) meridiem = hour >= 1 && hour <= 5 ? "AM" : "PM";
  else if (containsAny(text, MORNING_WORDS)) meridiem = "AM";
  else if (containsAny(text, AFTERNOON_WORDS)) meridiem = "PM";
  else if (containsAny(text, EVENING_WORDS)) meridiem = "PM";
  else if (hour >= 8 && hour <= 11) meridiem = "PM"; // clinic operating-hours default

  if (!meridiem) {
    return { label: null, hhmm: null, ambiguous: true };
  }

  const hour24 = meridiem === "PM" ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
  const label = `${hour}:${minute.toString().padStart(2, "0")} ${meridiem}`;
  const hhmm = `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

  return { label, hhmm, ambiguous: false };
}
