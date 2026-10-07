import { describe, expect, it } from "vitest";
import { rankCandidates } from "./transfer-research";
import type { PlayerRoleInsight } from "./player-role-insights";
import type { ClubSchedule } from "./fixture-model";
const player = (id: string, changes = {}) =>
  ({
    playerId: id,
    name: id,
    window: "last_5",
    position: "Midfielder",
    teamCode: "ARS",
    price: 6,
    isEligible: true,
    hybridScore: 70,
    ...changes,
  }) as PlayerRoleInsight;
const club = {
  code: "ARS",
  average: 80,
  fixtures: [{ gw: 5 }],
  blankGameweeks: [],
} as unknown as ClubSchedule;
describe("transfer research shortlist", () => {
  it("excludes owned players, other roles, low samples and players above a price ceiling", () => {
    const result = rankCandidates(
      [
        player("owned"),
        player("eligible"),
        player("costly", { price: 9 }),
        player("provisional", { isEligible: false }),
        player("forward", { position: "Forward" }),
      ],
      [club],
      "Midfielder",
      new Set(["owned"]),
      7,
    );
    expect(result.map((row) => row.player.playerId)).toEqual(["eligible"]);
    expect(result[0].researchScore).toBe(73);
  });
  it("does not recommend candidates with missing scores or no future fixtures", () => {
    expect(
      rankCandidates(
        [player("missing", { hybridScore: null })],
        [club],
        "Midfielder",
        new Set(),
        20,
      ),
    ).toEqual([]);
    expect(
      rankCandidates(
        [player("blank")],
        [{ ...club, fixtures: [] }],
        "Midfielder",
        new Set(),
        20,
      ),
    ).toEqual([]);
  });
});
