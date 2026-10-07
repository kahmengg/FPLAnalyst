import { expect, it } from "vitest";
import { reviewPlayer } from "./squad-review";
import { parseLeagueId } from "./league-search";
import type { ImportedPlayer } from "./guest-team";
import type { PlayerRoleInsight } from "./player-role-insights";
const player = { status: "a" } as ImportedPlayer;
const insight = {
  position: "Forward",
  attackScore: 65,
  isEligible: true,
  minuteSecurity: 0.8,
  appearances: 5,
  sixtyMinuteAppearances: 4,
} as PlayerRoleInsight;
it("prioritises availability, treats missing evidence as uncertainty and preserves hold", () => {
  expect(
    reviewPlayer({ ...player, status: "i", news: "Injured" }, insight).priority,
  ).toBe(3);
  expect(reviewPlayer(player).label).toBe("More evidence needed");
  expect(reviewPlayer(player, insight).label).toBe("Hold for now");
  expect(
    reviewPlayer(player, { ...insight, minuteSecurity: 0.4 }).priority,
  ).toBe(2);
  expect(reviewPlayer(player, { ...insight, attackScore: 40 }).label).toBe(
    "Compare alternatives",
  );
});
it("accepts only numeric leagues or official standings links", () => {
  expect(parseLeagueId("42")).toBe(42);
  expect(
    parseLeagueId("https://fantasy.premierleague.com/leagues/42/standings/c"),
  ).toBe(42);
  expect(
    parseLeagueId("https://example.com/leagues/42/standings/c"),
  ).toBeNull();
  expect(parseLeagueId("abc123")).toBeNull();
});
