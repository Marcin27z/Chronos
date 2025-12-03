import { defineConfig } from "@playwright/test";

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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
});
