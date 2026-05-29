alter table public.duel_games
  add column if not exists realtime_topic text;

update public.duel_games
  set realtime_topic = replace(gen_random_uuid()::text, '-', '')
  where realtime_topic is null;

alter table public.duel_games
  alter column realtime_topic set not null;

do $$
begin
  alter table public.duel_games
    add constraint duel_games_realtime_topic_key unique (realtime_topic);
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.duel_public_invalidations (
  realtime_topic text not null references public.duel_games(realtime_topic) on delete cascade,
  version integer not null,
  actor_role text null check (actor_role in ('P1','P2')),
  public_summary text not null,
  created_at timestamptz default now(),
  primary key (realtime_topic, version)
);

alter table public.duel_public_invalidations enable row level security;

drop policy if exists "anon can read public invalidations" on public.duel_public_invalidations;
create policy "anon can read public invalidations"
  on public.duel_public_invalidations
  for select
  to anon
  using (true);

drop policy if exists "anon can read public move invalidations" on public.duel_public_move_events;
revoke all on table public.duel_public_move_events from public, anon, authenticated;
revoke all on table public.duel_games from public, anon, authenticated;
revoke all on table public.duel_seats from public, anon, authenticated;
revoke all on table public.duel_moves from public, anon, authenticated;

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
  v_realtime_topic text;
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
      and status = 'active'
      and (
        select count(*)
        from public.duel_seats
        where game_id = p_game_id
          and role in ('P1', 'P2')
      ) = 2
    returning version, realtime_topic into v_committed_version, v_realtime_topic;

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

  insert into public.duel_public_invalidations (
    realtime_topic,
    version,
    actor_role,
    public_summary
  ) values (
    v_realtime_topic,
    v_committed_version,
    p_actor_role,
    p_public_summary
  );

  return v_committed_version;
end;
$$;

create or replace function public.commit_duel_metadata_update(
  p_game_id uuid,
  p_next_status text,
  p_public_summary text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_committed_version integer;
  v_realtime_topic text;
begin
  if p_next_status is not null and p_next_status not in ('waiting','active','finished','abandoned') then
    raise exception 'invalid_status' using errcode = '22000';
  end if;

  update public.duel_games
    set
      version = version + 1,
      status = coalesce(p_next_status, status),
      updated_at = now()
    where id = p_game_id
    returning version, realtime_topic into v_committed_version, v_realtime_topic;

  if v_committed_version is null then
    raise exception 'game_not_found' using errcode = '02000';
  end if;

  insert into public.duel_public_invalidations (
    realtime_topic,
    version,
    actor_role,
    public_summary
  ) values (
    v_realtime_topic,
    v_committed_version,
    null,
    p_public_summary
  );

  return v_committed_version;
end;
$$;

revoke all on function public.commit_duel_move(
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
) from public, anon, authenticated;

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

revoke all on function public.commit_duel_metadata_update(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.commit_duel_metadata_update(uuid, text, text)
  to service_role;

grant usage on schema public to service_role;
grant all privileges on table public.duel_games to service_role;
grant all privileges on table public.duel_seats to service_role;
grant all privileges on table public.duel_moves to service_role;
grant all privileges on table public.duel_public_invalidations to service_role;
grant select on table public.duel_public_invalidations to anon;

do $$
begin
  alter publication supabase_realtime drop table public.duel_public_move_events;
exception
  when undefined_object then null;
  when undefined_table then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.duel_public_invalidations;
exception
  when duplicate_object then null;
end;
$$;
