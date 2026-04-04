import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8080";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? "github" : "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  globalSetup: "./global-setup.ts",

  metadata: { apiUrl },

  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  outputDir: "./test-results",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: isCI
    ? undefined
    : {
        command: "pnpm dev",
        cwd: path.resolve(__dirname, ".."),
        url: frontendUrl,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
