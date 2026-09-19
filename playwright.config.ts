import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    locale: "fa-IR"
  },
  webServer: {
    command: "npm start",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000
  }
});