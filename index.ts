// Vercel-specific entry point. Vercel deploys Express apps zero-config by
// looking for a default export at one of a few conventional paths — this
// file exists purely to satisfy that convention.
//
// Nothing else about the app changes: this just re-exports the same
// createApp() used by src/server.ts (npm run dev / Docker / other hosts).
// Static assets for Vercel are served from the root public/ directory
// (a copy of web/public — Vercel's Express integration ignores
// express.static() and requires public/** instead; see README).
//
// This file is NOT part of the local dev/Docker/Render/Zeabur build
// (tsconfig.json's rootDir is "src", and the Dockerfile never copies it) —
// Vercel's own bundler picks it up directly from the repo root.
import { createApp } from "./src/app";

export default createApp();
