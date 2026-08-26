revoke all on function public.app_attach_character_notion(jsonb) from public, anon, authenticated;
grant execute on function public.app_attach_character_notion(jsonb) to service_role, postgres;
