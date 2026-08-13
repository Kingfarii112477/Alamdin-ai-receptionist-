import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1).default("file:./dev.db"),

  // AI provider abstraction — never hard-code a single vendor.
  // AI_PROVIDER=template requires no key and is used automatically when
  // AI_API_KEY is absent, so the app always runs end-to-end out of the box.
  AI_PROVIDER: z.enum(["openai-compatible", "template"]).default("template"),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  // Optional, provider-agnostic pass-through. Some OpenAI-compatible
  // providers (e.g. Gemini's reasoning models) spend part of max_tokens on
  // hidden "thinking" tokens before the visible reply, which can truncate
  // short receptionist responses. Set to "none"/"low" for such providers;
  // leave unset for providers that don't support/need it (e.g. plain
  // OpenAI gpt-4o-mini).
  AI_REASONING_EFFORT: z.string().optional(),

  CORS_ORIGIN: z.string().default("*"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  ADMIN_API_KEY: z.string().default("change-me-admin-key"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // WhatsApp Business Cloud API adapter (src/channels/whatsapp/) — all
  // optional so the app runs exactly as before when WhatsApp isn't
  // configured. GET /api/v1/webhooks/whatsapp verification and outbound
  // sends simply fail closed until these are set. Never hard-code these —
  // see README.md → "WhatsApp integration".
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const data = parsed.data;

export const env = {
  ...data,
  // Auto-select the real provider once a key is actually configured, so
  // operators only need to set AI_API_KEY and don't have to also flip
  // AI_PROVIDER by hand.
  AI_PROVIDER: data.AI_API_KEY && data.AI_API_KEY.length > 0 ? "openai-compatible" : data.AI_PROVIDER,
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test"
} as const;

export type Env = typeof env;
