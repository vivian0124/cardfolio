-- 卡牌目錄（games/card_sets/cards）是公開資料，開放匿名讀取。
-- 目的：伺服器端能用無 session 的用戶端查卡表並用 Next 資料快取
-- 跨使用者共用（大幅減少每次頁面載入的資料庫往返）。
-- 使用者的記帳資料（inventory/lots/sales/wishlist）不受影響，仍只限本人。
-- 在 Supabase Dashboard → SQL Editor 執行

drop policy "catalog readable" on games;
drop policy "catalog readable" on card_sets;
drop policy "catalog readable" on cards;

create policy "catalog readable" on games
  for select to anon, authenticated using (true);
create policy "catalog readable" on card_sets
  for select to anon, authenticated using (true);
create policy "catalog readable" on cards
  for select to anon, authenticated using (true);
