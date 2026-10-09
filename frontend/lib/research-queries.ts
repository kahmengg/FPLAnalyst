import { queryOptions } from "@tanstack/react-query";
import { DATA_SEASON } from "./season";
import {
  getDashboardSummary,
  getFixtures,
  getPlayerRoleInsights,
  getPlayerGameweeksById,
} from "./supabase";

// Resource keys let pages share the same reads instead of hiding them in bundles.
export const summaryQuery = queryOptions({
  queryKey: ["dashboard-summary", DATA_SEASON.key],
  queryFn: getDashboardSummary,
});
export const fixturesQuery = queryOptions({
  queryKey: ["fixtures", DATA_SEASON.key],
  queryFn: () => getFixtures(),
});
export const rolesQuery = queryOptions({
  queryKey: ["player-role-insights", DATA_SEASON.key],
  queryFn: getPlayerRoleInsights,
});

export function playerGameweeksQuery(playerId: string, limitGws = 5) {
  return queryOptions({
    queryKey: ["player-gameweeks", DATA_SEASON.key, playerId, limitGws],
    queryFn: () => getPlayerGameweeksById(playerId, limitGws),
    enabled: Boolean(playerId),
  })
}
