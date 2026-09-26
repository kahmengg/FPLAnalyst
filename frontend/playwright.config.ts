import { defineConfig } from "@playwright/test"
import { existsSync } from "node:fs"

const windowsChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const localChrome = process.platform === "win32" && existsSync(windowsChrome) ? windowsChrome : undefined

export default defineConfig({
  testDir: "./tests/e2e",
  expect: { timeout: 60_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", launchOptions: localChrome ? { executablePath: localChrome } : undefined },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
})
