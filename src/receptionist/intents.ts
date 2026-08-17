import { findServiceByAlias } from "../config/clinic";

export type Intent =
  | "APPOINTMENT_TRIGGER"
  | "SERVICE_INQUIRY"
  | "SERVICES_OVERVIEW"
  | "CONSULTATION_FEE"
  | "HOURS"
  | "LOCATION"
  | "DOCTOR"
  | "CONTACT"
  | "RATINGS"
  | "GREETING"
  | "SAFETY_MOLE_CANCER"
  | "SAFETY_TREATMENT_RECOMMENDATION"
  | "SAFETY_DIAGNOSIS"
  | "CANCEL"
  | "AFFIRM"
  | "DENY"
  | "EDIT_REQUEST"
  | "HUMAN_HANDOFF"
  | "UNKNOWN";

/** Deterministic-fact intents a message can carry ALONGSIDE another primary
 * intent (e.g. an appointment message that also asks the fee) — see
 * detectSecondaryFactIntent, used for multi-intent handling. */
export type FactIntent = "SERVICE_INQUIRY" | "SERVICES_OVERVIEW" | "CONSULTATION_FEE" | "HOURS" | "LOCATION" | "DOCTOR" | "RATINGS" | "CONTACT";

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
  "consultation chahiye",
  "visit karna",
  "time chahiye",
  "aana hai",
  "karwana hai",
  "karwani hai",
  "lagwana hai",
  "lagwani hai",
  // A patient describing a skin/hair concern unprompted is, in practice,
  // asking to be seen — a real receptionist would move straight to booking
  // rather than treat it as small talk. Kept to specific, distinctive
  // phrases (not bare "skin" or generic words) to avoid over-triggering.
  "mera skin ka masla",
  "meri skin ka masla",
  "skin ka masla hai",
  "baal bohat gir rahe",
  "baal bahut gir rahe",
  "آپائنٹمنٹ",
  "اپائنٹمنٹ",
  "وقت لینا"
];

// A mole/growth explicitly asked whether it's cancerous — the highest-stakes
// case, checked first and never left to a generic diagnosis response.
const SAFETY_MOLE_CANCER_WORDS = [
  "is this cancer",
  "is it cancer",
  "skin cancer",
  "cancerous",
  "mole cancer",
  "cancer hai kya",
  "kya yeh cancer hai",
  "cancer to nahi",
  "کینسر"
];

// The patient is asking the AI to personally pick/recommend a treatment for
// them, rather than asking what's listed — that decision belongs to the
// dermatologist, never the chatbot.
const SAFETY_TREATMENT_RECOMMENDATION_WORDS = [
  "should i take",
  "should i get",
  "which one should i",
  "which is best for me",
  "what should i take",
  "what should i get",
  "recommend me",
  "suggest me a treatment",
  "which treatment is best",
  "mujhe kaunsa lena chahiye",
  "mujhe konsa lena chahiye",
  "kaunsa treatment lena chahiye",
  "konsa treatment lena chahiye"
];

// General self-diagnosis requests — a symptom description asked as "what is
// this" / "do I have X" rather than simply booking an appointment about it.
const SAFETY_DIAGNOSIS_WORDS = [
  "diagnose",
  "diagnosis",
  "what disease",
  "which disease",
  "what condition",
  "kya bimari",
  "konsi bimari",
  "bimari hai",
  "is this vitiligo",
  "do i have vitiligo",
  "kya yeh vitiligo hai",
  "kya mujhe vitiligo hai",
  "is this psoriasis",
  "do i have psoriasis",
  "is this alopecia",
  "do i have alopecia",
  "white patches",
  "safed dhabbay",
  "safed daagh",
  "is this normal",
  "prescribe",
  "prescription",
  "what medicine",
  "which medicine",
  "dawai batao",
  "dawa batao",
  "kya dawai",
  "kaunsi dawai",
  "antibiotic",
  "دوا",
  "تشخیص",
  "بیماری"
];

const CONSULTATION_WORDS = [
  "consultation fee",
  "consultation price",
  "consultation cost",
  "doctor ki fee",
  "doctor fee",
  "doctor ka fee",
  "checkup fee",
  "visit fee",
  "کنسلٹیشن فیس"
];

// Generic price wording with NO specific service named — checked only after
// the service-catalog alias lookup, so "Botox kitna hai" resolves to the
// specific Botox listing rather than this generic consultation fallback.
const GENERIC_PRICE_WORDS = ["fee", "fees", "price", "cost", "charges", "kitne paise", "kitna paisa", "kitni hai", "kitna hai", "فیس", "قیمت"];

const HOURS_WORDS = [
  "timing",
  "timings",
  "hours",
  "open",
  "close",
  "closes",
  "kab khulta",
  "kab tak khula",
  "waqt milta",
  "aaj open",
  "khula hai",
  "band karte",
  "band hote",
  "band hota",
  "kitne baje band",
  "kis waqt band",
  "اوقات",
  "ٹائمنگ",
  "کھلتا"
];

const LOCATION_WORDS = ["location", "address", "kahan hai", "kaha hai", "where is", "map", "pata", "پتہ", "کہاں"];

const DOCTOR_WORDS = ["doctor", "dr.", "dr ", "dermatologist", "qualification", "specialist", "kaun sa doctor", "ڈاکٹر"];

const SERVICES_OVERVIEW_WORDS = ["services", "service", "treatments", "procedures", "what do you offer", "kya karte hain", "خدمات"];

const CONTACT_WORDS = ["contact", "phone number", "whatsapp number", "call karo", "rabta", "email", "website", "رابطہ"];

const RATINGS_WORDS = ["rating", "reviews", "review", "stars"];

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
 * Deterministic, keyword-based intent classification. Facts (services,
 * prices, hours, location, doctor, contact) are ALWAYS matched here rather
 * than left to the AI, so a patient can never talk the receptionist into a
 * wrong fact — see src/config/clinic.ts for the verified source data.
 */
export function classifyIntent(rawMessage: string): Intent {
  const text = rawMessage.toLowerCase();

  if (matchesAny(text, SAFETY_MOLE_CANCER_WORDS)) return "SAFETY_MOLE_CANCER";
  if (matchesAny(text, SAFETY_TREATMENT_RECOMMENDATION_WORDS)) return "SAFETY_TREATMENT_RECOMMENDATION";
  if (matchesAny(text, SAFETY_DIAGNOSIS_WORDS)) return "SAFETY_DIAGNOSIS";
  if (matchesAny(text, CANCEL_WORDS)) return "CANCEL";
  if (matchesAny(text, HUMAN_HANDOFF_WORDS)) return "HUMAN_HANDOFF";
  if (matchesAny(text, APPOINTMENT_WORDS) || fuzzyMatchesAny(text, APPOINTMENT_WORDS)) return "APPOINTMENT_TRIGGER";

  if (findServiceByAlias(text)) return "SERVICE_INQUIRY";
  if (matchesAny(text, CONSULTATION_WORDS)) return "CONSULTATION_FEE";
  if (matchesAny(text, GENERIC_PRICE_WORDS)) return "CONSULTATION_FEE";

  if (matchesAny(text, HOURS_WORDS)) return "HOURS";
  if (matchesAny(text, LOCATION_WORDS)) return "LOCATION";
  if (matchesAny(text, DOCTOR_WORDS)) return "DOCTOR";
  if (matchesAny(text, SERVICES_OVERVIEW_WORDS)) return "SERVICES_OVERVIEW";
  if (matchesAny(text, RATINGS_WORDS)) return "RATINGS";
  if (matchesAny(text, CONTACT_WORDS)) return "CONTACT";
  if (matchesAny(text, EDIT_WORDS)) return "EDIT_REQUEST";
  if (matchesAny(text, AFFIRM_WORDS)) return "AFFIRM";
  if (matchesAny(text, DENY_WORDS)) return "DENY";
  if (matchesAny(text, GREETING_WORDS)) return "GREETING";

  return "UNKNOWN";
}

const FACT_INTENT_CHECKS: { intent: FactIntent; words: string[] }[] = [
  { intent: "LOCATION", words: LOCATION_WORDS },
  { intent: "DOCTOR", words: DOCTOR_WORDS },
  { intent: "SERVICES_OVERVIEW", words: SERVICES_OVERVIEW_WORDS },
  { intent: "RATINGS", words: RATINGS_WORDS },
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

  if (findServiceByAlias(text)) return "SERVICE_INQUIRY";
  if (matchesAny(text, CONSULTATION_WORDS) || matchesAny(text, GENERIC_PRICE_WORDS)) return "CONSULTATION_FEE";
  if (matchesAny(text, HOURS_WORDS)) return "HOURS";

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

// True medical emergencies — never dermatology-clinic-appropriate;
// these route to immediate emergency-care guidance, never a "call the
// clinic" response. See src/receptionist/responses.ts → emergencyGuidance.
const EMERGENCY_WORDS = [
  "emergency",
  "difficulty breathing",
  "trouble breathing",
  "can't breathe",
  "cant breathe",
  "saans lene mein mushkil",
  "saans nahi aa rahi",
  "allergic reaction",
  "anaphylaxis",
  "severe allergic reaction",
  "shadeed allergy",
  "unconscious",
  "loss of consciousness",
  "behosh",
  "behoshi",
  "uncontrolled bleeding",
  "severe bleeding",
  "heavy bleeding",
  "bleeding a lot",
  "khoon nahi ruk raha",
  "zyada khoon",
  "zyada bleeding",
  "severe facial swelling",
  "facial swelling",
  "face is swelling badly",
  "chehra soj gaya",
  "eye injury",
  "serious eye injury",
  "aankh mein chot",
  "aankh ki chot",
  "bohat dard",
  "bohot dard",
  "bahut dard",
  "unbearable",
  "ایمرجنسی",
  "سانس",
  "بے ہوش",
  "زیادہ خون"
];

/** Detects language suggesting a true medical emergency, to trigger urgent-care guidance. */
export function isEmergency(rawMessage: string): boolean {
  const text = rawMessage.toLowerCase();
  return matchesAny(text, EMERGENCY_WORDS);
}
