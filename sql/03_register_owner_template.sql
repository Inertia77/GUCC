-- ============================================================
-- GameUp Command Center v5 - Register Owner
-- 1) First create/sign up the Auth user in Supabase.
-- 2) Replace the email below with that Auth user's email.
-- 3) Run this SQL in Supabase SQL Editor.
-- ============================================================

select public.register_app_owner('YOUR_EMAIL@example.com');

-- Check:
select * from public.app_users order by created_at desc;
