begin;

-- ENF: keep concise Chinese display names while preserving official full names.
update public.characters
set name = '方宜', full_name = '庄方宜', updated_at = now()
where id = '503275d8-3665-531b-b27a-5c36fff908e0'::uuid;

update public.character_names
set name = '方宜', updated_at = now()
where character_id = '503275d8-3665-531b-b27a-5c36fff908e0'::uuid and lang = 'zh';

update public.characters
set name = '千语', full_name = '陈千语', updated_at = now()
where id = 'e4609aed-ecd0-5162-aab9-60d3fc3245ec'::uuid;

update public.character_names
set name = '千语', updated_at = now()
where character_id = 'e4609aed-ecd0-5162-aab9-60d3fc3245ec'::uuid and lang = 'zh';

-- ZZZ: verified Chinese full names. Main display names stay concise.
update public.characters c
set full_name = v.full_name, updated_at = now()
from (values
  ('丽娜', '亚历山德丽娜·莎芭丝缇安'),
  ('安比', '安比·德玛拉'),
  ('妮可', '妮可·德玛拉'),
  ('比利', '比利·奇德'),
  ('猫又', '猫宫又奈'),
  ('可琳', '可琳·威克斯'),
  ('莱卡恩', '冯·莱卡恩'),
  ('珂蕾妲', '珂蕾妲·贝洛伯格'),
  ('安东', '安东·伊万诺夫'),
  ('本', '本·比格'),
  ('格莉丝', '格莉丝·霍华德'),
  ('艾莲', '艾莲·乔'),
  ('凯撒', '凯撒·金'),
  ('柏妮思', '柏妮思·怀特'),
  ('派派', '派派·韦尔'),
  ('露西', '露西亚娜·奥克希斯·提奥多·德·蒙特夫'),
  ('简', '简·杜'),
  ('赛斯', '赛斯·洛威尔'),
  ('伊芙琳', '伊芙琳·舒瓦利耶'),
  ('波可娜', '波可娜·费雷尼'),
  ('爱丽丝', '爱丽丝·泰姆菲尔德'),
  ('维琳娜', '维琳娜·艾嘉德'),
  ('希格莉德', '希格莉德·德拉叙尔'),
  ('蕾米埃尔', '蕾米埃尔·丹')
) as v(short_name, full_name)
join public.games g on g.id = c.game_id
where g.short_code = '绝' and c.name = v.short_name;

commit;
