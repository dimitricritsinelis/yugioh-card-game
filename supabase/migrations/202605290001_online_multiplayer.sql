create extension if not exists pgcrypto;

create table if not exists public.duel_games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text check (status in ('waiting','active','finished','abandoned')) not null,
  version integer not null default 0,
  seed text not null,
  active_player text null check (active_player in ('P1','P2')),
  phase text null,
  turn integer null,
  winner text null check (winner in ('P1','P2')),
  engine_state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_move_at timestamptz null
);

create table if not exists public.duel_seats (
  game_id uuid references public.duel_games(id) on delete cascade,
  role text check (role in ('P1','P2')) not null,
  player_name text not null,
  seat_token_hash text not null,
  client_id text not null,
  claimed_at timestamptz default now(),
  heartbeat_at timestamptz default now(),
  disconnected_at timestamptz null,
  primary key (game_id, role)
);

create table if not exists public.duel_moves (
  game_id uuid references public.duel_games(id) on delete cascade,
  version integer not null,
  actor_role text check (actor_role in ('P1','P2')) not null,
  private_action jsonb not null,
  public_events jsonb not null,
  public_summary text not null,
  created_at timestamptz default now(),
  primary key (game_id, version)
);

create table if not exists public.duel_public_move_events (
  game_id uuid references public.duel_games(id) on delete cascade,
  version integer not null,
  actor_role text check (actor_role in ('P1','P2')) not null,
  public_summary text not null,
  created_at timestamptz default now(),
  primary key (game_id, version)
);

alter table public.duel_games enable row level security;
alter table public.duel_seats enable row level security;
alter table public.duel_moves enable row level security;
alter table public.duel_public_move_events enable row level security;

drop policy if exists "anon can read public move invalidations" on public.duel_public_move_events;
create policy "anon can read public move invalidations"
  on public.duel_public_move_events
  for select
  to anon
  using (true);

drop policy if exists "anon cannot read canonical games" on public.duel_games;
drop policy if exists "anon cannot read private moves" on public.duel_moves;
drop policy if exists "anon cannot read seat tokens" on public.duel_seats;

create or replace function public.commit_duel_move(
  p_game_id uuid,
  p_expected_version integer,
  p_actor_role text,
  p_private_action jsonb,
  p_next_engine_state jsonb,
  p_next_status text,
  p_next_active_player text,
  p_next_phase text,
  p_next_turn integer,
  p_next_winner text,
  p_public_events jsonb,
  p_public_summary text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_committed_version integer;
begin
  update public.duel_games
    set
      version = version + 1,
      status = p_next_status,
      engine_state = p_next_engine_state,
      active_player = p_next_active_player,
      phase = p_next_phase,
      turn = p_next_turn,
      winner = p_next_winner,
      updated_at = now(),
      last_move_at = now()
    where id = p_game_id
      and version = p_expected_version
    returning version into v_committed_version;

  if v_committed_version is null then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  insert into public.duel_moves (
    game_id,
    version,
    actor_role,
    private_action,
    public_events,
    public_summary
  ) values (
    p_game_id,
    v_committed_version,
    p_actor_role,
    p_private_action,
    p_public_events,
    p_public_summary
  );

  insert into public.duel_public_move_events (
    game_id,
    version,
    actor_role,
    public_summary
  ) values (
    p_game_id,
    v_committed_version,
    p_actor_role,
    p_public_summary
  );

  return v_committed_version;
end;
$$;

grant execute on function public.commit_duel_move(
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  integer,
  text,
  jsonb,
  text
) to service_role;

do $$
begin
  alter publication supabase_realtime add table public.duel_public_move_events;
exception
  when duplicate_object then null;
end;
$$;
