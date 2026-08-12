// Netlify Functions entry point — wraps the existing Express app
// (unchanged, same createApp() used by src/server.ts, index.ts, and every
// other deploy target) with serverless-http so it can run as a single
// Netlify Function. Routing (/health, /api/v1/*) is handled by the
// redirects in netlify.toml; static assets are served directly from the
// public/ directory by Netlify's CDN and never reach this function.
import serverless from "serverless-http";
import { createApp } from "../../src/app";

export const handler = serverless(createApp());
