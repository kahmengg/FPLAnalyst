-- Supabase schema for FPL Analyst
-- This schema supports the current dashboard pages and the eventual move away from
-- file-based JSON exports.

create extension if not exists pgcrypto;

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer unique,
  player_name text not null,
  web_name text,
  team_id uuid references teams(id) on delete set null,
  position smallint not null check (position between 1 and 4),
  cost numeric(5,2) not null,
  ownership numeric(6,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_players_position on players(position);

-- Match and gameweek data
create table if not exists fixtures (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  gameweek smallint not null,
  home_team_id uuid not null references teams(id) on delete cascade,
  away_team_id uuid not null references teams(id) on delete cascade,
  fixture_label text,

  home_attacking_fixture_rating numeric(6,2),
  home_defensive_fixture_rating numeric(6,2),
  home_attack_rank smallint,
  home_defense_rank smallint,
  home_attack_fdr numeric(6,2),
  home_defense_fdr numeric(6,2),
  home_overall_fdr numeric(6,2),

  away_attacking_fixture_rating numeric(6,2),
  away_defensive_fixture_rating numeric(6,2),
  away_attack_rank smallint,
  away_defense_rank smallint,
  away_attack_fdr numeric(6,2),
  away_defense_fdr numeric(6,2),
  away_overall_fdr numeric(6,2),

  created_at timestamptz not null default now(),
  unique (season_key, gameweek, home_team_id, away_team_id)
);

create index if not exists idx_fixtures_gameweek on fixtures(season_key, gameweek);
create index if not exists idx_fixtures_home_team on fixtures(home_team_id);
create index if not exists idx_fixtures_away_team on fixtures(away_team_id);

create table if not exists player_gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  player_id uuid not null references players(id) on delete cascade,
  gameweek smallint not null,
  opponent text,
  was_home boolean,
  now_cost numeric(5,2),
  selected_by_percent numeric(6,2),
  total_points numeric(7,2),
  minutes smallint,
  goals smallint,
  assists smallint,
  clean_sheets smallint,
  xg numeric(7,3),
  xa numeric(7,3),
  xgi numeric(7,3),
  xp numeric(7,3),
  expected_points numeric(7,3),
  pvsxp numeric(7,3),
  shots smallint,
  shots_on_target smallint,
  shots_in_box smallint,
  key_passes smallint,
  chances_created smallint,
  touches smallint,
  touches_opp_box smallint,
  defensive_contribution numeric(7,3),
  xgc numeric(7,3),
  goals_conceded smallint,
  expected_clean_sheet numeric(7,3),
  clearances_blocks_interceptions smallint,
  recoveries smallint,
  tackles smallint,
  expected_goals_conceded numeric(7,3),
  expected_goal_involvements numeric(7,3),
  non_penalty_expected_goal_involvements numeric(7,3),
  non_penalty_expected_goals numeric(7,3),
  non_penalty_goals smallint,
  clean_sheet boolean,
  created_at timestamptz not null default now(),
  unique (season_key, player_id, gameweek)
);

create index if not exists idx_player_gameweeks_player on player_gameweeks(player_id, season_key, gameweek);
create index if not exists idx_player_gameweeks_gameweek on player_gameweeks(season_key, gameweek);

-- Aggregated team analytics
create table if not exists team_rankings (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  team_id uuid not null references teams(id) on delete cascade,
  ranking_type text not null check (ranking_type in ('overall', 'attack', 'defense')),
  overall_rank smallint,
  attack_rank smallint,
  defense_rank smallint,
  overall_strength numeric(8,4),
  attack_strength numeric(8,4),
  defense_strength numeric(8,4),
  goals_per_game numeric(8,2),
  expected_goals_per_game numeric(8,2),
  goals_conceded_per_game numeric(8,2),
  clean_sheet_rate numeric(8,4),
  defensive_contribution numeric(8,2),
  created_at timestamptz not null default now(),
  unique (season_key, team_id, ranking_type)
);

create index if not exists idx_team_rankings_type on team_rankings(season_key, ranking_type);
create index if not exists idx_team_rankings_team on team_rankings(team_id);

create table if not exists team_fixture_summary (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  team_id uuid not null references teams(id) on delete cascade,
  avg_attack_difficulty numeric(8,3),
  avg_defense_difficulty numeric(8,3),
  overall_difficulty numeric(8,3),
  near_term_home_fixtures smallint,
  medium_term_home_fixtures smallint,
  near_term_rating numeric(8,3),
  medium_term_rating numeric(8,3),
  fixture_swing numeric(8,3),
  swing_category text,
  form_context text,
  created_at timestamptz not null default now(),
  unique (season_key, team_id)
);

create index if not exists idx_team_fixture_summary_team on team_fixture_summary(team_id, season_key);

-- Flexible player insight table for the existing top performers views
create table if not exists player_insights (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  insight_type text not null,
  player_id uuid references players(id) on delete set null,
  player_name text not null,
  team_id uuid references teams(id) on delete set null,
  team_name text,
  team_short text,
  position smallint,
  rank smallint,
  sort_metric numeric(12,4),
  secondary_metric numeric(12,4),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_player_insights_type on player_insights(season_key, insight_type);
create index if not exists idx_player_insights_player on player_insights(player_id);
create index if not exists idx_player_insights_rank on player_insights(season_key, insight_type, rank);

-- JSON cache for pages that still want the current endpoint shape during migration.
create table if not exists analysis_reports (
  slug text primary key,
  report_name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Views used by the current dashboard.
create or replace view dashboard_summary as
select
  (select count(*)::int from players) as total_players,
  (select count(*)::int from teams) as total_teams,
  coalesce((select max(gameweek)::int from fixtures), 0) as total_gameweeks,
  now() as generated_at;

create or replace view player_search_view as
select
  p.id,
  p.fpl_id,
  p.player_name as name,
  coalesce(p.web_name, p.player_name) as web_name,
  t.name as team,
  t.short_name as team_short,
  p.position,
  p.cost,
  p.ownership,
  p.updated_at
from players p
left join teams t on t.id = p.team_id;

alter table teams enable row level security;
alter table players enable row level security;
alter table fixtures enable row level security;
alter table player_gameweeks enable row level security;
alter table team_rankings enable row level security;
alter table team_fixture_summary enable row level security;
alter table player_insights enable row level security;
alter table analysis_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'public read teams'
  ) then
    create policy "public read teams" on teams for select using (true);
    create policy "public insert teams" on teams for insert with check (true);
    create policy "public update teams" on teams for update using (true) with check (true);
    create policy "public delete teams" on teams for delete using (true);
    create policy "public read players" on players for select using (true);
    create policy "public insert players" on players for insert with check (true);
    create policy "public update players" on players for update using (true) with check (true);
    create policy "public delete players" on players for delete using (true);
    create policy "public read fixtures" on fixtures for select using (true);
    create policy "public insert fixtures" on fixtures for insert with check (true);
    create policy "public update fixtures" on fixtures for update using (true) with check (true);
    create policy "public delete fixtures" on fixtures for delete using (true);
    create policy "public read player_gameweeks" on player_gameweeks for select using (true);
    create policy "public insert player_gameweeks" on player_gameweeks for insert with check (true);
    create policy "public update player_gameweeks" on player_gameweeks for update using (true) with check (true);
    create policy "public delete player_gameweeks" on player_gameweeks for delete using (true);
    create policy "public read team_rankings" on team_rankings for select using (true);
    create policy "public insert team_rankings" on team_rankings for insert with check (true);
    create policy "public update team_rankings" on team_rankings for update using (true) with check (true);
    create policy "public delete team_rankings" on team_rankings for delete using (true);
    create policy "public read team_fixture_summary" on team_fixture_summary for select using (true);
    create policy "public insert team_fixture_summary" on team_fixture_summary for insert with check (true);
    create policy "public update team_fixture_summary" on team_fixture_summary for update using (true) with check (true);
    create policy "public delete team_fixture_summary" on team_fixture_summary for delete using (true);
    create policy "public read player_insights" on player_insights for select using (true);
    create policy "public insert player_insights" on player_insights for insert with check (true);
    create policy "public update player_insights" on player_insights for update using (true) with check (true);
    create policy "public delete player_insights" on player_insights for delete using (true);
    create policy "public read analysis_reports" on analysis_reports for select using (true);
    create policy "public insert analysis_reports" on analysis_reports for insert with check (true);
    create policy "public update analysis_reports" on analysis_reports for update using (true) with check (true);
    create policy "public delete analysis_reports" on analysis_reports for delete using (true);
  end if;
end
$$;
