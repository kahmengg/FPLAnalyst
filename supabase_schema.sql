-- ============================================================
-- FPL Analyst — Supabase Schema (Restructured)
-- Aligned with 4-page frontend: Dashboard / Players / Teams / Fixtures
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- CORE: Teams & Players
-- ============================================================

create table if not exists teams (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null unique,
  short_name  text    not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists players (
  id           uuid     primary key default gen_random_uuid(),
  fpl_id       integer  unique,
  player_name  text     not null,
  web_name     text,
  team_id      uuid     references teams(id) on delete set null,
  -- 1=GK 2=DEF 3=MID 4=FWD
  position     smallint not null check (position between 1 and 4),
  -- latest cost & ownership updated each ETL run
  cost         numeric(5,2) not null,
  ownership    numeric(6,2),
  is_active    boolean  not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_players_team     on players(team_id);
create index if not exists idx_players_position on players(position);

-- ============================================================
-- GAMEWEEK: Raw per-GW stats (powers the GW history popup)
-- ============================================================

create table if not exists player_gameweeks (
  id          uuid     primary key default gen_random_uuid(),
  season_key  text     not null,
  player_id   uuid     not null references players(id) on delete cascade,
  gameweek    smallint not null,

  -- context
  opponent    text,
  was_home    boolean,

  -- cost/ownership snapshot at this GW
  now_cost              numeric(5,2),
  selected_by_percent   numeric(6,2),

  -- output
  total_points          smallint,
  minutes               smallint,
  goals                 smallint,
  assists               smallint,
  clean_sheet           boolean,

  -- attacking
  xg                    numeric(6,3),
  xa                    numeric(6,3),
  xgi                   numeric(6,3),   -- xg + xa
  shots                 smallint,
  shots_on_target       smallint,
  shots_in_box          smallint,
  chances_created       smallint,
  touches               smallint,
  touches_opp_box       smallint,
  non_penalty_goals     smallint,
  non_penalty_xg        numeric(6,3),
  non_penalty_xgi       numeric(6,3),

  -- defensive
  xgc                   numeric(6,3),
  goals_conceded        smallint,
  expected_clean_sheet  numeric(6,3),
  clearances_blocks_interceptions smallint,
  recoveries            smallint,
  tackles               smallint,
  defensive_contribution numeric(7,3),

  -- model metrics
  xp                    numeric(6,3),   -- expected points
  pvsxp                 numeric(7,3),   -- actual pts vs expected pts (over/under-performance)

  created_at timestamptz not null default now(),
  unique (season_key, player_id, gameweek)
);

create index if not exists idx_pgw_player   on player_gameweeks(player_id, season_key, gameweek);
create index if not exists idx_pgw_gw       on player_gameweeks(season_key, gameweek);
create index if not exists idx_pgw_home     on player_gameweeks(was_home);  -- home/away splits

-- ============================================================
-- AGGREGATED: Season stats per player (ETL writes this)
-- Avoids live aggregation on the Players page
-- ============================================================

create table if not exists player_season_stats (
  id          uuid     primary key default gen_random_uuid(),
  season_key  text     not null,
  player_id   uuid     not null references players(id) on delete cascade,

  -- volume
  gameweeks_played  smallint,
  total_minutes     integer,
  total_points      integer,

  -- attacking
  goals             smallint,
  assists           smallint,
  xg                numeric(7,3),
  xa                numeric(7,3),
  xgi               numeric(7,3),
  shots             integer,
  shots_on_target   integer,
  chances_created   integer,
  touches_opp_box   integer,
  non_penalty_goals smallint,
  non_penalty_xg    numeric(7,3),

  -- defensive
  clean_sheets      smallint,
  goals_conceded    integer,
  xgc               numeric(7,3),
  defensive_contribution numeric(8,3),
  tackles           integer,
  clearances_blocks_interceptions integer,

  -- per-90 metrics (computed by ETL for convenience)
  xg_per90          numeric(6,3),
  xa_per90          numeric(6,3),
  xgi_per90         numeric(6,3),
  shots_per90       numeric(6,3),
  points_per90      numeric(6,3),

  -- value & model
  points_per_million numeric(6,3),   -- total_points / current cost
  pvsxp_total        numeric(8,3),   -- cumulative pts vs expected pts
  xp_total           numeric(8,3),

  -- home/away splits (useful for fixture context)
  home_points        integer,
  away_points        integer,
  home_goals         smallint,
  away_goals         smallint,
  home_xg            numeric(7,3),
  away_xg            numeric(7,3),

  -- form (last 5 GW points average, ETL recalculates each run)
  form               numeric(5,2),
  last_gw_points     smallint,        -- most recent GW score at a glance

  updated_at timestamptz not null default now(),
  unique (season_key, player_id)
);

create index if not exists idx_pss_season   on player_season_stats(season_key);
create index if not exists idx_pss_player   on player_season_stats(player_id);
create index if not exists idx_pss_points   on player_season_stats(season_key, total_points desc);
create index if not exists idx_pss_form     on player_season_stats(season_key, form desc);
create index if not exists idx_pss_ppm      on player_season_stats(season_key, points_per_million desc);

-- ============================================================
-- TEAMS: Rankings (ETL-computed, no JSON dependency)
-- ============================================================

create table if not exists team_rankings (
  id          uuid     primary key default gen_random_uuid(),
  season_key  text     not null,
  team_id     uuid     not null references teams(id) on delete cascade,

  -- season-level rankings
  overall_rank    smallint,
  attack_rank     smallint,
  defense_rank    smallint,

  overall_strength   numeric(8,4),
  attack_strength    numeric(8,4),
  defense_strength   numeric(8,4),

  -- underlying metrics (from player_gameweeks aggregated by team)
  goals_per_game           numeric(6,3),
  xg_per_game              numeric(6,3),
  shots_per_game           numeric(6,3),
  goals_conceded_per_game  numeric(6,3),
  xgc_per_game             numeric(6,3),
  clean_sheet_rate         numeric(5,3),
  defensive_contribution   numeric(8,3),

  -- home/away splits for team performance context
  home_goals_per_game      numeric(6,3),
  away_goals_per_game      numeric(6,3),
  home_xg_per_game         numeric(6,3),
  away_xg_per_game         numeric(6,3),
  home_clean_sheet_rate    numeric(5,3),
  away_clean_sheet_rate    numeric(5,3),

  -- ===== FORM-BASED RANKINGS (Last 5 GWs) =====
  last_5_goals             numeric(6,2),     -- total goals in last 5 GWs
  last_5_assists           numeric(6,2),     -- total assists in last 5 GWs
  last_5_clean_sheets      smallint,         -- clean sheets in last 5 GWs
  last_5_goals_conceded    smallint,         -- goals conceded in last 5 GWs
  attack_rank_5            smallint,         -- ranking 1-20 based on last 5 GWs (1=best)
  defense_rank_5           smallint,         -- ranking 1-20 based on last 5 GWs (1=best)
  attack_score_5           numeric(8,4),     -- calculated attack strength for last 5 GWs
  defense_score_5          numeric(8,4),     -- calculated defense strength for last 5 GWs

  -- ===== HOME/AWAY STRENGTH (Last 10 GWs) =====
  last_10_home_goals       numeric(6,2),     -- goals at home in last 10 GWs
  last_10_away_goals       numeric(6,2),     -- goals away in last 10 GWs
  last_10_home_clean_sheets smallint,        -- clean sheets at home in last 10 GWs
  last_10_away_clean_sheets smallint,        -- clean sheets away in last 10 GWs
  home_strength_10         numeric(7,2),     -- home advantage modifier (-50 to +50)
  away_strength_10         numeric(7,2),     -- away weakness modifier (-50 to +50)

  updated_at timestamptz not null default now(),
  unique (season_key, team_id)
);

create index if not exists idx_tr_season on team_rankings(season_key);
create index if not exists idx_tr_team   on team_rankings(team_id);
create index if not exists idx_team_rankings_attack_rank_5 on team_rankings(attack_rank_5);
create index if not exists idx_team_rankings_defense_rank_5 on team_rankings(defense_rank_5);

-- ============================================================
-- FIXTURES: Match schedule + difficulty ratings
-- ============================================================

create table if not exists fixtures (
  id          uuid     primary key default gen_random_uuid(),
  season_key  text     not null,
  gameweek    smallint not null,
  home_team_id uuid    not null references teams(id) on delete cascade,
  away_team_id uuid    not null references teams(id) on delete cascade,

  -- difficulty ratings (1=easiest, 5=hardest, FPL-style)
  -- computed from team_rankings at ETL time
  home_attack_fdr   numeric(4,2),   -- how hard is it for home team to score?
  home_defense_fdr  numeric(4,2),   -- how hard is it for home team to keep clean sheet?
  away_attack_fdr   numeric(4,2),
  away_defense_fdr  numeric(4,2),

  -- raw rank-based favorability scores (used in fixture grid)
  home_attacking_favorability numeric(6,3),
  home_defensive_favorability numeric(6,3),
  away_attacking_favorability numeric(6,3),
  away_defensive_favorability numeric(6,3),

  created_at timestamptz not null default now(),
  unique (season_key, gameweek, home_team_id, away_team_id)
);

create index if not exists idx_fix_gw        on fixtures(season_key, gameweek);
create index if not exists idx_fix_home_team on fixtures(home_team_id);
create index if not exists idx_fix_away_team on fixtures(away_team_id);

-- ============================================================
-- VIEWS: Used directly by the frontend API
-- ============================================================

-- Dashboard summary card data
create or replace view dashboard_summary as
select
  (select count(*)::int  from players  where is_active = true)  as total_players,
  (select count(*)::int  from teams)                             as total_teams,
  coalesce(
    (select max(gameweek)::int from player_gameweeks
     where season_key = '2025_26'), 0
  )                                                               as latest_gameweek,
  (select updated_at from player_season_stats
   order by updated_at desc limit 1)                             as last_updated;

-- Players page: join everything the table needs in one query
create or replace view player_overview as
select
  p.id,
  p.fpl_id,
  coalesce(p.web_name, p.player_name)  as name,
  t.name                               as team,
  t.short_name                         as team_short,
  p.position,
  p.cost,
  p.ownership,
  -- season aggregates
  s.total_points,
  s.total_minutes,
  s.gameweeks_played,
  s.goals,
  s.assists,
  s.xg,
  s.xa,
  s.xgi,
  s.xgi_per90,
  s.shots,
  s.clean_sheets,
  s.xgc,
  s.defensive_contribution,
  s.points_per_million,
  s.points_per90,
  s.pvsxp_total,
  s.form,
  s.last_gw_points,
  s.home_points,
  s.away_points,
  s.home_xg,
  s.away_xg
from players p
left join teams t              on t.id = p.team_id
left join player_season_stats s on s.player_id = p.id and s.season_key = '2025_26'
where p.is_active = true;

-- GW history popup: last N gameweeks for a player
-- Usage: filter by player_id, order by gameweek desc, limit N
create or replace view player_gw_history as
select
  pg.player_id,
  pg.gameweek,
  pg.opponent,
  pg.was_home,
  pg.total_points,
  pg.minutes,
  pg.goals,
  pg.assists,
  pg.clean_sheet,
  pg.xg,
  pg.xa,
  pg.xgi,
  pg.shots,
  pg.shots_on_target,
  pg.chances_created,
  pg.xgc,
  pg.goals_conceded,
  pg.defensive_contribution,
  pg.xp,
  pg.pvsxp,
  pg.now_cost,
  pg.selected_by_percent
from player_gameweeks pg
where pg.season_key = '2025_26'
order by pg.gameweek desc;

-- Teams page: rankings with home/away context and form-based metrics
create or replace view team_overview as
select
  t.id,
  t.name,
  t.short_name,
  r.overall_rank,
  r.attack_rank,
  r.defense_rank,
  r.overall_strength,
  r.attack_strength,
  r.defense_strength,
  r.goals_per_game,
  r.xg_per_game,
  r.goals_conceded_per_game,
  r.clean_sheet_rate,
  r.home_goals_per_game,
  r.away_goals_per_game,
  r.home_clean_sheet_rate,
  r.away_clean_sheet_rate,
  -- form-based rankings (last 5 GWs)
  r.attack_rank_5,
  r.defense_rank_5,
  r.last_5_goals,
  r.last_5_assists,
  r.last_5_clean_sheets,
  r.last_5_goals_conceded,
  -- home/away strength (last 10 GWs)
  r.home_strength_10,
  r.away_strength_10
from teams t
left join team_rankings r on r.team_id = t.id and r.season_key = '2025_26';

-- Fixture grid: what the Fixture Analysis page needs
create or replace view fixture_grid as
select
  f.gameweek,
  ht.name       as home_team,
  ht.short_name as home_short,
  at.name       as away_team,
  at.short_name as away_short,
  f.home_attack_fdr,
  f.home_defense_fdr,
  f.away_attack_fdr,
  f.away_defense_fdr,
  f.home_attacking_favorability,
  f.home_defensive_favorability,
  f.away_attacking_favorability,
  f.away_defensive_favorability
from fixtures f
join teams ht on ht.id = f.home_team_id
join teams at on at.id = f.away_team_id
where f.season_key = '2025_26'
order by f.gameweek, ht.name;

-- ============================================================
-- RLS
-- ============================================================

alter table teams                enable row level security;
alter table players              enable row level security;
alter table player_gameweeks     enable row level security;
alter table player_season_stats  enable row level security;
alter table team_rankings        enable row level security;
alter table fixtures             enable row level security;

do $$
declare
  tbl text;
  pol text;
begin
  foreach tbl in array array[
    'teams','players','player_gameweeks',
    'player_season_stats','team_rankings','fixtures'
  ] loop
    pol := 'public read ' || tbl;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename   = tbl
        and policyname  = pol
    ) then
      execute format(
        'create policy %I on %I for select using (true)', pol, tbl
      );
      execute format(
        'create policy %I on %I for insert with check (true)',
        'public insert ' || tbl, tbl
      );
      execute format(
        'create policy %I on %I for update using (true) with check (true)',
        'public update ' || tbl, tbl
      );
      execute format(
        'create policy %I on %I for delete using (true)',
        'public delete ' || tbl, tbl
      );
    end if;
  end loop;
end
$$;