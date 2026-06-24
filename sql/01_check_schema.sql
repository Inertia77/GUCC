-- ============================================================
-- GameUp Command Center v5 - Schema Check
-- Run this first in Supabase SQL Editor.
-- It does not change data. It only shows whether the expected tables/columns exist.
-- ============================================================

with expected(table_name, required_columns) as (
  values
    ('games', array['id','short_code','code','title']),
    ('characters', array['id','game_id','name','element','profession','sex','rarity','note']),
    ('character_names', array['character_id','lang','name']),
    ('character_progress', array['character_id','research_status','build_status','like_level','research_note']),
    ('character_evaluations', array['character_id','context','role_type','power_rank','note']),
    ('parties', array['id','game_id','summary','party_type','status','hold_status','description']),
    ('party_members', array['party_id','slot_no','character_id','member_name_raw','member_role']),
    ('game_versions', array['id','game_id','version_no','version_name','start_date','note']),
    ('version_banners', array['version_id','phase','banner_type','character_id','character_name_raw','note']),
    ('resources', array['id','resource_type','title','url','source','note']),
    ('resource_relations', array['resource_id','entity_type','entity_id','relation_type'])
), actual as (
  select table_name, array_agg(column_name::text order by ordinal_position) as columns
  from information_schema.columns
  where table_schema = 'public'
  group by table_name
)
select
  e.table_name,
  case when a.table_name is null then 'MISSING_TABLE'
       when e.required_columns <@ a.columns then 'OK'
       else 'MISSING_COLUMNS'
  end as status,
  array(select unnest(e.required_columns) except select unnest(coalesce(a.columns, '{}'))) as missing_columns,
  coalesce(a.columns, '{}') as existing_columns
from expected e
left join actual a on a.table_name = e.table_name
order by e.table_name;

-- Row count overview
select 'games' as table_name, count(*) from public.games
union all select 'characters', count(*) from public.characters
union all select 'parties', count(*) from public.parties
union all select 'game_versions', count(*) from public.game_versions
union all select 'resources', count(*) from public.resources;
