import { defineConfig } from "@playwright/test";

// Isolated regression suite: all API/media requests are mocked, no backend needed.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /(?:images|reviews)\.spec\.ts/,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    screenshot: "only-on-failure",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "portrait", use: { viewport: { width: 390, height: 844 } } },
    { name: "landscape", use: { viewport: { width: 844, height: 390 } } },
  ],
});
