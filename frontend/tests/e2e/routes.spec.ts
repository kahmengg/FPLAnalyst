import { expect, test } from "@playwright/test"

const routes = ["/", "/my-team", "/top-performers", "/team-rankings", "/fixture-analysis", "/player-trends", "/transfer-targets"]

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

test("transfer research starts with a focused candidate shortlist", async ({ page }) => {
  await page.goto("/transfer-targets")

  // The planner owns player choices; Fixtures owns the full schedule grid.
  await expect(page.locator("main article")).toHaveCount(12, { timeout: 30_000 })
  await expect(page.getByRole("link", { name: "Explore full schedule" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Show all .* candidates/i })).toBeVisible()
})

test("guest import remembers a confirmed team and forgets it on request", async ({ page }) => {
  // Mock only the external import response; exercise real browser state and UI.
  await page.route("**/api/fpl-team?entry=123", route => route.fulfill({ json: {
    entry: 123, name: "Browser test squad", season: "2026_27", gameweek: 5, fetchedAt: "2026-10-07T08:00:00Z",
    players: Array.from({ length: 15 }, (_, index) => ({ element: 900000 + index, name: `Imported player ${index + 1}`, club: "ARS", position: [1,2,2,2,2,3,3,3,3,4,4,1,2,3,4][index], price: 5, status: "a", news: "", order: index + 1, captain: index === 0, viceCaptain: index === 1 })),
  } }))
  await page.goto("/my-team")
  await page.getByLabel("Team ID or FPL team link", { exact: true }).fill("123")
  await page.getByRole("button", { name: "Preview team", exact: true }).click()
  await page.getByRole("checkbox", { name: "Remember on this device" }).check()
  await page.getByRole("button", { name: "Use this team", exact: true }).click()
  await expect(page.getByRole("button", { name: /^View Imported player/ })).toHaveCount(15)
  await expect(page.getByRole("group", { name: "Defenders", exact: true }).getByRole("button")).toHaveCount(4)
  await expect(page.getByRole("group", { name: "Bench", exact: true }).getByRole("button")).toHaveCount(4)
  await page.getByRole("button", { name: "View Imported player 11", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Imported player 11", exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "Browser test squad", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Forget this team", exact: true }).click()
  await expect(page.locator("main article")).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Find your FPL team", exact: true })).toBeVisible()
})

test("guest import gives a useful validation error for a team name", async ({ page }) => {
  await page.goto("/my-team")
  await page.getByLabel("Team ID or FPL team link", { exact: true }).fill("My imaginary team")
  await page.getByRole("button", { name: "Preview team", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Enter a numeric team ID" })).toHaveText("Enter a numeric team ID or an official FPL team link.")
})

test("research navigation preserves the selected calendar window", async ({ page }) => {
  await page.goto("/transfer-targets?gw=6&horizon=4&position=Defender&team=ARS")
  const schedule = page.getByRole("navigation", { name: "Weekly research workflow" }).getByRole("link", { name: "Schedule", exact: true })
  await expect(schedule).toHaveAttribute("href", /gw=6&horizon=4&position=Defender&club=ARS/)
  await schedule.click()
  await expect(page).toHaveURL(/gw=6&horizon=4&position=Defender&club=ARS/)
})

test("league-name lookup shows coverage and previews the selected entry", async ({ page }) => {
  await page.route("**/api/fpl-search?**", route => route.fulfill({ json: { league: "Friends", scanned: 500, complete: false, matches: [{ entry: 123, name: "Dream Team" }, { entry: 456, name: "Dream Team" }] } }))
  await page.route("**/api/fpl-team?entry=456", route => route.fulfill({ json: { entry: 456, name: "Dream Team", season: "2026_27", gameweek: 5, fetchedAt: "2026-10-07T08:00:00Z", players: [] } }))
  await page.goto("/my-team")
  await page.getByRole("button", { name: "Name in a league", exact: true }).click()
  await page.getByLabel("Classic league ID or link").fill("https://fantasy.premierleague.com/leagues/42/standings/c")
  await page.getByLabel("Fantasy team name", { exact: true }).fill("Dream")
  await page.getByRole("button", { name: "Search league", exact: true }).click()
  await expect(page.getByText(/Partial coverage: only the first 10 standings pages/)).toBeVisible()
  await page.getByRole("button", { name: "Dream Team Team 456", exact: true }).click()
  await expect(page.getByText("Dream Team · Team 456", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Use this team", exact: true })).toBeVisible()
})
