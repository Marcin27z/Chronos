import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "tests/e2e/test-results",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
  use: {
    baseURL: "http://localhost:4322",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4322",
    url: "http://localhost:4322",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_KEY: process.env.SUPABASE_KEY || "",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
});
