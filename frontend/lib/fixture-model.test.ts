import { describe, expect, it } from "vitest";
import {
  buildSchedules,
  gameweekWindow,
  type ModelFixture,
} from "./fixture-model";

const side = (name: string, rating: number) => ({
  name,
  short_name: name,
  fdr: { overall: rating, attack: rating, defense: rating },
});
const match = (gw: number, finished = false): ModelFixture => ({
  gw,
  finished,
  home_team: side("ARS", 70),
  away_team: side("CHE", 40),
});

describe("shared fixture window", () => {
  it("uses calendar gameweeks including blanks, bounded by season end", () => {
    expect(gameweekWindow(5, 3)).toEqual([5, 6, 7]);
    expect(gameweekWindow(37, 3)).toEqual([37, 38]);
  });
  it("keeps both double-gameweek matches and excludes played/out-of-window games", () => {
    const rows = buildSchedules(
      [match(4), match(5, true), match(6), match(6), match(8)],
      5,
      3,
    );
    expect(rows[0].fixtures).toHaveLength(2);
    expect(rows[0].blankGameweeks).toEqual([5, 7]);
    expect(rows[0].average).toBe(70);
  });
  it("retains clubs with no remaining matches without inventing historical fixtures", () => {
    expect(buildSchedules([match(5, true)], 6, 3)[0].fixtures).toEqual([]);
    expect(buildSchedules([match(5, true)], 6, 3)[0].average).toBe(0);
  });
});
