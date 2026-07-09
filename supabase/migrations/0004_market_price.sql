-- 手動市價欄位（Phase 5a）：使用者自行填目前市價，算未實現損益。
-- 自動市價爬蟲留待收藏編號比對問題解決後再做。
-- 在 Supabase Dashboard → SQL Editor 執行

alter table inventory_items
  add column market_price_twd numeric(12, 2),
  add column market_price_updated_at timestamptz;
