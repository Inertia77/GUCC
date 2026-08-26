-- Production migration: 20260826090148 gucc_core_game_mechanisms_seed_20260826
-- Core system/mechanism knowledge for the five maintained games.

insert into public.mechanisms
  (id, game_id, title, mechanism_type, description, note, source_url, source_kind, verified_at)
select gen_random_uuid(), g.id, v.title, v.mechanism_type, v.description, v.note, v.source_url, v.source_kind, date '2026-08-26'
from public.games g
join (values
  ('HSR','战技点','resource','战技点是全队共享的战斗资源。多数战技会消耗战技点，普攻及部分角色机制可恢复或改变战技点；队伍循环需要同时管理角色行动与全队战技点收支。','以当前正式服通用战斗规则为准。','https://www.hoyolab.com/article/18284373','official_community'),
  ('HSR','能量与终结技','resource','角色通过攻击、受击及技能/装备效果等获得能量；达到各自终结技所需能量后可发动终结技。部分终结技可在通常行动顺序之外插入结算。','不同角色的能量上限与回能规则可能不同。','https://bbs.mihoyo.com/sr/wiki/channel/map/17/30','official_community'),
  ('HSR','弱点、韧性与弱点击破','break','敌人具有弱点属性与韧性条。使用对应弱点属性攻击可削减韧性；韧性归零时触发弱点击破，并根据击破属性产生伤害、延后行动及对应击破效果。','击破伤害与效果受角色等级、击破特攻、敌方韧性等因素影响。','https://www.hoyolab.com/article/18284373','official_community'),
  ('HSR','行动值与速度','core_combat','速度决定角色与敌人的行动频率，并对应行动值消耗；行动提前/延后会直接改变行动值或行动顺序，是排轴和多动的重要基础。','用于理解排轴、速度阈值与行动提前/延后。','https://www.hoyolab.com/article/18284373','official_community'),
  ('HSR','追加攻击','core_combat','追加攻击是在满足角色特定触发条件后额外发动的攻击，不等同于角色主动回合中的普通攻击或战技；可与专门强化追加攻击的装备、天赋与队伍机制联动。','具体触发条件由角色技能定义。','https://bbs.mihoyo.com/sr/wiki/channel/map/17/30','official_community'),
  ('HSR','持续伤害（DoT）','core_combat','持续伤害是附着于敌方目标的周期性伤害效果，常见于裂伤、灼烧、触电、风化等状态；通常在敌方回合等指定时点结算，并可被角色/装备机制强化或提前结算。','DoT=Damage over Time（持续伤害）。','https://bbs.mihoyo.com/sr/wiki/channel/map/17/30','official_community'),
  ('HSR','超击破','break','在目标处于弱点击破状态且队伍具备可触发超击破的角色/机制时，攻击可额外造成超击破伤害；其价值与削韧量、击破特攻及相关增益紧密相关。','并非所有队伍天然拥有超击破结算，需要对应角色或机制开启。','https://bbs.mihoyo.com/sr/wiki/channel/map/17/30','official_community'),
  ('WW','协奏能量','resource','角色在战斗中通过攻击、技能、闪避等行为积累协奏能量；协奏能量充满后切换角色可进入完整的协奏切换流程。','角色的协奏获取效率与循环方式因技能组不同。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105','official_wiki'),
  ('WW','变奏技能与延奏技能','switch','协奏能量充满后切换角色时，入场角色可触发变奏技能，离场角色触发延奏技能/效果；这是鸣潮队伍切人、增益承接和爆发轴的核心接口。','具体延奏持续时间、加成对象和可否被切人终止以技能文本为准。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105','official_wiki'),
  ('WW','共鸣回路','core_combat','共鸣回路是角色特有的核心资源/状态机制，通常由特定攻击或技能积累，并改变强化普攻、重击、共鸣技能等招式，是区分角色循环的关键。','每名角色的回路名称、资源与消耗方式不同。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105','official_wiki'),
  ('WW','共鸣能量与共鸣解放','resource','共鸣能量由战斗行为积累，达到角色需求后可施放共鸣解放；解放通常承担爆发、增益、状态转换或队伍支援等作用。','不同角色能量需求与回能方式不同。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105','official_wiki'),
  ('WW','声骸技能','equipment','装备主声骸后可获得对应声骸技能，主动使用可造成伤害、位移、变身或提供增益；声骸技能是角色循环与配装的一部分。','以当前声骸图鉴和角色构筑为准。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1107','official_wiki'),
  ('WW','合鸣效果','equipment','角色装备满足套装条件的声骸后可激活对应合鸣效果，为角色提供属性、伤害、治疗、辅助或特定机制增益。','套装需求与效果随版本新增内容扩展。','https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1219','official_wiki'),
  ('WW','偏谐值与谐度破坏','break','部分当前战斗内容中敌人具有偏谐相关防御机制；通过具备对应谐度破坏能力的攻击削减相关数值，可打破敌方特殊防护并创造输出窗口。','属于版本扩展后的战斗机制，具体数值和适用敌人以当前正式服文本为准。','https://www.kurobbs.com/mc/official','official_community'),
  ('ZZZ','失衡值与失衡状态','break','攻击会积累敌人的失衡值；达到阈值后敌人进入失衡状态，暂时无法行动并承受更高伤害，为队伍创造集中爆发窗口。','击破类代理人通常拥有更高的失衡效率。','https://www.hoyolab.com/article/30591116','official_community'),
  ('ZZZ','连携技','team','使用带有重击效果的招式命中处于失衡状态的敌人可触发连携技；队伍成员依次释放连携技，是失衡窗口的重要爆发组成。','普通、精英与首领敌人的可连携次数不同。','https://www.hoyolab.com/article/30591504','official_community'),
  ('ZZZ','极限支援与支援点','action','敌方攻击出现可支援提示时切换代理人可触发极限支援；极限支援会消耗支援点，根据代理人类型表现为招架支援或回避支援，并可衔接支援突击。','连携技、终结技等行为可恢复支援点。','https://www.hoyolab.com/article/30591504','official_community'),
  ('ZZZ','属性异常','reaction','属性攻击会积累对应属性异常值；积蓄完成后触发相应属性异常状态及伤害/持续效果。不同属性的异常积蓄独立计算。','异常掌控影响积蓄效率，异常精通等属性影响相关伤害。','https://www.hoyolab.com/article/30591205','official_community'),
  ('ZZZ','紊乱','reaction','目标处于一种属性异常状态时，再触发另一种属性异常可触发紊乱，额外造成伤害并积累失衡值，同时替换/结算原有异常效果。','是异色异常队的重要输出机制。','https://www.hoyolab.com/article/30591205','official_community'),
  ('ZZZ','能量与强化特殊技','resource','代理人通过战斗积累能量；能量达到技能需求后，特殊技会转为强化特殊技，通常拥有更高伤害、异常/失衡效率或机制效果。','不同代理人的能量需求与强化特殊技作用不同。','https://www.hoyolab.com/article/30591504','official_community'),
  ('ZZZ','喧响值与终结技','resource','战斗中的技能与特定动作会积累喧响值；达到“极”阶段后代理人可发动终结技。喧响是队伍战斗节奏和爆发资源的一部分。','当前机制以正式服实际喧响规则为准。','https://www.hoyolab.com/article/37522351','official_community'),
  ('ENF','技力与战技','resource','干员使用战技需要技力；普通攻击、极限闪避及角色技能等机制可参与技力循环。队伍需要围绕技力获取和战技消耗安排技能顺序。','具体技力获取与消耗由干员技能定义。','https://endfield.gryphline.com/zh-tw/news/1340','official'),
  ('ENF','连携技','team','干员满足各自连携条件后可发动连携技，通过队友协同形成技能链，并与异常状态、终结技能量等机制产生联动。','官方后续版本持续优化连携技描述与表现。','https://endfield.gryphline.com/zh-tw/news/0751','official'),
  ('ENF','终结技能量与终结技','resource','队伍通过战斗与部分连携技等效果获得终结技能量；达到需求后可施放干员终结技。','不同干员的终结技能量获取方式与需求不同。','https://endfield.gryphline.com/zh-tw/news/0751','official'),
  ('ENF','失衡与处决','break','持续攻击与技能可削减/累积敌人的失衡相关数值；敌人进入可处决或失衡窗口后，队伍可利用对应技能造成高额收益。','具体处决触发条件随敌人和技能而异。','https://endfield.gryphline.com/zh-tw/news/0751','official'),
  ('ENF','失衡节点','break','部分强敌具有失衡节点；敌人的失衡值累积到特定节点时会短暂踉跄，为输出或战术调整提供窗口。','官方开发组在战斗系统重构中明确加入。','https://endfield.gryphline.com/zh-tw/news/1340','official'),
  ('ENF','物理异常与破防层数','reaction','物理异常使用破防层数机制，最多可叠加4层；击飞与倒地可增加破防层数，猛击与碎甲可消耗层数并触发不同效果。','以当前正式服术语与角色技能为准。','https://endfield.gryphline.com/zh-tw/news/1340','official'),
  ('ENF','法术附着与法术异常','reaction','法术附着最多可叠加4层；重复施加同种法术附着会触发法术爆发并叠层，随后施加不同法术附着会消耗已有附着并触发对应法术异常。','是元素/法术队伍联动的基础。','https://endfield.gryphline.com/zh-tw/news/1340','official'),
  ('ENF','极限闪避','action','在敌人攻击命中前的瞬间闪避可触发极限闪避，返还部分体力并恢复少量技力，使防御操作直接参与资源循环。','官方战斗系统说明。','https://endfield.gryphline.com/zh-tw/news/1340','official'),
  ('ENF','集成工业系统','system','集成工业系统允许管理员通过设备、管线、物流与蓝图等构建自动化生产网络，是终末地探索与资源生产的核心长期系统。','持续随版本扩展设备、蓝图与操作功能。','https://endfield.gryphline.com/zh-tw/news/0751','official'),
  ('NTE','倾陷值','break','敌人具有倾陷/韧性相关数值；完美闪避反击、角色技能等可大量削减倾陷值，打空后为队伍创造压制与输出机会。','国服公测实机与社区攻略交叉核对；官方当前未提供完整底层公式。','https://www.taptap.cn/moment/796593396679445768','community'),
  ('NTE','环合值与异能环合','switch','角色通过战斗行为积累环合值；满足环合条件并切换到可与当前属性形成环合的角色时，可触发异能环合及对应援护/联动效果。','异能环合是当前配队与切人循环的核心机制。','https://www.taptap.cn/app/714119/strategy/entity-collection/358950','community'),
  ('NTE','异能属性邻接联动','reaction','不同异能属性之间存在可环合关系；符合关系的前后场角色切换可触发对应环合效果，不同属性组合产生不同战斗收益。','以国服当前异能环合关系图和正式服实际表现为准。','https://www.taptap.cn/app/714119/strategy/entity-collection/358950','community'),
  ('NTE','完美闪避与闪避反击','action','在敌人攻击命中的关键时机闪避可触发完美闪避，并可衔接闪避反击；闪避反击能显著削减倾陷值，是防守转进攻的重要手段。','国服公测实机机制。','https://www.taptap.cn/moment/796593396679445768','community'),
  ('NTE','弹刀','action','部分敌方攻击出现红圈提示时，以正确时机攻击可触发弹刀，打断敌人动作并快速补充环合资源。','不同招式对弹刀窗口的适配以实机为准。','https://www.taptap.cn/moment/796593396679445768','community'),
  ('NTE','弧盘','equipment','弧盘是角色的重要装备/武器成长组件，提供基础属性与特效，不同角色根据定位和循环选择对应弧盘。','国服公测版本持续新增弧盘及获取方式。','https://www.taptap.cn/moment/834486510827866990','community'),
  ('NTE','空幕、卡带与驱动块','equipment','空幕是模块化装备系统，由卡带与驱动块组成；卡带决定套装效果，驱动块提供词条并需要按形状/类型满足套装激活条件。','当前攻略普遍按1张卡带+对应驱动块体系进行构筑。','https://www.taptap.cn/moment/797919727161705545','community')
) as v(code, title, mechanism_type, description, note, source_url, source_kind)
  on v.code = g.code
where g.code in ('HSR','WW','ZZZ','ENF','NTE')
on conflict (game_id, title) do update set
  mechanism_type = excluded.mechanism_type,
  description = excluded.description,
  note = excluded.note,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  verified_at = excluded.verified_at,
  updated_at = now();
