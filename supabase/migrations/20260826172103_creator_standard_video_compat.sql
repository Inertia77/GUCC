begin;

-- Phase 1.2 keeps A/B/C/D readable as legacy metadata while new Creator
-- Projects use one unified internal compatibility value. This constraint
-- expansion is intentionally data-preserving: no rows or legacy values move.
alter table public.creator_projects
  drop constraint if exists creator_projects_type_chk;

alter table public.creator_projects
  add constraint creator_projects_type_chk
  check (project_type = any (array[
    'A_FULL_GUIDE'::text,
    'B_SUNO_VIDEO'::text,
    'C_GAME_SYSTEM'::text,
    'D_MUSIC_RELEASE'::text,
    'STANDARD_VIDEO'::text
  ]));

commit;
