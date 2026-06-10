set search_path = public;

do $$
begin
  alter publication supabase_realtime drop table public.duel_public_move_events;
exception
  when undefined_object then
    null;
end $$;

drop table if exists public.duel_public_move_events;
