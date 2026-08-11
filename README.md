# Alamdin AI Receptionist

A portable, production-ready AI receptionist backend for **Dr. Alamdin Microscopic Dental Clinic and Implant Center** (Quetta, Pakistan). It answers clinic questions, collects appointment requests conversationally in English, Urdu, and Roman Urdu, and hands off to clinic staff for real confirmation — it never diagnoses, prescribes, or confirms an appointment on its own.

Ships with a working web chat UI for testing, an internal admin dashboard, and a channel-agnostic core so WhatsApp and voice can be bolted on later without touching the receptionist engine.

## Architecture

```
Patient
  │
  ▼
Web Chat  ──────┐              (future) WhatsApp / Voice Adapter
                 │                              │
                 ▼                              ▼
        POST /api/v1/chat  ◄─────────────────────
                 │
                 ▼
        Receptionist Engine (src/receptionist/ReceptionistEngine.ts)
                 │
        ┌────────┼─────────────┐
        ▼        ▼             ▼
   Intent      Appointment   Safety Guard
   Matching    State Machine (no diagnosis/
   (facts)     (one field    prescription/
               at a time)    false confirm)
        │        │             │
        ▼        ▼             ▼
   Clinic Facts   AI Provider (open-ended FAQ only)
   (config/clinic.ts)   │
        │          AIProvider interface
        │          ├─ OpenAICompatibleProvider (OpenAI/OpenRouter/etc.)
        │          └─ TemplateProvider (offline default, no API key needed)
        ▼
   Database (Prisma → SQLite dev / PostgreSQL prod)
   Conversation · Message · AppointmentRequest
```

Every channel (web today; WhatsApp/voice later) talks to the **same** `POST /api/v1/chat` endpoint and the **same** `processMessage()` engine function. Channel-specific code (e.g. a WhatsApp webhook adapter) would live outside `src/receptionist/` and simply translate inbound/outbound messages — see [Future WhatsApp Integration](#future-whatsapp-integration) below.

### Why facts are deterministic, not AI-generated

Fee, hours, location, doctor credentials, and contact info are matched by keyword (`src/receptionist/intents.ts`) and answered directly from `src/config/clinic.ts` — the AI model is **never** asked to generate these. This is what makes it impossible for a patient to talk the receptionist into a wrong price or wrong hours (see `tests/clinicFacts.test.ts`). The AI provider is only invoked for genuinely open-ended dental FAQs / small talk that don't match a known intent, and even then under a strict system prompt that forbids diagnosis, prescriptions, and appointment confirmation.

### Why the appointment flow is a state machine, not a prompt

Field collection (name → phone → reason → date → time → summary → confirm) is deterministic code (`src/receptionist/stateMachine.ts`), not LLM-driven. That guarantees: exactly one question per turn, already-known fields are never re-asked, dates/times are parsed the same way every time, and the "this is a request, not a confirmed appointment" language can never be dropped by a model having an off day.

## Project structure

```
src/
  ai/              AIProvider interface + OpenAI-compatible & offline Template providers
  appointments/     AppointmentRequest persistence
  config/           env.ts (validated env vars), clinic.ts (verified clinic facts)
  controllers/       Express route handlers
  conversations/     Conversation + Message persistence
  database/          Prisma client singleton
  middleware/         validation, rate limiting, admin auth, error handling
  receptionist/       the engine: intents, state machine, safety, responses (EN/UR/Roman Urdu)
  routes/             Express routers
  types/             shared types + Zod schemas
  utils/             date/time parsing, language detection, sanitization, logger
  app.ts / server.ts
prisma/              schema.prisma, migrations/
tests/               vitest + supertest, 51 tests
web/public/           chat UI (index.html) + admin dashboard (admin.html)
```

## Getting started

Requires Node.js 18.18+ (tested on Node 22).

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # defaults work out of the box (SQLite + offline AI)
npx prisma migrate deploy   # creates prisma/dev.db
npm run dev                 # http://localhost:3000
```

Open `http://localhost:3000` for the patient chat UI, or `http://localhost:3000/admin.html` for the staff dashboard (default admin key: `change-me-admin-key`, set your own via `ADMIN_API_KEY`).

### Other scripts

```bash
npm run build      # compiles TypeScript to dist/
npm start          # runs the compiled build (dist/server.js)
npm test           # runs the full test suite against a dedicated SQLite test DB
npm run prisma:studio  # browse the database visually
```

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | `file:./dev.db` | SQLite by default; Postgres connection string for production (see below) |
| `AI_PROVIDER` | auto | `template` if `AI_API_KEY` is empty, otherwise `openai-compatible` (auto-selected, no need to set manually) |
| `AI_API_KEY` | *(empty)* | Leave empty to run fully offline with the built-in template provider |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible `/chat/completions` endpoint (OpenAI, OpenRouter, a Gemini-compatible proxy, etc.) |
| `AI_MODEL` | `gpt-4o-mini` | Model name for the configured provider |
| `CORS_ORIGIN` | `*` | Comma-separated allow-list, or `*` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `60` | Requests per window per IP on `/api/v1/*` |
| `ADMIN_API_KEY` | `change-me-admin-key` | Required in `X-Admin-Key` header for appointment listing/status endpoints and the admin UI. **Change this in production.** |
| `LOG_LEVEL` | `info` | pino log level |

No AI API key is required to run the full system end-to-end — the offline `TemplateProvider` handles anything the deterministic intent matcher can't, with an honest "please call us" fallback. Add `AI_API_KEY` any time to upgrade small-talk/FAQ replies to a real LLM without changing any other code.

## API

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Liveness check |
| `POST /api/v1/chat` | none | Main receptionist endpoint: `{ conversationId?, message }` → `{ conversationId, message, state }` |
| `GET /api/v1/conversations/:id` | none (unguessable id) | Full transcript + current state for one conversation |
| `POST /api/v1/appointments` | none | Direct appointment-request creation (bypasses chat; for future non-chat clients) |
| `GET /api/v1/appointments` | `X-Admin-Key` | List all appointment requests (optional `?status=` filter) |
| `POST /api/v1/appointments/:id/status` | `X-Admin-Key` | Staff-only status transition |

`POST /api/v1/chat` request/response shape:

```json
// Request
{ "conversationId": "optional-existing-id", "message": "Mujhe appointment chahiye" }

// Response
{
  "conversationId": "clx...",
  "message": "Bilkul! Aapka naam kya hai?",
  "state": {
    "stage": "COLLECTING_NAME",
    "name": null, "phone": null, "reason": null,
    "preferredDate": null, "preferredTime": null
  }
}
```

Appointment statuses: `NEW → PENDING_CONFIRMATION → CONFIRMED_BY_CLINIC` (or `CANCELLED` / `COMPLETED`). The engine only ever creates `NEW`; every other transition is a manual staff action through the admin dashboard or the status endpoint.

## Switching to PostgreSQL for production

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to a real Postgres connection string.
3. Run `npm run prisma:deploy` (applies migrations) and `npm run build && npm start`, or use the Docker setup below.

No application code changes are needed — Prisma Client's API is identical across both providers.

## Deployment (Docker)

```bash
docker compose up --build
```

This builds the app, runs pending Prisma migrations automatically on boot, and serves on port 3000 with a persisted SQLite volume. Configure via a `.env` file or environment variables passed to `docker compose` (see the table above — `AI_API_KEY`, `ADMIN_API_KEY`, etc.). `docker-compose.yml` includes a commented-out Postgres service for a full production setup — see the comments in that file.

Without Docker: `npm run build`, ship the `dist/`, `prisma/`, `web/`, and `node_modules/` (or `package.json` + `npm ci --omit=dev`) directories to any Node 18+ host, set env vars, run `npx prisma migrate deploy && npm start`.

## Tests

```bash
npm test
```

51 tests across 7 files (`tests/`), covering: health check, every clinic fact (fee/hours/location/doctor/contact), refusal to let a patient override a fact, medical-safety refusals (no diagnosis/prescription), emergency guidance, the full appointment flow (one question at a time, memory of already-given fields, invalid-input re-prompting, ambiguous date/time clarification, summary display, request creation with status `NEW`, and an explicit assertion that the reply never says "Appointment Confirmed"), date/time normalization edge cases, English/Urdu/Roman Urdu responses, and the full public API surface (validation, admin auth, status transitions).

Tests run against a dedicated `prisma/test.db` SQLite database (via `.env.test`), fully isolated from your dev database, and use the offline `TemplateProvider` so the suite needs no network access or API key.

## Future WhatsApp integration

Not implemented yet, by design. When it's time:

```
WhatsApp Cloud API / Twilio  →  WhatsApp Adapter  →  POST /api/v1/chat  →  Receptionist Engine  →  reply  →  WhatsApp
```

The adapter is a new, separate module (e.g. `src/channels/whatsapp/`) that translates WhatsApp webhook payloads into calls to the existing `processMessage()` function (or the `/api/v1/chat` HTTP endpoint) and relays the reply back — no changes to `src/receptionist/` required, since the engine is already channel-agnostic (`Conversation.channel` field already exists in the schema for exactly this).

## Future voice integration

Same pattern: a voice adapter (Vapi, Retell, Twilio Voice, WebRTC) converts speech ⇄ text at the edges and calls the same chat endpoint. No receptionist-engine changes required.

## Security

- All input validated with Zod (`src/types/schemas.ts`).
- Rate limiting on `/api/v1/*` (`express-rate-limit`).
- `helmet` security headers, configurable CORS.
- Admin-only endpoints gated behind `X-Admin-Key`, never exposed to the patient-facing chat UI.
- AI API keys live only in server-side env vars, never sent to the browser.
- Clinic facts are hard-coded from verified data and cannot be overridden by user input (see `tests/clinicFacts.test.ts`).
- Structured request logging via `pino`/`pino-http`.

## Known limitations

- Language detection runs per-message; a message with no letters (e.g. a bare phone number) keeps the conversation's last known language rather than guessing.
- The safety/emergency keyword lists are curated but not exhaustive — they cover the phrasing patterns specified in the project brief; broadening coverage (e.g. with an AI-based safety classifier) is a natural next step.
- `POST /api/v1/appointments` (direct creation) is intentionally left as patient-trust-level (unauthenticated, like the chat endpoint) for future non-chat intake widgets; add auth there if that changes.
- No real-time slot availability system yet — every request is confirmed by a human via phone, by design (see project brief §6).
- SQLite is the default for zero-setup portability; high-concurrency production deployments should switch to PostgreSQL (one-line schema change, see above).
