-- Production migration: gucc_metadata_rollup_portability_20260826
--
-- Follow-up to the 2026-08-26 metadata rollup. Historical production data can
-- have different generated UUIDs on another database, so duplicate-resource
-- cleanup must resolve rows by stable semantic keys instead of copied UUIDs.

-- Ensure observation games and their status rows both exist even when a game row
-- pre-dates this maintenance batch.
with requested(title) as (
  values ('二重螺旋'),('望月'),('尘白禁区')
)
insert into public.games(title)
select r.title
from requested r
where not exists (select 1 from public.games g where g.title=r.title);

insert into public.game_status(
  game_id,content_tier,output_enabled,research_depth,login_frequency,spending_level,info_attention
)
select g.id,'观察级',false,'无','从不','无','微'
from public.games g
where g.title in ('二重螺旋','望月','尘白禁区')
  and not exists (select 1 from public.game_status gs where gs.game_id=g.id)
on conflict (game_id) do nothing;

-- Consolidate duplicate HSR wiki resources by semantic URL rather than UUID.
do $$
declare
  canonical_id uuid;
begin
  select r.id into canonical_id
  from public.resources r
  where r.url = 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail'
     or r.url like 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail?%'
  order by case when r.url='https://bbs.mihoyo.com/sr/wiki/content/7726/detail' then 0 else 1 end,
           r.created_at,
           r.id
  limit 1;

  if canonical_id is not null then
    insert into public.resource_relations(
      resource_id,entity_type,entity_id,relation_type,source_sheet,source_field
    )
    select canonical_id,rr.entity_type,rr.entity_id,rr.relation_type,rr.source_sheet,rr.source_field
    from public.resource_relations rr
    join public.resources r on r.id=rr.resource_id
    where rr.resource_id<>canonical_id
      and (r.url = 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail'
           or r.url like 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail?%')
    on conflict do nothing;

    delete from public.resource_relations rr
    using public.resources r
    where rr.resource_id=r.id
      and r.id<>canonical_id
      and (r.url = 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail'
           or r.url like 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail?%');

    delete from public.resources r
    where r.id<>canonical_id
      and (r.url = 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail'
           or r.url like 'https://bbs.mihoyo.com/sr/wiki/content/7726/detail?%');

    update public.resources
    set url='https://bbs.mihoyo.com/sr/wiki/content/7726/detail',
        title=coalesce(title,'米游社｜知更鸟·晴歌')
    where id=canonical_id;
  end if;
end $$;

-- Consolidate duplicate copies of the same Bilibili BV while preserving every
-- semantic relationship. The chosen canonical UUID is resolved at runtime.
do $$
declare
  canonical_id uuid;
begin
  select r.id into canonical_id
  from public.resources r
  where lower(r.url) like '%bilibili.com/video/bv1qd421j72a/%'
  order by r.created_at,r.id
  limit 1;

  if canonical_id is not null then
    insert into public.resource_relations(
      resource_id,entity_type,entity_id,relation_type,source_sheet,source_field
    )
    select canonical_id,rr.entity_type,rr.entity_id,rr.relation_type,rr.source_sheet,rr.source_field
    from public.resource_relations rr
    join public.resources r on r.id=rr.resource_id
    where rr.resource_id<>canonical_id
      and lower(r.url) like '%bilibili.com/video/bv1qd421j72a/%'
    on conflict do nothing;

    delete from public.resource_relations rr
    using public.resources r
    where rr.resource_id=r.id
      and r.id<>canonical_id
      and lower(r.url) like '%bilibili.com/video/bv1qd421j72a/%';

    delete from public.resources r
    where r.id<>canonical_id
      and lower(r.url) like '%bilibili.com/video/bv1qd421j72a/%';

    update public.resources
    set title='剑星 1.x / 攻略',
        url='https://www.bilibili.com/video/BV1QD421J72a/'
    where id=canonical_id;
  end if;
end $$;
