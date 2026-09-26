import { expect, test } from "@playwright/test"

const routes = ["/", "/top-performers", "/team-rankings", "/fixture-analysis", "/player-trends", "/transfer-targets"]

for (const route of routes) {
  test(`${route} loads its primary content`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator("main")).toBeVisible()
    await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 })
  })
}

test("weekly workflow preserves transfer horizon in the URL", async ({ page }) => {
  await page.goto("/transfer-targets?horizon=4")
  await expect(page.locator("#fixture-horizon")).toHaveValue("4", { timeout: 30_000 })
})

test("top players reveals complexity progressively", async ({ page }) => {
  await page.goto("/top-performers")

  // The map is the approachable default; the dense table appears only on request.
  await expect(page.getByRole("heading", { name: /score vs points per 90/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("heading", { name: /leaderboard/i })).toBeHidden()
  await page.getByRole("button", { name: "Ranked list" }).click()
  await expect(page.getByRole("heading", { name: /leaderboard/i })).toBeVisible()
})

test("long rankings start with a focused top ten", async ({ page }) => {
  await page.goto("/transfer-targets")

  // Desktop and mobile both derive from the same ten-team shortlist.
  await expect(page.locator("tbody tr")).toHaveCount(10, { timeout: 30_000 })
  await expect(page.getByRole("button", { name: /Show all 20 clubs/i })).toBeVisible()
})
