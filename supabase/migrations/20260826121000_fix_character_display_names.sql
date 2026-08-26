begin;

comment on column public.characters.name is '中文主显示名 / 游戏内通常称呼；不得为了缩短而擅自省略姓氏或正式称呼';
comment on column public.characters.full_name is '中文全名；可与 name 完全一致';

update public.characters
set name = '庄方宜',
    full_name = '庄方宜',
    updated_at = now()
where id = '503275d8-3665-531b-b27a-5c36fff908e0'::uuid;

update public.character_names
set name = '庄方宜', updated_at = now()
where character_id = '503275d8-3665-531b-b27a-5c36fff908e0'::uuid
  and lang = 'zh';

update public.characters
set name = '陈千语',
    full_name = '陈千语',
    updated_at = now()
where id = 'e4609aed-ecd0-5162-aab9-60d3fc3245ec'::uuid;

update public.character_names
set name = '陈千语', updated_at = now()
where character_id = 'e4609aed-ecd0-5162-aab9-60d3fc3245ec'::uuid
  and lang = 'zh';

commit;
