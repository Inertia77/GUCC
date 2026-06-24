-- ============================================================
-- GameUp Command Center v5 - Schema Check
-- Run this first in Supabase SQL Editor.
-- It does not change data. It only shows whether the expected tables/columns exist.
-- ============================================================

with expected(table_name, required_columns) as (
  values
    ('games', array['id','short_code','code','title']),
    ('characters', array['id','game_id','name','element','profession','sex','rarity','note','updated_at']),
    ('character_names', array['character_id','lang','name']),
    ('character_progress', array['character_id','research_status','build_status','progress_note','updated_at']),
    ('character_evaluations', array['character_id','context','role_type','power_rank','like_level','note','created_at']),
    ('parties', array['id','game_id','summary','party_type','status','hold_status','description','created_at','updated_at']),
    ('party_members', array['party_id','slot_no','character_id','member_name_raw','member_role']),
    ('game_versions', array['id','game_id','version_no','version_name','start_date','note']),
    ('version_banners', array['version_id','phase','banner_type','character_id','character_name_raw','note']),
    ('resources', array['id','resource_type','title','url','source','note','created_at']),
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

-- Approximate row count overview. Missing tables are simply omitted.
select
  relname as table_name,
  n_live_tup as estimated_rows
from pg_stat_user_tables
where schemaname = 'public'
  and relname in ('games', 'characters', 'parties', 'game_versions', 'resources')
order by relname;

-- Duplicate checks required by supabase/sql/02-install-command-center.sql.
-- Every query below should return zero rows before installing the RPC layer.
select 'characters(game_id,name)' as duplicate_key, game_id::text || ' / ' || name as value, count(*) as row_count
from public.characters
group by game_id, name
having count(*) > 1;

select 'character_names(character_id,lang)' as duplicate_key, character_id::text || ' / ' || lang as value, count(*) as row_count
from public.character_names
group by character_id, lang
having count(*) > 1;

select 'character_evaluations(character_id,context)' as duplicate_key, character_id::text || ' / ' || context as value, count(*) as row_count
from public.character_evaluations
group by character_id, context
having count(*) > 1;

select 'party_members(party_id,slot_no)' as duplicate_key, party_id::text || ' / ' || slot_no::text as value, count(*) as row_count
from public.party_members
group by party_id, slot_no
having count(*) > 1;

select 'game_versions(game_id,version_no)' as duplicate_key, game_id::text || ' / ' || version_no as value, count(*) as row_count
from public.game_versions
group by game_id, version_no
having count(*) > 1;

select 'resources(url)' as duplicate_key, url as value, count(*) as row_count
from public.resources
where url is not null
group by url
having count(*) > 1;

select
  'resource_relations(resource_id,entity_type,entity_id,relation_type)' as duplicate_key,
  resource_id::text || ' / ' || entity_type || ' / ' || entity_id::text || ' / ' || relation_type as value,
  count(*) as row_count
from public.resource_relations
group by resource_id, entity_type, entity_id, relation_type
having count(*) > 1;
