begin;

-- Six-game party audit, 2026-08-27.
-- `status=OK` means the party logic has been researched/validated.
-- `hold_status` remains an account fact. New meta templates are NO until the full team is confirmed on the account.

-- Normalize researched existing parties without rewriting user ownership.
update public.parties p
set status='OK', updated_at=now()
from public.games g
where p.game_id=g.id
  and g.code in ('HSR','WW','ZZZ','ENF','NTE','YYS');

update public.parties p set party_type='直伤-强攻',updated_at=now()
from public.games g where p.game_id=g.id and g.code='ZZZ' and p.summary='叶琉千';
update public.parties p set party_type='异常-紊乱',updated_at=now()
from public.games g where p.game_id=g.id and g.code='ZZZ' and p.summary='爱柚薇';
update public.parties p set party_type='寒冷',updated_at=now()
from public.games g where p.game_id=g.id and g.code='ENF' and p.summary='别礼冰队';
update public.parties p set party_type='电磁',updated_at=now()
from public.games g where p.game_id=g.id and g.code='ENF' and p.summary='庄方宜电队';
update public.parties p set party_type='灼热',updated_at=now()
from public.games g where p.game_id=g.id and g.code='ENF' and p.summary='莱万汀火队';
update public.parties p set party_type='创生',updated_at=now()
from public.games g where p.game_id=g.id and g.code='NTE' and p.summary='娜娜莉创生队';
update public.parties p set party_type='失谐-DOT',updated_at=now()
from public.games g where p.game_id=g.id and g.code='NTE' and p.summary='安魂曲失谐队';

-- Missing current mainstream templates.
with g as (select id from public.games where code='HSR' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description)
select g.id,'海瑟音DOT','DOT','OK','NO',
'【主流模板】海瑟音 + 卡芙卡 + 黑天鹅 + 藿藿。卡芙卡是引爆核心；海瑟音负责多DOT、减防和易伤；黑天鹅负责奥迹副C；藿藿承担生存与回能。第三位可按环境换增幅位。NO表示账号整队未核验。\n[参考](https://www.prydwen.gg/star-rail/characters/hysilens)' from g
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

with g as (select id from public.games where code='WW' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description) values
((select id from g),'清达莫','直伤-Tune Strain','OK','NO','【主流模板】清宵 + 达妮娅 + 莫宁。达妮娅切Tune Strain模式并与莫宁成套使用，清宵承担主站场单体输出；清宵约110–115%共鸣效率起步。NO表示整队未核验。\n[参考](https://www.prydwen.gg/wuthering-waves/characters/qingxiao)'),
((select id from g),'玄千穗','负面状态','OK','NO','【主流模板】秧秧·玄翎 + 千咲 + 穗穗。玄翎主C，千咲负责负面状态增幅，穗穗提供状态辅助与稳定性；千咲高投入/专武价值更明显。NO表示整队未核验。\n[参考](https://www.prydwen.gg/wuthering-waves/characters/chisa)'),
((select id from g),'西仇守','声骸-直伤','OK','NO','【主流模板】西格莉卡 + 仇远 + 守岸人。仇远负责声骸技能增幅，守岸人提供泛用攻击/双暴/生存。NO表示整队未核验。\n[参考](https://www.prydwen.gg/wuthering-waves/characters/sigrika)')
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

with g as (select id from public.games where code='ZZZ' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description)
select g.id,'希诺千','直伤-强攻','OK','NO',
'【主流模板】希格莉德 + 诺姆 + 千夏。诺姆为当前综合最优击破位，千夏提供易维持的增益与额外失衡；击破位可依次考虑琉音、莱卡恩。当前诺姆标记NOT，所以整队保持NO。\n[参考](https://www.prydwen.gg/zenless/characters/sigrid)' from g
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

with g as (select id from public.games where code='ENF' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description) values
((select id from g),'庄梨佩弧','电磁','OK','NO','【主流模板】庄方宜 + 梨诺 + 佩丽卡 + 弧光。庄方宜主控，梨诺增幅/治疗，佩丽卡导电/易伤，弧光补电磁协同；需要控制时可把弧光换诀。NO表示整队未核验。'),
((select id from g),'诀梨汤赛','自然','OK','NO','【主流模板】诀 + 梨诺 + 汤汤 + 赛希。诀双形态主控，梨诺增幅治疗，汤汤控制/回技/附着，赛希增幅/连携；注意同队长息类套装效果不要重复浪费。NO表示整队未核验。'),
((select id from g),'弭千黎骏','物理','OK','NO','【主流模板】弭弗 + 陈千语 + 黎风 + 骏卫。弭弗主控猛击，陈千语破防/连携，黎风连击辅助，骏卫回技辅助；避免再塞另一个高度依赖消耗破防的猛击主C。NO表示整队未核验。')
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

with g as (select id from public.games where code='NTE' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description) values
((select id from g),'安残早伊','浊燃-DOT双核','OK','NO','【主流模板】安魂曲 + 残虹 + 早雾 + 伊洛伊。安魂曲主DOT，残虹速切副C/浊燃，早雾核心辅助，伊洛伊聚怪/覆纹/生存；第四位可按需求换哈尼娅或浔。NO表示整队未核验。'),
((select id from g),'残达早伊','浊燃-覆纹','OK','NO','【主流模板】残虹 + 达芙蒂尔 + 早雾 + 伊洛伊。残虹主C，达芙蒂尔暗属性/倾陷，早雾核心辅助，伊洛伊灵属性/生存；残虹主C对双暴和通用伤害要求高于副C玩法。NO表示整队未核验。')
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

with g as (select id from public.games where code='YYS' limit 1)
insert into public.parties(game_id,summary,party_type,status,hold_status,description) values
((select id from g),'神卑食千葛','极蜃气楼','OK','NO','【主流模板】卑弥呼 + 神无月 + 食灵 + 千姬 + 葛叶。常见配速卑弥呼>252>神无月>食灵>千姬>葛叶；卑弥呼需保持全队攻击最低，神无月常用轮入道+蜃气楼；具体合守次数随词条调整。NO表示除神无月外整队未核验。'),
((select id from g),'狐惠象神言','斗技挂机','OK','NO','【主流模板】不相狐禅 + 晨晖惠比寿 + 毗沙门天 + 神无月 + 言灵。配速狐禅>惠比寿>毗沙门天>神无月>言灵；毗沙门天AI不稳定时可手动点2技能再挂机。NO表示整队未核验。'),
((select id from g),'雪狐紧御魂速刷','御魂速刷','OK','NO','【主流模板】雪御前 + 不相狐禅 + 瑶音紧那罗 + 两个狗粮/功能位。用于当前部分御魂本和爬塔高速短线；不同副本面板阈值、第三人和狗粮数不同，因此保留弹性位。NO表示不相狐禅/瑶音紧那罗持有未核验。')
on conflict(game_id,summary,party_type) do update set status=excluded.status,hold_status=excluded.hold_status,description=excluded.description,updated_at=now();

-- Rebuild member rows for newly seeded templates so roles and FK binding are deterministic.
delete from public.party_members pm
using public.parties p, public.games g
where pm.party_id=p.id and p.game_id=g.id
  and ((g.code='HSR' and p.summary in ('海瑟音DOT'))
    or (g.code='WW' and p.summary in ('清达莫','玄千穗','西仇守'))
    or (g.code='ZZZ' and p.summary in ('希诺千'))
    or (g.code='ENF' and p.summary in ('庄梨佩弧','诀梨汤赛','弭千黎骏'))
    or (g.code='NTE' and p.summary in ('安残早伊','残达早伊'))
    or (g.code='YYS' and p.summary in ('神卑食千葛','狐惠象神言','雪狐紧御魂速刷')));

with members(game_code,summary,slot_no,name,role) as (values
('HSR','海瑟音DOT',1,'海瑟音','DOT核心 / 减防易伤'),('HSR','海瑟音DOT',2,'卡芙卡','引爆核心'),('HSR','海瑟音DOT',3,'黑天鹅','DOT副C / 奥迹'),('HSR','海瑟音DOT',4,'藿藿','生存 / 回能'),
('WW','清达莫',1,'清宵','主C'),('WW','清达莫',2,'达妮娅','Tune Strain核心副C / 增幅'),('WW','清达莫',3,'莫宁','Tune支持 / 治疗'),
('WW','玄千穗',1,'秧秧·玄翎','主C'),('WW','玄千穗',2,'千咲','负面状态辅助'),('WW','玄千穗',3,'穗穗','状态辅助 / 生存'),
('WW','西仇守',1,'西格莉卡','主C'),('WW','西仇守',2,'仇远','声骸技能增幅'),('WW','西仇守',3,'守岸人','泛用生存 / 双暴增幅'),
('ZZZ','希诺千',1,'希格莉德','主C'),('ZZZ','希诺千',2,'诺姆','击破 / 连携启动'),('ZZZ','希诺千',3,'千夏','辅助 / 失衡增幅'),
('ENF','庄梨佩弧',1,'庄方宜','主控输出'),('ENF','庄梨佩弧',2,'梨诺','增幅 / 治疗'),('ENF','庄梨佩弧',3,'佩丽卡','法术易伤 / 导电'),('ENF','庄梨佩弧',4,'弧光','电磁协同'),
('ENF','诀梨汤赛',1,'诀','主控输出 / 双形态'),('ENF','诀梨汤赛',2,'梨诺','增幅 / 治疗'),('ENF','诀梨汤赛',3,'汤汤','控制 / 回技 / 附着'),('ENF','诀梨汤赛',4,'赛希','增幅 / 连携'),
('ENF','弭千黎骏',1,'弭弗','主控输出'),('ENF','弭千黎骏',2,'陈千语','破防 / 连携'),('ENF','弭千黎骏',3,'黎风','连击辅助'),('ENF','弭千黎骏',4,'骏卫','回技辅助'),
('NTE','安残早伊',1,'安魂曲','DOT主C'),('NTE','安残早伊',2,'残虹','速切副C / 浊燃'),('NTE','安残早伊',3,'早雾','核心体系辅助'),('NTE','安残早伊',4,'伊洛伊','聚怪 / 覆纹 / 生存'),
('NTE','残达早伊',1,'残虹','主C'),('NTE','残达早伊',2,'达芙蒂尔','暗属性副C / 倾陷'),('NTE','残达早伊',3,'早雾','核心体系辅助'),('NTE','残达早伊',4,'伊洛伊','灵属性辅助 / 生存'),
('YYS','神卑食千葛',1,'卑弥呼','机制 / 拉条辅助'),('YYS','神卑食千葛',2,'神无月','核心增幅 / 资源'),('YYS','神卑食千葛',3,'食灵','增伤 / 合守'),('YYS','神卑食千葛',4,'千姬','供火 / 增伤'),('YYS','神卑食千葛',5,'葛叶','主输出'),
('YYS','狐惠象神言',1,'不相狐禅','一速 / 控制输出'),('YYS','狐惠象神言',2,'晨晖惠比寿','二速 / 生存辅助'),('YYS','狐惠象神言',3,'毗沙门天','拉条 / 对策'),('YYS','狐惠象神言',4,'神无月','增伤 / 减伤 / 鬼火'),('YYS','狐惠象神言',5,'言灵','控制 / 对策'),
('YYS','雪狐紧御魂速刷',1,'雪御前','主输出'),('YYS','雪狐紧御魂速刷',2,'不相狐禅','收尾 / 辅助输出'),('YYS','雪狐紧御魂速刷',3,'瑶音紧那罗','增伤 / 辅助输出'),('YYS','雪狐紧御魂速刷',4,'狗粮 / 功能位','狗粮 / 功能'),('YYS','雪狐紧御魂速刷',5,'狗粮 / 功能位','狗粮 / 功能')
), resolved as (
 select p.id party_id,m.slot_no,m.name,m.role,c.id character_id
 from members m
 join public.games g on g.code=m.game_code
 join public.parties p on p.game_id=g.id and p.summary=m.summary
 left join public.characters c on c.game_id=g.id and c.name=m.name
)
insert into public.party_members(id,party_id,slot_no,character_id,member_name_raw,member_role)
select gen_random_uuid(),party_id,slot_no,character_id,name,role from resolved;

commit;
