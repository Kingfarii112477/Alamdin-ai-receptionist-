import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env.test", override: true });

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
