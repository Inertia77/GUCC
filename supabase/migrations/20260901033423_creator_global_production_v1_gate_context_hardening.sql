-- GUCC Creator OS Global Production v1 gate-context hardening.
-- Canonical Production migration identity:
-- 20260901033423_creator_global_production_v1_gate_context_hardening.sql
-- Repository identity matches supabase_migrations.schema_migrations.

-- app_creator_human_lock deliberately keeps its marker active while one RPC
-- performs all prerequisite invalidation writes. Its final audit event is the
-- exact statement boundary where that privilege must be cleared.
create or replace function public.app_reset_creator_human_action_after_event()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  perform set_config('app.creator_human_action', '', true);
  return new;
end;
$function$;

create trigger trg_creator_human_gate_context_reset
after insert on public.creator_project_events
for each row
when (new.event_type = 'GLOBAL_HUMAN_GATE_CHANGED')
execute function public.app_reset_creator_human_action_after_event();

-- Learning review is its own human RPC and does not write a Project event, so
-- its accepted/rejected status transition is the corresponding reset boundary.
create or replace function public.app_reset_creator_human_action_after_learning()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  perform set_config('app.creator_human_action', '', true);
  return new;
end;
$function$;

create trigger trg_creator_learning_human_context_reset
after update of status on public.creator_learnings
for each row
when (new.status is distinct from old.status)
execute function public.app_reset_creator_human_action_after_learning();

revoke all on function public.app_reset_creator_human_action_after_event() from public, anon, authenticated;
revoke all on function public.app_reset_creator_human_action_after_learning() from public, anon, authenticated;
grant execute on function public.app_reset_creator_human_action_after_event() to service_role;
grant execute on function public.app_reset_creator_human_action_after_learning() to service_role;

notify pgrst, 'reload schema';
