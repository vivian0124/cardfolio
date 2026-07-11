-- One Piece 繁中別名：官方繁中卡表(asia-hk.onepiece-cardgame.com)的卡名，
-- 依卡號貼到現有的日/英 OPCG 卡上，讓使用者打繁中(魯夫)也能搜到日/英卡。
-- 繁中不另開分頁，只當隱藏的搜尋別名。
-- 在 Supabase Dashboard → SQL Editor 執行

alter table cards add column name_zh text;
