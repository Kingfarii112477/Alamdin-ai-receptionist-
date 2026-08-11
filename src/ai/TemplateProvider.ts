import { CLINIC } from "../config/clinic";
import type { Language } from "../types/conversation";
import type { AIGenerateParams, AIProvider } from "./AIProvider";

const FALLBACK: Record<Language, string> = {
  english: `I don't have an exact answer for that. Please call the clinic at ${CLINIC.phone} and our team will help you directly.`,
  urdu: `اس بارے میں مجھے حتمی معلومات نہیں ہیں۔ براہ کرم کلینک کو ${CLINIC.phone} پر کال کریں، ہماری ٹیم آپ کی رہنمائی کرے گی۔`,
  "roman-urdu": `Is baare mein mujhe exact jankari nahi hai. Baraye meharbani clinic ko ${CLINIC.phone} par call karein, hamari team aapki madad karegi.`
};

/**
 * Zero-dependency, offline default provider. Used automatically whenever no
 * AI_API_KEY is configured, so the whole system (dev, CI, tests) works
 * end-to-end without any external network access or vendor account. It
 * intentionally never invents facts — it just points the patient to a human.
 */
export class TemplateProvider implements AIProvider {
  readonly name = "template";

  async generateReply({ language }: AIGenerateParams): Promise<string> {
    return FALLBACK[language];
  }
}
