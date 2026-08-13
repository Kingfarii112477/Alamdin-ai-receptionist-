export type Intent =
  | "APPOINTMENT_TRIGGER"
  | "FEE"
  | "HOURS_CLINIC"
  | "HOURS_HOSPITAL"
  | "HOURS_GENERAL"
  | "LOCATION"
  | "DOCTOR"
  | "SERVICES"
  | "CONTACT"
  | "RATINGS"
  | "SOCIAL"
  | "GREETING"
  | "SAFETY_CONCERN"
  | "CANCEL"
  | "AFFIRM"
  | "DENY"
  | "EDIT_REQUEST"
  | "HUMAN_HANDOFF"
  | "UNKNOWN";

/** Deterministic-fact intents a message can carry ALONGSIDE another primary
 * intent (e.g. an appointment message that also asks the fee) — see
 * detectSecondaryFactIntent, used for multi-intent handling. */
export type FactIntent = "FEE" | "HOURS_CLINIC" | "HOURS_HOSPITAL" | "HOURS_GENERAL" | "LOCATION" | "DOCTOR" | "SERVICES" | "CONTACT" | "RATINGS" | "SOCIAL";

const SINGLE_WORD = /^[a-z0-9]+$/;
const wordBoundaryCache = new Map<string, RegExp>();

function matchesAny(text: string, words: string[]): boolean {
  return words.some((w) => {
    // Single Latin alphanumeric tokens (e.g. "ok", "g", "no") must match a
    // whole word — plain substring matching would false-positive inside
    // unrelated words (e.g. "book" contains "ok").
    if (SINGLE_WORD.test(w)) {
      let re = wordBoundaryCache.get(w);
      if (!re) {
        re = new RegExp(`\\b${w}\\b`);
        wordBoundaryCache.set(w, re);
      }
      return re.test(text);
    }
    return text.includes(w);
  });
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prevDiag = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, row[j], row[j - 1]);
      prevDiag = tmp;
    }
  }
  return row[n];
}

/**
 * Typo-tolerant fallback for single-word keywords only (e.g. "appointment"
 * misspelled as "apointment"), never applied to safety/emergency word lists
 * — those stay exact-match so a garbled message can never accidentally
 * suppress or misfire a safety-critical branch. Only checks words of 5+
 * letters (fuzzy-matching short words produces too many false positives).
 */
function fuzzyMatchesAny(text: string, words: string[]): boolean {
  const tokens = text.split(/[^a-z]+/).filter((w) => w.length >= 4);
  if (tokens.length === 0) return false;
  for (const w of words) {
    if (!SINGLE_WORD.test(w) || w.length < 5) continue;
    const threshold = w.length <= 6 ? 1 : 2;
    for (const token of tokens) {
      if (Math.abs(token.length - w.length) > threshold) continue;
      if (levenshtein(token, w) <= threshold) return true;
    }
  }
  return false;
}

const APPOINTMENT_WORDS = [
  "appointment",
  "book",
  "booking",
  "schedule",
  "milna hai",
  "milna",
  "checkup",
  "check up",
  "visit karna",
  "time chahiye",
  "aana hai",
  // A patient describing a dental symptom unprompted is, in practice, asking
  // to be seen — a real receptionist would move straight to booking rather
  // than treat it as small talk. Kept to specific, distinctive phrases
  // (not bare "pain"/"dard") to avoid over-triggering on unrelated text.
  "tooth mein pain",
  "tooth mein dard",
  "daant mein dard",
  "dant mein dard",
  "toothache",
  "tooth ache",
  "آپائنٹمنٹ",
  "اپائنٹمنٹ",
  "وقت لینا"
];

const SAFETY_WORDS = [
  "diagnose",
  "diagnosis",
  "what disease",
  "which disease",
  "kya bimari",
  "konsi bimari",
  "bimari hai",
  "prescribe",
  "prescription",
  "what medicine",
  "which medicine",
  "dawai batao",
  "dawa batao",
  "kya dawai",
  "kaunsi dawai",
  "antibiotic",
  "tablet loon",
  "دوا",
  "تشخیص",
  "بیماری"
];

const FEE_WORDS = ["fee", "fees", "price", "cost", "charges", "consultation fee", "kitne paise", "kitna paisa", "فیس", "قیمت"];

const HOURS_HOSPITAL_WORDS = ["hospital", "jelani", "جیلانی", "ہسپتال"];
const HOURS_CLINIC_WORDS = ["clinic", "کلینک", "private clinic"];
const HOURS_WORDS = ["timing", "timings", "hours", "open", "close", "kab khulta", "kab tak khula", "waqt milta", "اوقات", "ٹائمنگ", "کھلتا"];

const LOCATION_WORDS = ["location", "address", "kahan hai", "kaha hai", "where is", "map", "pata", "پتہ", "کہاں"];

const DOCTOR_WORDS = ["doctor", "dr.", "dr ", "qualification", "degree", "experience", "kaun sa doctor", "ڈاکٹر"];

const SERVICES_WORDS = [
  "services",
  "service",
  "treatments",
  "procedures",
  "root canal",
  "implant",
  "implants",
  "veneer",
  "veneers",
  "crown",
  "crowns",
  "whitening",
  "braces",
  "خدمات"
];

const CONTACT_WORDS = ["contact", "phone number", "whatsapp number", "call karo", "rabta", "رابطہ"];

const RATINGS_WORDS = ["rating", "reviews", "review", "stars"];

const SOCIAL_WORDS = ["instagram", "facebook", "tiktok", "social media"];

const GREETING_WORDS = ["hi", "hello", "hey", "salam", "assalam", "aoa", "سلام"];

const CANCEL_WORDS = ["cancel", "chodo", "rehne do", "band karo", "منسوخ"];

const EDIT_WORDS = ["change", "edit", "badlo", "tabdeel", "wrong", "galat", "reschedule"];

const HUMAN_HANDOFF_WORDS = [
  "doctor se baat",
  "staff se baat",
  "human se baat",
  "insan se baat",
  "banda se baat",
  "speak to someone",
  "talk to someone",
  "talk to a human",
  "real person",
  "agent se baat",
  "baat karwa dein",
  "baat karwado",
  "call kar dein",
  "mujhe call karen",
  "i want to speak to someone"
];

const AFFIRM_WORDS = [
  "yes",
  "yeah",
  "yep",
  "sure",
  "correct",
  "haan",
  "han",
  "ji",
  "jee",
  "bilkul",
  "theek hai",
  "thik hai",
  "ok",
  "okay",
  "g",
  "confirm",
  "book kar dein",
  "kar dein",
  "ہاں",
  "جی",
  "بالکل",
  "ٹھیک ہے"
];

const DENY_WORDS = ["no", "nah", "nahi", "nahin", "not now", "wait", "rukain", "ruk jao", "نہیں"];

/**
 * Deterministic, keyword-based intent classification. Facts (fee, hours,
 * location, doctor, contact) are ALWAYS matched here rather than left to the
 * AI, so a patient can never talk the receptionist into a wrong fact.
 */
export function classifyIntent(rawMessage: string): Intent {
  const text = rawMessage.toLowerCase();

  if (matchesAny(text, SAFETY_WORDS)) return "SAFETY_CONCERN";
  if (matchesAny(text, CANCEL_WORDS)) return "CANCEL";
  if (matchesAny(text, HUMAN_HANDOFF_WORDS)) return "HUMAN_HANDOFF";
  if (matchesAny(text, APPOINTMENT_WORDS) || fuzzyMatchesAny(text, APPOINTMENT_WORDS)) return "APPOINTMENT_TRIGGER";
  if (matchesAny(text, FEE_WORDS)) return "FEE";

  if (matchesAny(text, HOURS_WORDS)) {
    if (matchesAny(text, HOURS_HOSPITAL_WORDS)) return "HOURS_HOSPITAL";
    if (matchesAny(text, HOURS_CLINIC_WORDS)) return "HOURS_CLINIC";
    return "HOURS_GENERAL";
  }
  if (matchesAny(text, HOURS_HOSPITAL_WORDS)) return "HOURS_HOSPITAL";

  if (matchesAny(text, LOCATION_WORDS)) return "LOCATION";
  if (matchesAny(text, DOCTOR_WORDS)) return "DOCTOR";
  if (matchesAny(text, SERVICES_WORDS)) return "SERVICES";
  if (matchesAny(text, RATINGS_WORDS)) return "RATINGS";
  if (matchesAny(text, SOCIAL_WORDS)) return "SOCIAL";
  if (matchesAny(text, CONTACT_WORDS)) return "CONTACT";
  if (matchesAny(text, EDIT_WORDS)) return "EDIT_REQUEST";
  if (matchesAny(text, AFFIRM_WORDS)) return "AFFIRM";
  if (matchesAny(text, DENY_WORDS)) return "DENY";
  if (matchesAny(text, GREETING_WORDS)) return "GREETING";

  return "UNKNOWN";
}

const FACT_INTENT_CHECKS: { intent: FactIntent; words: string[] }[] = [
  { intent: "FEE", words: FEE_WORDS },
  { intent: "LOCATION", words: LOCATION_WORDS },
  { intent: "DOCTOR", words: DOCTOR_WORDS },
  { intent: "SERVICES", words: SERVICES_WORDS },
  { intent: "RATINGS", words: RATINGS_WORDS },
  { intent: "SOCIAL", words: SOCIAL_WORDS },
  { intent: "CONTACT", words: CONTACT_WORDS }
];

/**
 * Looks for a clinic-fact question riding alongside another message, e.g.
 * "Appointment kal chahiye, waise consultation fee kitni hai?" — used so the
 * receptionist can answer the fact AND keep collecting the appointment in
 * the same turn, instead of losing one or the other. Deliberately narrower
 * than classifyIntent: only checks the deterministic-fact word lists, never
 * APPOINTMENT_TRIGGER/CANCEL/AFFIRM/etc., since those are handled by the
 * primary flow already and re-detecting them here would just cause the
 * fact-layer to fight the state machine over what the message means.
 */
export function detectSecondaryFactIntent(rawMessage: string): FactIntent | null {
  const text = rawMessage.toLowerCase();
  if (matchesAny(text, HOURS_WORDS) || matchesAny(text, HOURS_HOSPITAL_WORDS)) {
    if (matchesAny(text, HOURS_HOSPITAL_WORDS)) return "HOURS_HOSPITAL";
    if (matchesAny(text, HOURS_CLINIC_WORDS)) return "HOURS_CLINIC";
    return "HOURS_GENERAL";
  }
  for (const { intent, words } of FACT_INTENT_CHECKS) {
    if (matchesAny(text, words)) return intent;
  }
  return null;
}

export function isAffirmative(rawMessage: string): boolean {
  const text = rawMessage.toLowerCase();
  return matchesAny(text, AFFIRM_WORDS) && !matchesAny(text, DENY_WORDS);
}

export function isNegative(rawMessage: string): boolean {
  const text = rawMessage.toLowerCase();
  return matchesAny(text, DENY_WORDS);
}

const EMERGENCY_WORDS = [
  "emergency",
  "severe pain",
  "extreme pain",
  "unbearable",
  "bleeding a lot",
  "heavy bleeding",
  "uncontrolled bleeding",
  "swelling badly",
  "swollen badly",
  "severe facial swelling",
  "facial swelling",
  "difficulty breathing",
  "trouble breathing",
  "can't breathe",
  "cant breathe",
  "difficulty swallowing",
  "trouble swallowing",
  "can't swallow",
  "cant swallow",
  "accident",
  "major trauma",
  "knocked out tooth",
  "tooth knocked out",
  "daant tut gaya",
  "daant toot gaya",
  "severe infection",
  "pus",
  "fever and swelling",
  "bukhar aur soojan",
  "bohat dard",
  "bohot dard",
  "bahut dard",
  "zyada khoon",
  "zyada bleeding",
  "khoon nahi ruk raha",
  "sozish",
  "ایمرجنسی",
  "بہت درد",
  "زیادہ خون"
];

/** Detects language suggesting a dental emergency, to trigger urgent-care guidance. */
export function isEmergency(rawMessage: string): boolean {
  const text = rawMessage.toLowerCase();
  return matchesAny(text, EMERGENCY_WORDS);
}
