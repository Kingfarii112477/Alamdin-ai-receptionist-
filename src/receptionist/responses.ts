import { CLINIC, type CautionLevel, type ServiceEntry } from "../config/clinic";
import type { Language } from "../types/conversation";

type Templated = Record<Language, string>;
type TemplatedFn<T extends unknown[]> = (...args: T) => Templated;

function pick(t: Templated, lang: Language): string {
  return t[lang];
}

const QUETTA = CLINIC.branches[0];

export const R = {
  greeting: (): Templated => ({
    english: `Assalam-o-Alaikum! 👋 Welcome to ${CLINIC.businessName}. I'm the ${CLINIC.businessName} AI Receptionist. I can help with services, starting prices, clinic information, and appointment requests. How can I help you today?`,
    urdu: `السلام علیکم! 👋 ${CLINIC.businessName} میں خوش آمدید۔ میں ${CLINIC.businessName} کا AI Receptionist ہوں۔ میں سروسز، ابتدائی قیمتوں، کلینک کی معلومات اور اپائنٹمنٹ ریکویسٹ میں مدد کر سکتا ہوں۔ میں آپ کی کیا مدد کر سکتا ہوں؟`,
    "roman-urdu": `Assalam-o-Alaikum! 👋 ${CLINIC.businessName} mein khush aamdeed. Main ${CLINIC.businessName} ka AI Receptionist hoon. Main services, starting prices, clinic information aur appointment requests mein madad kar sakta hoon. Aap kis cheez mein madad chahte hain?`
  }),

  askName: (): Templated => ({
    english: "Sure! What's your name?",
    urdu: "بالکل! آپ کا نام کیا ہے؟",
    "roman-urdu": "Bilkul! Aapka naam kya hai?"
  }),

  askPhone: (name: string | null): Templated => ({
    english: `Thank you${name ? ` ${name}` : ""}. What's your phone number?`,
    urdu: `شکریہ${name ? ` ${name}` : ""}۔ آپ کا فون نمبر کیا ہے؟`,
    "roman-urdu": `Shukriya${name ? ` ${name} sahb` : ""}. Aapka phone number kya hai?`
  }),

  invalidPhone: (): Templated => ({
    english: "That doesn't look like a valid phone number. Could you send it again? (e.g. 03001234567)",
    urdu: "یہ نمبر درست نہیں لگ رہا۔ براہ کرم دوبارہ بھیجیں (مثلاً 03001234567)۔",
    "roman-urdu": "Yeh number theek nahi lag raha. Dobara bhejain (misaal: 03001234567)."
  }),

  askReason: (): Templated => ({
    english: "Thanks. What's the reason for your visit, or which concern/service is this for?",
    urdu: "شکریہ۔ آپ کس وجہ سے یا کس مسئلے/سروس کے لیے آنا چاہتے ہیں؟",
    "roman-urdu": "Shukriya. Aap kis wajah se ya kis concern/service ke liye aana chahte hain?"
  }),

  askDate: (): Templated => ({
    english: "Got it. Which day would you like to come in?",
    urdu: "ٹھیک ہے۔ آپ کس دن آنا چاہیں گے؟",
    "roman-urdu": "Theek hai. Aap kis din aana chahenge?"
  }),

  dateAmbiguous: (): Templated => ({
    english: "I didn't quite catch the date — could you give me a specific day, like \"tomorrow\" or \"13 August\"?",
    urdu: "مجھے تاریخ واضح نہیں ہوئی۔ براہ کرم دن بتائیں، مثلاً \"کل\" یا \"13 اگست\"۔",
    "roman-urdu": "Mujhe date clear nahi hui. Baraye meharbani specific din batayein, jaise \"kal\" ya \"13 August\"."
  }),

  askTime: (): Templated => ({
    english: "And what time would you like to come in?",
    urdu: "اور آپ کس وقت آنا چاہیں گے؟",
    "roman-urdu": "Aur kis waqt aana chahenge?"
  }),

  timeAmbiguous: (): Templated => ({
    english: "Could you clarify the time — AM or PM? (e.g. \"8 PM\")",
    urdu: "براہ کرم وقت واضح کریں — صبح یا شام؟ (مثلاً \"8 شام\")",
    "roman-urdu": "Waqt thora clear karein — subah ya shaam? (misaal: \"8 baje raat\")"
  }),

  summaryHeader: (): Templated => ({
    english: "Appointment Request",
    urdu: "اپائنٹمنٹ کی درخواست",
    "roman-urdu": "Appointment Request"
  }),

  summaryConfirmQuestion: (): Templated => ({
    english: "Is everything correct?",
    urdu: "کیا سب کچھ درست ہے؟",
    "roman-urdu": "Is everything correct?"
  }),

  requestReceived: (): Templated => ({
    english: `Your appointment request has been submitted. ${CLINIC.businessName} staff will confirm the available time — our team will contact you at ${QUETTA.phone}.\n\nNote: This is an appointment request, not a confirmed appointment.`,
    urdu: `آپ کی اپائنٹمنٹ کی درخواست جمع ہو گئی ہے۔ ${CLINIC.businessName} کا عملہ دستیاب وقت کی تصدیق کرے گا — ہماری ٹیم آپ سے ${QUETTA.phone} پر رابطہ کرے گی۔\n\nنوٹ: یہ اپائنٹمنٹ کی درخواست ہے، کنفرم اپائنٹمنٹ نہیں۔`,
    "roman-urdu": `Aapki appointment request submit ho gayi hai. ${CLINIC.businessName} staff available time confirm karega — hamari team aapse ${QUETTA.phone} par rabta karegi.\n\nNote: Yeh appointment request hai, confirmed appointment nahi.`
  }),

  editWhichField: (): Templated => ({
    english: "No problem — what would you like to change: name, phone, reason, date, or time?",
    urdu: "کوئی بات نہیں — آپ کیا تبدیل کرنا چاہیں گے: نام، فون نمبر، وجہ، تاریخ، یا وقت؟",
    "roman-urdu": "Koi baat nahi — aap kya change karna chahenge: naam, phone number, wajah, date, ya time?"
  }),

  editFieldNotUnderstood: (): Templated => ({
    english: "Sorry, which field did you mean — name, phone, reason, date, or time?",
    urdu: "معذرت، آپ کون سا حصہ تبدیل کرنا چاہتے ہیں — نام، فون، وجہ، تاریخ، یا وقت؟",
    "roman-urdu": "Sorry, kaun sa field change karna hai — naam, phone, wajah, date, ya time?"
  }),

  cancelled: (): Templated => ({
    english: "No problem, I've cancelled that appointment request. Let me know if you'd like to start again anytime.",
    urdu: "کوئی بات نہیں، میں نے یہ درخواست منسوخ کر دی ہے۔ جب چاہیں دوبارہ شروع کر سکتے ہیں۔",
    "roman-urdu": "Koi baat nahi, maine yeh appointment request cancel kar di hai. Jab chahein dobara start kar sakte hain."
  }),

  // --- Clinic facts (deterministic, verified-only) ---------------------------

  consultationInfo: (): Templated => ({
    english: `Consultation is listed ${CLINIC.consultation.priceLabel.replace("From ", "from ")}. ${CLINIC.consultation.description}`,
    urdu: `کنسلٹیشن کی قیمت ${CLINIC.consultation.priceLabel} ہے۔ ${CLINIC.consultation.description}`,
    "roman-urdu": `Consultation ${CLINIC.consultation.priceLabel.replace("From ", "")} se listed hai. ${CLINIC.consultation.description}`
  }),

  /** Only the one verified fact (closing time) — never a fabricated weekly schedule. */
  hoursInfo: (): Templated => ({
    english: `${CLINIC.businessName} is currently listed as closing at ${CLINIC.hours.closingTimeVerified}. I don't have a verified full weekly schedule — please contact us at ${QUETTA.phone} or WhatsApp ${CLINIC.whatsappDisplay} to confirm timings for a specific day.`,
    urdu: `${CLINIC.businessName} کے بند ہونے کا موجودہ وقت ${CLINIC.hours.closingTimeVerified} ہے۔ مکمل ہفتہ وار شیڈول تصدیق شدہ نہیں ہے — براہ کرم ${QUETTA.phone} یا واٹس ایپ ${CLINIC.whatsappDisplay} پر رابطہ کریں۔`,
    "roman-urdu": `${CLINIC.businessName} filhaal ${CLINIC.hours.closingTimeVerified} par close listed hai. Mera paas verified weekly schedule nahi hai — kisi specific din ke liye ${QUETTA.phone} ya WhatsApp ${CLINIC.whatsappDisplay} par confirm kar lein.`
  }),

  locationInfo: (): Templated => ({
    english: `${CLINIC.businessName} is located at ${QUETTA.address}.`,
    urdu: `${CLINIC.businessName} ${QUETTA.address} پر واقع ہے۔`,
    "roman-urdu": `${CLINIC.businessName} ${QUETTA.address} par hai.`
  }),

  doctorInfo: (): Templated => ({
    english: `${CLINIC.doctor.name} — ${CLINIC.doctor.specialty}, ${CLINIC.doctor.positioning}.`,
    urdu: `${CLINIC.doctor.name} — ${CLINIC.doctor.specialty}، ${CLINIC.doctor.positioning}۔`,
    "roman-urdu": `${CLINIC.doctor.name} — ${CLINIC.doctor.specialty}, ${CLINIC.doctor.positioning}.`
  }),

  contactInfo: (): Templated => ({
    english: `You can reach ${CLINIC.businessName} at ${QUETTA.phone}, WhatsApp ${CLINIC.whatsappDisplay}, or ${CLINIC.email} (${CLINIC.website}).`,
    urdu: `آپ ${CLINIC.businessName} سے ${QUETTA.phone}، واٹس ایپ ${CLINIC.whatsappDisplay}، یا ${CLINIC.email} (${CLINIC.website}) پر رابطہ کر سکتے ہیں۔`,
    "roman-urdu": `Aap ${CLINIC.businessName} se ${QUETTA.phone}, WhatsApp ${CLINIC.whatsappDisplay}, ya ${CLINIC.email} (${CLINIC.website}) par rabta kar sakte hain.`
  }),

  ratingsInfo: (): Templated => {
    const list = CLINIC.ratings.map((r) => (r.score ? `${r.source}: ${r.score} (${r.detail})` : `${r.source}: ${r.detail}`)).join(", ");
    return {
      english: `${CLINIC.businessName} is rated ${list}.`,
      urdu: `${CLINIC.businessName} کی ریٹنگز: ${list}۔`,
      "roman-urdu": `${CLINIC.businessName} ki ratings: ${list}.`
    };
  },

  // --- Safety ------------------------------------------------------------

  /** Generic self-diagnosis refusal — e.g. "is this X condition?", "white patches, is this vitiligo?" */
  diagnosisDecline: (): Templated => ({
    english: `I can't diagnose a skin condition through chat. Symptoms like this can have different causes and should be assessed by a dermatologist. ${CLINIC.businessName} provides dermatological evaluation — I can help you request an appointment.`,
    urdu: `میں چیٹ کے ذریعے جلد کی تشخیص نہیں کر سکتا۔ ایسی علامات مختلف وجوہات کی بنا پر ہو سکتی ہیں اور ماہر ڈرماٹولوجسٹ سے معائنہ ضروری ہے۔ میں آپ کی اپائنٹمنٹ درخواست میں مدد کر سکتا ہوں۔`,
    "roman-urdu": `Main chat ke zariye skin condition ki diagnosis nahi kar sakta. Aisi symptoms ki different wajuhat ho sakti hain aur dermatologist se assess karwana zaroori hai. Main aapki appointment request mein madad kar sakta hoon.`
  }),

  /** A mole/growth being asked whether it's cancerous — never confirmed or denied through chat. */
  moleCancerDecline: (): Templated => ({
    english: "I can't determine whether a mole or skin growth is cancerous through chat. A dermatologist would need to examine it in person. I can help you request an appointment.",
    urdu: `میں چیٹ کے ذریعے یہ تعین نہیں کر سکتا کہ کوئی تل یا نشان کینسر ہے یا نہیں۔ اس کے لیے ڈرماٹولوجسٹ کا معائنہ ضروری ہے۔ میں آپ کی اپائنٹمنٹ درخواست میں مدد کر سکتا ہوں۔`,
    "roman-urdu": "Main chat ke zariye yeh determine nahi kar sakta ke koi mole ya skin growth cancerous hai ya nahi. Iske liye dermatologist ka in-person examination zaroori hai. Main aapki appointment request mein madad kar sakta hoon."
  }),

  /** Asked to personally recommend/pick an injectable or specific treatment for the individual patient. */
  treatmentRecommendationDecline: (): Templated => ({
    english: "I can share what's listed for a treatment, but I can't personally recommend or select one for you — a dermatologist needs to assess whether it's suitable and safe for your case. I can help you request an appointment.",
    urdu: `میں کسی علاج کے بارے میں معلومات دے سکتا ہوں، لیکن آپ کے لیے ذاتی طور پر کوئی علاج تجویز نہیں کر سکتا — یہ ڈرماٹولوجسٹ کا کام ہے۔ میں آپ کی اپائنٹمنٹ درخواست میں مدد کر سکتا ہوں۔`,
    "roman-urdu": "Main kisi treatment ke baare mein listed information de sakta hoon, lekin aapke liye personally koi treatment recommend nahi kar sakta — dermatologist ko assess karna hota hai ke woh aapke liye suitable aur safe hai ya nahi. Main aapki appointment request mein madad kar sakta hoon."
  }),

  /** True medical emergencies (breathing difficulty, anaphylaxis, severe bleeding, eye injury...) — never a skin-clinic-appropriate response, never a fabricated number. */
  emergencyGuidance: (): Templated => ({
    english: `That sounds like it needs urgent medical attention. Please seek immediate emergency medical care (your nearest emergency room) right away — this isn't something to wait on a clinic appointment for.`,
    urdu: `یہ فوری طبی توجہ کا معاملہ لگتا ہے۔ براہ کرم فوراً قریب ترین ایمرجنسی سے رجوع کریں — اس کے لیے کلینک اپائنٹمنٹ کا انتظار نہ کریں۔`,
    "roman-urdu": `Yeh urgent medical attention ka maamla lagta hai. Baraye meharbani foran apne nazdeeki emergency room se rujoo karein — iske liye clinic appointment ka intezar na karein.`
  }),

  appointmentAlreadySubmittedIntro: (): Templated => ({
    english: "Would you like to submit a new appointment request?",
    urdu: "کیا آپ نئی اپائنٹمنٹ کی درخواست دینا چاہیں گے؟",
    "roman-urdu": "Kya aap nayi appointment request dena chahenge?"
  }),

  /** Acknowledges a mid-conversation correction to an already-provided field, e.g. "Bilkul, Naam: Muhammad Farooq. Update kar diya hai. ✅" */
  correctionAck: (fieldLabel: string, value: string): Templated => ({
    english: `Got it — ${fieldLabel}: ${value}. Updated.`,
    urdu: `ٹھیک ہے — ${fieldLabel}: ${value}۔ اپڈیٹ ہو گیا۔`,
    "roman-urdu": `Bilkul, ${fieldLabel}: ${value}. Update kar diya hai. ✅`
  }),

  humanHandoff: (): Templated => ({
    english: `I'll have our team reach out to you. You can also call us directly at ${QUETTA.phone} or WhatsApp ${CLINIC.whatsappDisplay}.`,
    urdu: `ہماری ٹیم آپ سے رابطہ کرے گی۔ آپ براہ راست ${QUETTA.phone} یا واٹس ایپ ${CLINIC.whatsappDisplay} پر بھی رابطہ کر سکتے ہیں۔`,
    "roman-urdu": `Hamari team aapse rabta karegi. Aap seedha ${QUETTA.phone} ya WhatsApp ${CLINIC.whatsappDisplay} par bhi rabta kar sakte hain.`
  }),

  /** To reschedule an already-SUBMITTED request — the chat flow has no way to edit a persisted AppointmentRequest, so this points to staff by phone rather than pretending to handle it. */
  rescheduleInfo: (): Templated => ({
    english: `To reschedule an already-submitted request, please call us at ${QUETTA.phone} and our team will help.`,
    urdu: `پہلے سے جمع شدہ درخواست کو دوبارہ شیڈول کرنے کے لیے ${QUETTA.phone} پر کال کریں، ہماری ٹیم مدد کرے گی۔`,
    "roman-urdu": `Pehle se submit ki gayi request reschedule karne ke liye ${QUETTA.phone} par call karein, hamari team madad karegi.`
  }),

  // --- Service catalog (data-driven — see src/config/clinic.ts) ----------

  /** One verified service, with its price exactly as listed and a caution note appropriate to its category. Never invents a price. */
  serviceInfo: (service: ServiceEntry): Templated => {
    const caution = CAUTION_SUFFIX[service.caution];
    const tech = service.technology ? ` (${service.technology})` : "";
    if (service.priceType === "unverified") {
      return {
        english: `${CLINIC.businessName} lists ${service.canonicalName}${tech}. ${service.description} I don't have a verified current price for it — please contact us at ${QUETTA.phone} or WhatsApp ${CLINIC.whatsappDisplay} for the current price.`,
        urdu: `${CLINIC.businessName} میں ${service.canonicalName}${tech} دستیاب ہے۔ ${service.description} اس کی تصدیق شدہ قیمت میرے پاس موجود نہیں — براہ کرم ${QUETTA.phone} یا واٹس ایپ ${CLINIC.whatsappDisplay} پر رابطہ کریں۔`,
        "roman-urdu": `${CLINIC.businessName} mein ${service.canonicalName}${tech} listed hai. ${service.description} Iski verified current price mere paas nahi hai — please ${QUETTA.phone} ya WhatsApp ${CLINIC.whatsappDisplay} par contact karein.`
      };
    }
    return {
      english: `${CLINIC.businessName} lists ${service.canonicalName} ${service.priceLabel!.replace("From ", "from ")}${tech}. ${service.description} ${caution.english}`,
      urdu: `${CLINIC.businessName} میں ${service.canonicalName} کی قیمت ${service.priceLabel}${tech} ہے۔ ${service.description} ${caution.urdu}`,
      "roman-urdu": `${CLINIC.businessName} mein ${service.canonicalName} ${service.priceLabel} listed hai${tech}. ${service.description} ${caution["roman-urdu"]}`
    };
  },

  servicesOverview: (): Templated => ({
    english: `${CLINIC.businessName} offers medical dermatology, injectables (Botox, fillers, PRP), lasers, facial/aesthetic treatments, hair treatments, body contouring, and surgical procedures. Ask about a specific treatment (e.g. "Botox price") and I'll share the listed details.`,
    urdu: `${CLINIC.businessName} میڈیکل ڈرماٹولوجی، انجیکٹیبلز (بوٹوکس، فلرز، پی آر پی)، لیزرز، فیشل/ایستھیٹک علاج، بالوں کے علاج، باڈی کونٹورنگ، اور سرجیکل طریقہ کار پیش کرتا ہے۔ کسی مخصوص علاج کے بارے میں پوچھیں۔`,
    "roman-urdu": `${CLINIC.businessName} medical dermatology, injectables (Botox, fillers, PRP), lasers, facial/aesthetic treatments, hair treatments, body contouring, aur surgical procedures offer karta hai. Kisi specific treatment ke baare mein pooch lein (e.g. "Botox price") — main listed details bata dunga.`
  })
};

const CAUTION_SUFFIX: Record<CautionLevel, Templated> = {
  injectable: {
    english: "The dermatologist will assess whether it's suitable and safe for you.",
    urdu: "ڈرماٹولوجسٹ یہ جائزہ لیں گے کہ یہ آپ کے لیے موزوں اور محفوظ ہے یا نہیں۔",
    "roman-urdu": "Dermatologist assess karenge ke yeh aapke liye suitable aur safe hai ya nahi."
  },
  surgical: {
    english: "This needs a dermatologist consultation to confirm suitability — I can't provide procedural details.",
    urdu: "اس کے لیے موزونیت کی تصدیق کے لیے ڈرماٹولوجسٹ سے مشاورت ضروری ہے۔",
    "roman-urdu": "Iske liye suitability confirm karne ke liye dermatologist consultation zaroori hai — main procedural details nahi de sakta."
  },
  device: {
    english: "Results vary by individual — the dermatologist can advise what's right for your skin.",
    urdu: "نتائج ہر فرد کے لیے مختلف ہو سکتے ہیں — ڈرماٹولوجسٹ آپ کی جلد کے لیے مناسب رہنمائی کریں گے۔",
    "roman-urdu": "Results har individual ke liye vary karte hain — dermatologist aapki skin ke liye sahi rehnumai karenge."
  },
  general: { english: "", urdu: "", "roman-urdu": "" }
};

export function t<T extends unknown[]>(fn: TemplatedFn<T>, lang: Language, ...args: T): string {
  return pick(fn(...args), lang);
}

export const SUMMARY_LABELS: Record<Language, { name: string; phone: string; reason: string; date: string; time: string }> = {
  english: { name: "Name", phone: "Phone", reason: "Reason", date: "Date", time: "Time" },
  urdu: { name: "نام", phone: "فون", reason: "وجہ", date: "تاریخ", time: "وقت" },
  "roman-urdu": { name: "Naam", phone: "Phone", reason: "Reason", date: "Date", time: "Time" }
};
