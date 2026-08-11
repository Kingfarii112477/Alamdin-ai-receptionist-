export type Intent =
  | "APPOINTMENT_TRIGGER"
  | "FEE"
  | "HOURS_CLINIC"
  | "HOURS_HOSPITAL"
  | "HOURS_GENERAL"
  | "LOCATION"
  | "DOCTOR"
  | "CONTACT"
  | "RATINGS"
  | "SOCIAL"
  | "GREETING"
  | "SAFETY_CONCERN"
  | "CANCEL"
  | "AFFIRM"
  | "DENY"
  | "EDIT_REQUEST"
  | "UNKNOWN";

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

const CONTACT_WORDS = ["contact", "phone number", "whatsapp number", "call karo", "rabta", "رابطہ"];

const RATINGS_WORDS = ["rating", "reviews", "review", "stars"];

const SOCIAL_WORDS = ["instagram", "facebook", "tiktok", "social media"];

const GREETING_WORDS = ["hi", "hello", "hey", "salam", "assalam", "aoa", "سلام"];

const CANCEL_WORDS = ["cancel", "chodo", "rehne do", "band karo", "منسوخ"];

const EDIT_WORDS = ["change", "edit", "badlo", "tabdeel", "wrong", "galat"];

const AFFIRM_WORDS = ["yes", "yeah", "yep", "sure", "correct", "haan", "han", "ji", "jee", "bilkul", "theek hai", "thik hai", "ok", "okay", "g", "ہاں", "جی", "بالکل", "ٹھیک ہے"];

const DENY_WORDS = ["no", "nah", "nahi", "nahin", "نہیں"];

/**
 * Deterministic, keyword-based intent classification. Facts (fee, hours,
 * location, doctor, contact) are ALWAYS matched here rather than left to the
 * AI, so a patient can never talk the receptionist into a wrong fact.
 */
export function classifyIntent(rawMessage: string): Intent {
  const text = rawMessage.toLowerCase();

  if (matchesAny(text, SAFETY_WORDS)) return "SAFETY_CONCERN";
  if (matchesAny(text, CANCEL_WORDS)) return "CANCEL";
  if (matchesAny(text, APPOINTMENT_WORDS)) return "APPOINTMENT_TRIGGER";
  if (matchesAny(text, FEE_WORDS)) return "FEE";

  if (matchesAny(text, HOURS_WORDS)) {
    if (matchesAny(text, HOURS_HOSPITAL_WORDS)) return "HOURS_HOSPITAL";
    if (matchesAny(text, HOURS_CLINIC_WORDS)) return "HOURS_CLINIC";
    return "HOURS_GENERAL";
  }
  if (matchesAny(text, HOURS_HOSPITAL_WORDS)) return "HOURS_HOSPITAL";

  if (matchesAny(text, LOCATION_WORDS)) return "LOCATION";
  if (matchesAny(text, DOCTOR_WORDS)) return "DOCTOR";
  if (matchesAny(text, RATINGS_WORDS)) return "RATINGS";
  if (matchesAny(text, SOCIAL_WORDS)) return "SOCIAL";
  if (matchesAny(text, CONTACT_WORDS)) return "CONTACT";
  if (matchesAny(text, EDIT_WORDS)) return "EDIT_REQUEST";
  if (matchesAny(text, AFFIRM_WORDS)) return "AFFIRM";
  if (matchesAny(text, DENY_WORDS)) return "DENY";
  if (matchesAny(text, GREETING_WORDS)) return "GREETING";

  return "UNKNOWN";
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
  "swelling badly",
  "swollen badly",
  "accident",
  "knocked out tooth",
  "bohat dard",
  "bohot dard",
  "bahut dard",
  "zyada khoon",
  "zyada bleeding",
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
