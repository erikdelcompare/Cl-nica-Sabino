import { defineConfig, devices } from "@playwright/test";

// Testes ponta a ponta contra o servidor de produção local (npm run build && npm run start -- -p 3100).
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "off",
    actionTimeout: 20_000,
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: "fluxo", use: { ...devices["Desktop Chrome"] } }],
});
