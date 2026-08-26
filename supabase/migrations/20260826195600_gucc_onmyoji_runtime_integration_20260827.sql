begin;

update public.game_status gs
set content_tier='兴趣级', output_enabled=false, research_depth='中', login_frequency='每日', spending_level='无', info_attention='中', updated_at=now()
from public.games g where gs.game_id=g.id and g.code='YYS';

with n(char_name,lang,localized) as (
 values
 ('天照','en','Amaterasu'),('天照','jp','天照'),
 ('雪御前','en','Yuki Gozen'),('雪御前','jp','雪御前'),
 ('神无月','en','Kannazuki'),('神无月','jp','神無月'),
 ('神酿星熊童子','en','Ambrosial Hoshiguma Doji'),('神酿星熊童子','jp','神醸星熊童子'),
 ('葛叶','en','Kuzunoha'),('葛叶','jp','葛の葉'),
 ('平将门','en','Taira no Masakado'),('平将门','jp','平将門'),
 ('云间不见岳','en','Lavaforged Fukengaku'),('云间不见岳','jp','雲上不見岳'),
 ('妙主九命猫','en','Meowlord Kyuumei Neko'),
 ('妖刀姬·绯夜猎刃','en','Scarlet Nightedge Yoto Hime'),('妖刀姬·绯夜猎刃','jp','妖刀姫・緋夜猟刃'),
 ('梦引蝴蝶精','en','Dreambound Chocho'),('梦引蝴蝶精','jp','夢引き胡蝶の精'),
 ('梦山白藏主','en','Hakuzosu Unbound'),('梦山白藏主','jp','夢山白蔵主')
), yys as (select id from public.games where code='YYS' limit 1)
insert into public.character_names(id,character_id,lang,name)
select gen_random_uuid(),c.id,n.lang,n.localized
from n join public.characters c on c.name=n.char_name join yys on yys.id=c.game_id
on conflict(character_id,lang) do update set name=excluded.name,updated_at=now();

with yys as (select id from public.games where code='YYS' limit 1),
p(name,research_status,build_status,progress_note) as (
 values
 ('天照','OK','DONE','已确认持有两只并承担短线生产；具体御魂与技能细节后续账号体检时继续校准。'),
 ('雪御前','OK','待养成','2026-08-27 回归召唤已获得；作为现代 PVE 输出储备，十周年前暂不立即喂满技能。'),
 ('神无月','OK','待养成','回归自选目标，当前尚未确认获得；获得后作为现代 PVE 增伤/供火/减耗辅助培养，暂不立即喂满技能。'),
 ('神酿星熊童子','OK','NOT','2026-08-27 回归召唤已获得；当前作为 PVP/对策储备，明确暂不培养、不投入御行达摩。'),
 ('石长姬','待研究','待养成','官方确认 2026-09-09 十周年登录赠送；当前尚未获得，正式服实装后再研究技能、御魂与就业。')
)
insert into public.character_progress(character_id,research_status,build_status,progress_note)
select c.id,p.research_status,p.build_status,p.progress_note
from p join public.characters c on c.name=p.name join yys on yys.id=c.game_id
on conflict(character_id) do update set research_status=excluded.research_status,build_status=excluded.build_status,progress_note=excluded.progress_note,updated_at=now();

with yys as (select id from public.games where code='YYS' limit 1),
e(name,role_type,note) as (
 values
 ('天照','短线 PVE 输出','双天照是当前已确认的成熟短线生产核心；不因新输出加入而直接退役。'),
 ('雪御前','现代 PVE 输出','已获得；作为活动、御魂与长线 Boss 等现代 PVE 输出储备，技能资源投入留到十周年环境确认后。'),
 ('神无月','PVE 增伤 / 供火 / 减耗辅助','当前为回归自选目标；定位为现代 PVE 辅助骨架，是否已获得必须与账号事实分开记录。'),
 ('神酿星熊童子','PVP 控制 / 对策','已获得但当前不作为恢复日常周常生产力的资源优先项。'),
 ('石长姬','十周年新式神·待实装验证','9月9日登录赠送，正式服上线后再更新稳定定位。')
)
insert into public.character_evaluations(id,character_id,context,role_type,note)
select gen_random_uuid(),c.id,'current',e.role_type,e.note
from e join public.characters c on c.name=e.name join yys on yys.id=c.game_id
on conflict(character_id,context) do update set role_type=excluded.role_type,note=excluded.note,updated_at=now();

update public.game_versions gv
set version_no='2.8.80', version_name='云华依言歌', start_date='2026-08-19',
    note='国服当前客户端 2.8.80（260814）。阴阳师×Vsinger 联动版本；SSR洛天依、SSR言和于8月19日登场，联动召唤至8月30日23:59，版本活动主体至9月1日23:59。', updated_at=now()
from public.games g where gv.game_id=g.id and g.code='YYS' and gv.version_no='2026-08-VSINGER';

with yys as (select id from public.games where code='YYS' limit 1)
insert into public.game_versions(game_id,version_no,version_name,start_date,note)
select yys.id,v.no,v.name,v.start_date,v.note
from yys cross join (values
 ('SUMMER-SIGNIN-2026','阳阳师计划·特别签到','2026-07-15'::date,'特别签到持续至2026-09-15 23:59；完成签到可获得5位热门强力式神。作为回坑阶段不可漏的长期福利锚点维护。'),
 ('10TH-PREHEAT-2026','拾光永恒·十周年预热','2026-08-26'::date,'十周年纪念服「永远的平安京」自8月26日起开放预约；正式永恒庆典于9月9日开启。'),
 ('10TH-2026','一瞬刹那·拾光永恒','2026-09-09'::date,'十周年永恒庆典。9月9日登录赠送全新SSR石长姬；另有百次召唤“十连十金”、典藏礼券、晴明十周年限定外观「灵狐新梦」、免费庭院「狐栖归处」、御行达摩等官方前瞻福利；正式细则以游戏内公告为准。')
) as v(no,name,start_date,note)
on conflict(game_id,version_no) do update set version_name=excluded.version_name,start_date=excluded.start_date,note=excluded.note,updated_at=now();

update public.parties p
set hold_status='NO', status='待研究',
    description='获得神无月后的现代长线 PVE 候选骨架；当前神无月尚未确认获得，因此持有状态为 NO。雪御前已获得，其余席位按具体 Boss 配置。', updated_at=now()
from public.games g
where p.game_id=g.id and g.code='YYS' and p.summary='雪御前 + 神无月长线 PVE 骨架';

with yys as (select id from public.games where code='YYS' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description)
select yys.id,'神无月 + 双天照长线 PVE 骨架','长线PVE','待研究','NO','获得神无月后的优先现代 PVE 骨架：神无月 + 天照 + 天照 + 供火/增伤 + 增伤/功能。神无月尚未确认获得，因此当前持有状态为 NO。'
from yys
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

delete from public.party_members pm
using public.parties p, public.games g
where pm.party_id=p.id and p.game_id=g.id and g.code='YYS' and p.summary='神无月 + 双天照长线 PVE 骨架';

with yys as (select id from public.games where code='YYS' limit 1),
c as (select id,name from public.characters where game_id=(select id from yys)),
p as (select id from public.parties where game_id=(select id from yys) and summary='神无月 + 双天照长线 PVE 骨架'),
m(slot_no,name,role) as (values (1,'神无月','核心辅助'),(2,'天照','主输出'),(3,'天照','第二输出'),(4,'供火 / 增伤位','辅助'),(5,'增伤 / 功能位','辅助'))
insert into public.party_members(id,party_id,slot_no,character_id,member_name_raw,member_role)
select gen_random_uuid(),p.id,m.slot_no,c.id,m.name,m.role
from p cross join m left join c on c.name=m.name;

with yys as (select id from public.games where code='YYS' limit 1)
insert into public.mechanisms(game_id,title,mechanism_type,description,note,source_kind,verified_at)
select yys.id,m.title,m.kind,m.description,m.note,m.source_kind,'2026-08-27'::date
from yys cross join (values
 ('式神稀有度体系','system','当前式神目录按 UR / SP / SSR / SR / R / N 管理；联动角色仍按其游戏内稀有度写入，而不是另造一个“联动”稀有度。','已删除角色不进入生产 catalog；达摩素材不作为 playable character 写入 characters。','community'),
 ('式神目录与账号持有分离','system','characters 表表示式神资料目录；character_progress / 阵容持有状态只记录用户已确认的账号事实或明确培养计划。','避免把“数据库里存在式神”误解成“账号已持有”。','guide')
) as m(title,kind,description,note,source_kind)
on conflict(game_id,title) do update set mechanism_type=excluded.mechanism_type,description=excluded.description,note=excluded.note,source_kind=excluded.source_kind,verified_at=excluded.verified_at,updated_at=now();

insert into public.resources(id,resource_type,title,url,note,source,source_host,source_authority,ingested_via)
values
(gen_random_uuid(),'game_homepage','《阴阳师》官方网站','https://yys.163.com/','网易国服官方网站。','网易《阴阳师》官网','yys.163.com','official','manual'),
(gen_random_uuid(),'game_wiki','《阴阳师》官方式神录','https://yys.163.com/shishen/index.html','官方式神目录、式神攻略与御魂/阵容入口。','网易《阴阳师》官网','yys.163.com','official_wiki','manual'),
(gen_random_uuid(),'game_phase_reference','《阴阳师》TapTap 官方页面','https://www.taptap.cn/app/12492','用于核对国服当前客户端版本和近期官方版本信息。','TapTap《阴阳师》官方','www.taptap.cn','official_community','manual'),
(gen_random_uuid(),'game_phase_reference','拾光永恒·十周年前瞻速报','https://www.taptap.cn/moment/841429108763134116','十周年9月9日开启、石长姬登录赠送、周年福利与纪念服预约的官方社区公告。','TapTap《阴阳师》官方','www.taptap.cn','official_community','manual'),
(gen_random_uuid(),'game_catalog_reference','阴阳师 BWIKI 式神档册','https://wiki.biligame.com/yys/%E5%BC%8F%E7%A5%9E%E6%A1%A3%E5%86%8C','用于交叉核对完整 UR/SP/SSR/SR/R/N 与联动式神目录；社区来源，不用于替代活动官方公告。','阴阳师 BWIKI','wiki.biligame.com','community','manual')
on conflict (url) where url is not null do update set resource_type=excluded.resource_type,title=excluded.title,note=excluded.note,source=excluded.source,source_host=excluded.source_host,source_authority=excluded.source_authority,updated_at=now();

with yys as (select id from public.games where code='YYS' limit 1),
r as (select id from public.resources where url in ('https://yys.163.com/','https://yys.163.com/shishen/index.html','https://www.taptap.cn/app/12492','https://www.taptap.cn/moment/841429108763134116','https://wiki.biligame.com/yys/%E5%BC%8F%E7%A5%9E%E6%A1%A3%E5%86%8C'))
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'game',yys.id,'reference'
from yys cross join r
on conflict do nothing;

with yys as (select id from public.games where code='YYS' limit 1),
r as (select id from public.resources where url='https://yys.163.com/shishen/index.html')
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'character',c.id,'official_profile'
from public.characters c join yys on yys.id=c.game_id cross join r
where not exists (
  select 1 from public.resource_relations rr
  where rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type='official_profile'
)
on conflict do nothing;

commit;

create or replace function public.app_search_characters(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_keyword text := nullif(trim(p_payload->>'keyword'), '');
  v_game_code text := nullif(trim(p_payload->>'game_code'), '');
  v_limit int := least(greatest(coalesce((p_payload->>'limit')::int, 120), 1), 1000);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_result
  from (
    select
      c.id,
      c.name as character_name,
      c.full_name,
      g.short_code as game_code,
      coalesce(g.title, g.code, g.short_code) as game_title,
      c.element, c.profession, c.sex, c.rarity, c.note,
      cp.research_status, cp.build_status, cp.progress_note as research_note,
      ce.like_level, ce.role_type, ce.power_rank, ce.note as evaluation_note,
      coalesce((
        select jsonb_object_agg(cn.lang, cn.name order by cn.lang)
        from public.character_names cn
        where cn.character_id=c.id and cn.lang in ('en','jp','kr')
      ), '{}'::jsonb) as names,
      coalesce((
        select jsonb_agg(jsonb_build_object('title',r.title,'url',r.url,'relation_type',rr.relation_type))
        from public.resource_relations rr
        join public.resources r on r.id=rr.resource_id
        where rr.entity_type='character' and rr.entity_id=c.id
      ), '[]'::jsonb) as links
    from public.characters c
    left join public.games g on g.id=c.game_id
    left join public.character_progress cp on cp.character_id=c.id
    left join lateral (
      select * from public.character_evaluations ce0
      where ce0.character_id=c.id
      order by case when ce0.context='current' then 0 else 1 end, ce0.created_at desc nulls last
      limit 1
    ) ce on true
    where (v_game_code is null or g.short_code=v_game_code or g.code=v_game_code or g.title=v_game_code)
      and (
        v_keyword is null
        or c.name ilike '%'||v_keyword||'%'
        or coalesce(c.full_name,'') ilike '%'||v_keyword||'%'
        or coalesce(g.title,'') ilike '%'||v_keyword||'%'
        or coalesce(c.rarity,'') ilike '%'||v_keyword||'%'
        or coalesce(cp.research_status,'') ilike '%'||v_keyword||'%'
        or coalesce(cp.build_status,'') ilike '%'||v_keyword||'%'
        or exists (
          select 1 from public.character_names cn_search
          where cn_search.character_id=c.id and cn_search.name ilike '%'||v_keyword||'%'
        )
      )
    order by c.name
    limit v_limit
  ) x;
  return v_result;
end $function$;
