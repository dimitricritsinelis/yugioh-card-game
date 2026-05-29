grant usage on schema public to service_role;

grant all privileges on table public.duel_games to service_role;
grant all privileges on table public.duel_seats to service_role;
grant all privileges on table public.duel_moves to service_role;
grant all privileges on table public.duel_public_move_events to service_role;

grant select on table public.duel_public_move_events to anon;
