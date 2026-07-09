-- 日文 PTCG 卡以官方 cardID 作穩定識別（card_no 先佔位、之後可補完收藏編號）
-- 在 Supabase Dashboard → SQL Editor 執行

alter table cards add column external_id text unique;
