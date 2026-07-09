-- 統一所有卡表來源的識別鍵為 external_id，拿掉舊的 (set_id, card_no) 唯一約束。
--
-- 背景：繁中卡表（多來源合輯商品，如「初階牌組100對戰收藏」）真的會有
-- 不同卡共用同一個印刷收藏編號，(set_id, card_no) 唯一約束因此把整批
-- 合法資料擋在外面。external_id 才是每張卡的真正身分（各來源自訂格式），
-- 改用它當唯一鍵即可讓所有來源共存。
--
-- 在 Supabase Dashboard → SQL Editor 執行

-- 幫既有的英文卡（目前 external_id 皆為 NULL）補上與爬蟲程式碼一致的識別碼
update cards c
set external_id = cs.game_id || '-' || cs.language || '-' || cs.code || '-' || c.card_no
from card_sets cs
where c.set_id = cs.id and c.external_id is null;

alter table cards drop constraint cards_set_id_card_no_key;
alter table cards alter column external_id set not null;
