-- GUCC integrity hardening, applied to production on 2026-08-25.
-- Keeps the existing Edge Function action names and RPC JSON contracts compatible.

create or replace function public.app_strip_sort_prefix(p_text text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select nullif(trim(regexp_replace(coalesce(p_text, ''), '^\s*\d+\s*[-－—_、.．]\s*', '')), '')
$$;

create or replace function public.app_game_id(p_game_code text)
returns uuid
language plpgsql
stable
set search_path = public, pg_catalog
as $$
declare v_id uuid;
begin
  select id into v_id from public.games
  where lower(coalesce(short_code,''))=lower(coalesce(p_game_code,''))
     or lower(coalesce(code,''))=lower(coalesce(p_game_code,''))
     or lower(coalesce(title,''))=lower(coalesce(p_game_code,''))
  limit 1;
  return v_id;
end $$;

create or replace function public.app_normalize_character_name(p_text text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(regexp_replace(translate(trim(coalesce(p_text,'')), '•・‧∙', '····'), '\s+', '', 'g'))
$$;

create or replace function public.app_resolve_character_id(p_game_id uuid, p_name text)
returns uuid
language plpgsql
stable
set search_path = public, pg_catalog
as $$
declare v_id uuid;
begin
  if p_game_id is null or nullif(trim(coalesce(p_name,'')),'') is null then return null; end if;
  select c.id into v_id from public.characters c where c.game_id=p_game_id and c.name=trim(p_name) limit 1;
  if v_id is not null then return v_id; end if;
  select c.id into v_id from public.character_names cn join public.characters c on c.id=cn.character_id
   where c.game_id=p_game_id and cn.name=trim(p_name)
   order by case when cn.lang='zh' then 0 else 1 end, cn.created_at limit 1;
  if v_id is not null then return v_id; end if;
  select c.id into v_id from public.characters c
   where c.game_id=p_game_id and public.app_normalize_character_name(c.name)=public.app_normalize_character_name(p_name)
   order by c.created_at limit 1;
  if v_id is not null then return v_id; end if;
  select c.id into v_id from public.character_names cn join public.characters c on c.id=cn.character_id
   where c.game_id=p_game_id and public.app_normalize_character_name(cn.name)=public.app_normalize_character_name(p_name)
   order by case when cn.lang='zh' then 0 else 1 end, cn.created_at limit 1;
  return v_id;
end $$;

revoke execute on function public.app_strip_sort_prefix(text) from public, anon, authenticated;
revoke execute on function public.app_game_id(text) from public, anon, authenticated;
revoke execute on function public.app_normalize_character_name(text) from public, anon, authenticated;
revoke execute on function public.app_resolve_character_id(uuid,text) from public, anon, authenticated;
grant execute on function public.app_strip_sort_prefix(text) to service_role;
grant execute on function public.app_game_id(text) to service_role;
grant execute on function public.app_normalize_character_name(text) to service_role;
grant execute on function public.app_resolve_character_id(uuid,text) to service_role;

create or replace function public.app_save_character(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_id uuid := nullif(p_payload->>'id','')::uuid;
  v_game_id uuid := public.app_game_id(p_payload->>'game_code');
  v_name text := nullif(trim(coalesce(p_payload->>'name',p_payload->>'character_name')),'');
  v_character_id uuid; v_existing_id uuid; rec record; v_resource_id uuid;
begin
  if v_game_id is null then raise exception 'Game not found: %',p_payload->>'game_code'; end if;
  if v_name is null then raise exception 'Character name is required'; end if;
  if v_id is null then
    select id into v_existing_id from public.characters where game_id=v_game_id and name=v_name limit 1;
    if v_existing_id is not null then raise exception 'Character already exists: %. Edit the existing record instead of creating a duplicate.',v_name; end if;
    insert into public.characters(id,game_id,name,element,profession,sex,rarity,note)
    values(gen_random_uuid(),v_game_id,v_name,nullif(p_payload->>'element',''),nullif(p_payload->>'profession',''),nullif(p_payload->>'sex',''),nullif(p_payload->>'rarity',''),nullif(p_payload->>'note','')) returning id into v_character_id;
  else
    if exists(select 1 from public.characters where game_id=v_game_id and name=v_name and id<>v_id) then raise exception 'Another character already uses this name in the same game: %',v_name; end if;
    update public.characters set game_id=v_game_id,name=v_name,element=nullif(p_payload->>'element',''),profession=nullif(p_payload->>'profession',''),sex=nullif(p_payload->>'sex',''),rarity=nullif(p_payload->>'rarity',''),note=nullif(p_payload->>'note',''),updated_at=now() where id=v_id returning id into v_character_id;
  end if;
  if v_character_id is null then raise exception 'Character not found: %',v_id; end if;
  insert into public.character_progress(character_id,research_status,build_status,progress_note)
  values(v_character_id,public.app_strip_sort_prefix(p_payload->>'research_status'),public.app_strip_sort_prefix(p_payload->>'build_status'),nullif(coalesce(p_payload->>'research_note',p_payload->>'progress_note'),''))
  on conflict(character_id) do update set research_status=excluded.research_status,build_status=excluded.build_status,progress_note=excluded.progress_note,updated_at=now();
  insert into public.character_evaluations(id,character_id,context,role_type,power_rank,like_level,note)
  values(gen_random_uuid(),v_character_id,'current',nullif(p_payload->>'role_type',''),nullif(p_payload->>'power_rank',''),public.app_strip_sort_prefix(p_payload->>'like_level'),nullif(p_payload->>'evaluation_note',''))
  on conflict(character_id,context) do update set role_type=excluded.role_type,power_rank=excluded.power_rank,like_level=excluded.like_level,note=excluded.note;
  insert into public.character_names(id,character_id,lang,name) values(gen_random_uuid(),v_character_id,'zh',v_name)
  on conflict(character_id,lang) do update set name=excluded.name;
  if p_payload ? 'names' then delete from public.character_names where character_id=v_character_id and lang<>'zh'; end if;
  for rec in select * from jsonb_each_text(coalesce(p_payload->'names','{}'::jsonb)) loop
    if nullif(trim(rec.value),'') is not null then
      insert into public.character_names(id,character_id,lang,name) values(gen_random_uuid(),v_character_id,lower(trim(rec.key)),trim(rec.value)) on conflict(character_id,lang) do update set name=excluded.name;
    end if;
  end loop;
  if p_payload ? 'links' then
    delete from public.resource_relations rr using public.resources r
    where rr.resource_id=r.id and rr.entity_type='character' and rr.entity_id=v_character_id
      and rr.source_sheet is null and rr.source_field is null
      and not exists(select 1 from jsonb_to_recordset(coalesce(p_payload->'links','[]'::jsonb)) as x(title text,url text,relation_type text,source text,note text)
                     where nullif(trim(coalesce(x.url,'')),'') is not null and trim(x.url)=r.url and coalesce(nullif(x.relation_type,''),'research')=rr.relation_type);
  end if;
  for rec in select * from jsonb_to_recordset(coalesce(p_payload->'links','[]'::jsonb)) as x(title text,url text,relation_type text,source text,note text) loop
    if nullif(trim(coalesce(rec.url,'')),'') is not null then
      insert into public.resources(id,resource_type,title,url,source,note)
      values(gen_random_uuid(),'link',nullif(rec.title,''),trim(rec.url),coalesce(nullif(rec.source,''),'frontend'),nullif(rec.note,''))
      on conflict(url) where url is not null do update set title=coalesce(excluded.title,public.resources.title),source=coalesce(public.resources.source,excluded.source),note=coalesce(excluded.note,public.resources.note)
      returning id into v_resource_id;
      insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
      values(gen_random_uuid(),v_resource_id,'character',v_character_id,coalesce(nullif(rec.relation_type,''),'research')) on conflict do nothing;
    end if;
  end loop;
  return jsonb_build_object('id',v_character_id,'saved',true);
end $$;

create or replace function public.app_save_party(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_id uuid:=nullif(p_payload->>'id','')::uuid; v_game_id uuid:=public.app_game_id(p_payload->>'game_code');
  v_party_id uuid; rec record; v_char_id uuid; v_slots int[]:='{}'::int[];
begin
  if v_game_id is null then raise exception 'Game not found: %',p_payload->>'game_code'; end if;
  if v_id is null then
    insert into public.parties(id,game_id,summary,party_type,status,hold_status,description)
    values(gen_random_uuid(),v_game_id,nullif(p_payload->>'summary',''),nullif(p_payload->>'party_type',''),nullif(p_payload->>'status',''),nullif(p_payload->>'hold_status',''),nullif(p_payload->>'description','')) returning id into v_party_id;
  else
    update public.parties set game_id=v_game_id,summary=nullif(p_payload->>'summary',''),party_type=nullif(p_payload->>'party_type',''),status=nullif(p_payload->>'status',''),hold_status=nullif(p_payload->>'hold_status',''),description=nullif(p_payload->>'description',''),updated_at=now() where id=v_id returning id into v_party_id;
  end if;
  if v_party_id is null then raise exception 'Party not found: %',v_id; end if;
  if p_payload ? 'members' then
    for rec in select * from jsonb_to_recordset(coalesce(p_payload->'members','[]'::jsonb)) as x(slot_no int,name text,member_role text) loop
      if nullif(trim(coalesce(rec.name,'')),'') is not null then
        rec.slot_no:=coalesce(rec.slot_no,1); v_slots:=array_append(v_slots,rec.slot_no); v_char_id:=public.app_resolve_character_id(v_game_id,rec.name);
        insert into public.party_members(id,party_id,slot_no,character_id,member_name_raw,member_role)
        values(gen_random_uuid(),v_party_id,rec.slot_no,v_char_id,trim(rec.name),rec.member_role)
        on conflict(party_id,slot_no) do update set character_id=excluded.character_id,member_name_raw=excluded.member_name_raw,member_role=excluded.member_role;
      end if;
    end loop;
    if cardinality(v_slots)=0 then delete from public.party_members where party_id=v_party_id;
    else delete from public.party_members where party_id=v_party_id and not(slot_no=any(v_slots)); end if;
  end if;
  return jsonb_build_object('id',v_party_id,'saved',true);
end $$;

create or replace function public.app_save_version(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_id uuid:=nullif(p_payload->>'id','')::uuid; v_game_id uuid:=public.app_game_id(p_payload->>'game_code');
  v_version_no text:=nullif(trim(p_payload->>'version_no'),''); v_version_id uuid; v_existing_id uuid; rec record; v_char_id uuid;
begin
  if v_game_id is null then raise exception 'Game not found: %',p_payload->>'game_code'; end if;
  if v_version_no is null then raise exception 'Version number is required'; end if;
  if v_id is null then
    select id into v_existing_id from public.game_versions where game_id=v_game_id and version_no=v_version_no limit 1;
    if v_existing_id is not null then raise exception 'Version already exists: %. Edit the existing record instead.',v_version_no; end if;
    insert into public.game_versions(id,game_id,version_no,version_name,start_date,note)
    values(gen_random_uuid(),v_game_id,v_version_no,nullif(p_payload->>'version_name',''),nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'note','')) returning id into v_version_id;
  else
    if exists(select 1 from public.game_versions where game_id=v_game_id and version_no=v_version_no and id<>v_id) then raise exception 'Another record already uses this version number in the same game: %',v_version_no; end if;
    update public.game_versions set game_id=v_game_id,version_no=v_version_no,version_name=nullif(p_payload->>'version_name',''),start_date=nullif(p_payload->>'start_date','')::date,note=nullif(p_payload->>'note','') where id=v_id returning id into v_version_id;
  end if;
  if v_version_id is null then raise exception 'Version not found: %',v_id; end if;
  if p_payload ? 'banners' then
    delete from public.version_banners where version_id=v_version_id;
    for rec in select * from jsonb_to_recordset(coalesce(p_payload->'banners','[]'::jsonb)) as x(phase text,banner_type text,character_name text,note text) loop
      if nullif(trim(coalesce(rec.character_name,'')),'') is not null then
        v_char_id:=public.app_resolve_character_id(v_game_id,rec.character_name);
        insert into public.version_banners(id,version_id,phase,banner_type,character_id,character_name_raw,note)
        values(gen_random_uuid(),v_version_id,coalesce(nullif(rec.phase,''),'unknown'),coalesce(nullif(rec.banner_type,''),'unknown'),v_char_id,trim(rec.character_name),rec.note);
      end if;
    end loop;
  end if;
  return jsonb_build_object('id',v_version_id,'saved',true);
end $$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
drop policy if exists app_users_self_read on public.app_users;
create policy app_users_self_read on public.app_users for select to authenticated using ((select auth.uid())=user_id);
create index if not exists idx_mechanisms_game_id on public.mechanisms(game_id);

drop index if exists public.ux_characters_game_name;
drop index if exists public.ux_character_names_lang;
drop index if exists public.ux_character_progress_character;
drop index if exists public.ux_character_evaluation_context;
drop index if exists public.ux_party_members_slot;
drop index if exists public.ux_game_versions_game_version;
drop index if exists public.ux_resource_relations_full;
drop index if exists public.idx_resources_url;

-- Existing-data repair steps are intentionally limited to objective linkage/name cleanup.
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type,source_sheet,source_field)
select gen_random_uuid(),r.id,'character',c.id,'official_profile','DB_Party','recovered_from_party_member'
from public.resources r join public.characters c on c.name='庄方宜' join public.games g on g.id=c.game_id and g.code='ENF'
where r.id='d306640a-a212-54ab-82f0-e530ab2e2d2c' on conflict do nothing;

delete from public.resource_relations rr where rr.entity_type='party_member' and not exists(select 1 from public.party_members pm where pm.id=rr.entity_id);

update public.characters c set name='洛瑟菈',updated_at=now() from public.games g where g.id=c.game_id and g.code='WW' and c.name='洛瑟拉';
update public.characters c set name='姬子•启行',updated_at=now() from public.games g where g.id=c.game_id and g.code='HSR' and c.name='姬子·启行';
update public.characters c set name='知更鸟•晴歌',updated_at=now() from public.games g where g.id=c.game_id and g.code='HSR' and c.name='知更鸟·晴歌';
update public.characters c set name='砂金•戏浪',updated_at=now() from public.games g where g.id=c.game_id and g.code='HSR' and c.name='砂金·戏浪';

update public.character_names cn set name=c.name from public.characters c where cn.character_id=c.id and cn.lang='zh' and cn.name is distinct from c.name;

update public.party_members pm set member_name_raw='维琳娜',character_id=c.id
from public.parties p join public.games g on g.id=p.game_id and g.code='ZZZ' join public.characters c on c.game_id=g.id and c.name='维琳娜'
where pm.party_id=p.id and pm.member_name_raw='维林娜';
update public.parties p set summary=replace(summary,'维林娜','维琳娜'),updated_at=now() from public.games g where g.id=p.game_id and g.code='ZZZ' and summary like '%维林娜%';

update public.party_members pm set character_id=public.app_resolve_character_id(p.game_id,pm.member_name_raw)
from public.parties p where p.id=pm.party_id and pm.character_id is null and public.app_resolve_character_id(p.game_id,pm.member_name_raw) is not null;
update public.version_banners vb set character_id=public.app_resolve_character_id(gv.game_id,vb.character_name_raw)
from public.game_versions gv where gv.id=vb.version_id and vb.character_id is null and public.app_resolve_character_id(gv.game_id,vb.character_name_raw) is not null;
update public.party_members pm set member_name_raw=c.name from public.characters c where c.id=pm.character_id and public.app_normalize_character_name(pm.member_name_raw)=public.app_normalize_character_name(c.name);
update public.version_banners vb set character_name_raw=c.name from public.characters c where c.id=vb.character_id and public.app_normalize_character_name(vb.character_name_raw)=public.app_normalize_character_name(c.name);
