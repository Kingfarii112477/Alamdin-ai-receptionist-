import { CLINIC } from "../config/clinic";
import type { Language } from "../types/conversation";

type Templated = Record<Language, string>;
type TemplatedFn<T extends unknown[]> = (...args: T) => Templated;

function pick(t: Templated, lang: Language): string {
  return t[lang];
}

export const R = {
  greeting: (): Templated => ({
    english: `Assalam-o-Alaikum! Welcome to ${CLINIC.businessName}. How can I help you today?`,
    urdu: `السلام علیکم! ${CLINIC.businessName} میں خوش آمدید۔ میں آپ کی کیا مدد کر سکتا ہوں؟`,
    "roman-urdu": `Assalam-o-Alaikum! ${CLINIC.businessName} mein khush aamdeed. Main aapki kya madad kar sakta hoon?`
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
    english: "Thanks. What's the reason for your visit?",
    urdu: "شکریہ۔ آپ کس وجہ سے کلینک آنا چاہتے ہیں؟",
    "roman-urdu": "Shukriya. Aap kis wajah se clinic visit karna chahte hain?"
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
    english: `Thank you! Your appointment request has been received.\n\nOur team will contact you at ${CLINIC.phone} to confirm your requested date and time.\n\nNote: This is an appointment request, not a confirmed appointment.`,
    urdu: `شکریہ! آپ کی اپائنٹمنٹ کی درخواست موصول ہو گئی ہے۔\n\nہماری ٹیم آپ کے مطلوبہ دن اور وقت کی تصدیق کے لیے ${CLINIC.phone} پر آپ سے رابطہ کرے گی۔\n\nنوٹ: یہ اپائنٹمنٹ کی درخواست ہے، کنفرم اپائنٹمنٹ نہیں۔`,
    "roman-urdu": `Shukriya! Aapki appointment request receive ho gayi hai.\n\nHamari team aapke requested date aur time ko confirm karne ke liye aapse ${CLINIC.phone} par rabta karegi.\n\nNote: Yeh appointment request hai, confirmed appointment nahi.`
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

  feeInfo: (): Templated => ({
    english: `Our consultation fee is PKR ${CLINIC.consultationFeePKR}.`,
    urdu: `ہماری کنسلٹیشن فیس ${CLINIC.consultationFeePKR} روپے ہے۔`,
    "roman-urdu": `Consultation fee PKR ${CLINIC.consultationFeePKR} hai.`
  }),

  hoursInfo: (which: "clinic" | "hospital" | "both"): Templated => {
    const clinicLine = `${CLINIC.hours.privateClinic.label}: ${CLINIC.hours.privateClinic.days}, ${CLINIC.hours.privateClinic.time}`;
    const hospitalLine = `${CLINIC.hours.jelaniHospital.label}: ${CLINIC.hours.jelaniHospital.days}, ${CLINIC.hours.jelaniHospital.time}`;
    if (which === "clinic") {
      return {
        english: `Our clinic timings are ${CLINIC.hours.privateClinic.days}, ${CLINIC.hours.privateClinic.time}.`,
        urdu: `کلینک کے اوقات ${CLINIC.hours.privateClinic.days}، ${CLINIC.hours.privateClinic.time} ہیں۔`,
        "roman-urdu": `Clinic ke timings ${CLINIC.hours.privateClinic.days}, ${CLINIC.hours.privateClinic.time} hain.`
      };
    }
    if (which === "hospital") {
      return {
        english: `At Jelani Hospital, Dr. Alamdin is available ${CLINIC.hours.jelaniHospital.days}, ${CLINIC.hours.jelaniHospital.time}.`,
        urdu: `جیلانی ہسپتال میں ڈاکٹر علمدین ${CLINIC.hours.jelaniHospital.days}، ${CLINIC.hours.jelaniHospital.time} دستیاب ہوتے ہیں۔`,
        "roman-urdu": `Jelani Hospital mein Dr. Alamdin ${CLINIC.hours.jelaniHospital.days}, ${CLINIC.hours.jelaniHospital.time} available hote hain.`
      };
    }
    return {
      english: `${clinicLine}\n${hospitalLine}`,
      urdu: `پرائیویٹ کلینک: ${CLINIC.hours.privateClinic.days}، ${CLINIC.hours.privateClinic.time}\nجیلانی ہسپتال: ${CLINIC.hours.jelaniHospital.days}، ${CLINIC.hours.jelaniHospital.time}`,
      "roman-urdu": `${clinicLine}\n${hospitalLine}`
    };
  },

  locationInfo: (): Templated => ({
    english: `We're located at ${CLINIC.location.address}.`,
    urdu: `ہمارا کلینک ${CLINIC.location.address} پر واقع ہے۔`,
    "roman-urdu": `Hamara clinic ${CLINIC.location.address} par hai.`
  }),

  doctorInfo: (): Templated => {
    const quals = CLINIC.doctor.qualifications.join(", ");
    return {
      english: `${CLINIC.doctor.name} — ${quals}. ${CLINIC.doctor.experienceYears}+ years of experience.`,
      urdu: `${CLINIC.doctor.name} — ${quals}۔ ${CLINIC.doctor.experienceYears} سال سے زائد کا تجربہ۔`,
      "roman-urdu": `${CLINIC.doctor.name} — ${quals}. ${CLINIC.doctor.experienceYears}+ saal ka tajurba.`
    };
  },

  contactInfo: (): Templated => ({
    english: `You can reach us at ${CLINIC.phone} (also on WhatsApp: ${CLINIC.whatsappUrl}).`,
    urdu: `آپ ہم سے ${CLINIC.phone} پر رابطہ کر سکتے ہیں (واٹس ایپ: ${CLINIC.whatsappUrl})۔`,
    "roman-urdu": `Aap humse ${CLINIC.phone} par rabta kar sakte hain (WhatsApp: ${CLINIC.whatsappUrl}).`
  }),

  ratingsInfo: (): Templated => {
    const list = CLINIC.ratings.map((r) => `${r.source}: ${r.score} (${r.detail})`).join(", ");
    return {
      english: `We're rated ${list}.`,
      urdu: `ہماری ریٹنگز: ${list}۔`,
      "roman-urdu": `Hamari ratings: ${list}.`
    };
  },

  socialInfo: (): Templated => ({
    english: `Find us on Instagram (${CLINIC.social.instagram}), Facebook (${CLINIC.social.facebook}), and TikTok (${CLINIC.social.tiktok}).`,
    urdu: `ہمیں انسٹاگرام (${CLINIC.social.instagram})، فیس بک (${CLINIC.social.facebook}) اور ٹک ٹاک (${CLINIC.social.tiktok}) پر تلاش کریں۔`,
    "roman-urdu": `Humein Instagram (${CLINIC.social.instagram}), Facebook (${CLINIC.social.facebook}), aur TikTok (${CLINIC.social.tiktok}) par follow karein.`
  }),

  safetyDecline: (): Templated => ({
    english: `I can't diagnose conditions or prescribe medication. Please book an in-clinic examination with the doctor for a proper assessment — call ${CLINIC.phone} to arrange it.`,
    urdu: `میں تشخیص یا دوا تجویز نہیں کر سکتا/سکتی۔ براہ کرم درست معائنے کے لیے کلینک وزٹ کریں۔ اپائنٹمنٹ کے لیے ${CLINIC.phone} پر رابطہ کریں۔`,
    "roman-urdu": `Main diagnosis nahi kar sakta/sakti. Aap apni symptoms ke saath clinic mein professional dental examination karwa sakte hain. Appointment ke liye ${CLINIC.phone} par rabta karein.`
  }),

  emergencyGuidance: (): Templated => ({
    english: `That sounds like it needs urgent attention. Please seek immediate professional dental/medical care, or call us right away at ${CLINIC.phone} so we can guide you.`,
    urdu: `یہ فوری توجہ کا معاملہ لگتا ہے۔ براہ کرم فوراً کسی ماہر ڈینٹل/میڈیکل ہیلپ سے رجوع کریں، یا ابھی ${CLINIC.phone} پر ہمیں کال کریں۔`,
    "roman-urdu": `Yeh urgent lag raha hai. Baraye meharbani foran professional dental/medical help lein, ya abhi ${CLINIC.phone} par humein call karein.`
  }),

  appointmentAlreadySubmittedIntro: (): Templated => ({
    english: "Would you like to submit a new appointment request?",
    urdu: "کیا آپ نئی اپائنٹمنٹ کی درخواست دینا چاہیں گے؟",
    "roman-urdu": "Kya aap nayi appointment request dena chahenge?"
  })
};

export function t<T extends unknown[]>(fn: TemplatedFn<T>, lang: Language, ...args: T): string {
  return pick(fn(...args), lang);
}

export const SUMMARY_LABELS: Record<Language, { name: string; phone: string; reason: string; date: string; time: string }> = {
  english: { name: "Name", phone: "Phone", reason: "Reason", date: "Preferred date", time: "Preferred time" },
  urdu: { name: "نام", phone: "فون", reason: "وجہ", date: "مطلوبہ تاریخ", time: "مطلوبہ وقت" },
  "roman-urdu": { name: "Naam", phone: "Phone", reason: "Reason", date: "Preferred date", time: "Preferred time" }
};

