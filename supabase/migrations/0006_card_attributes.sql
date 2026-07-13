-- 卡片屬性欄位，供圖鑑多選篩選使用。
-- PTCG（pokemontcg.io，目前僅英文）：supertype 卡種、types 屬性陣列
-- OPCG（官方卡表，英+日）：color 顏色、category 卡種(LEADER/CHARACTER/EVENT/STAGE/DON)
-- 在 Supabase Dashboard → SQL Editor 執行

alter table cards
  add column supertype text,
  add column types text[],
  add column color text,
  add column category text;
