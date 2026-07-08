# CardFolio

卡牌投資記帳＋收藏圖鑑 PWA（PTCG / One Piece）。功能需求以 `docs/requirements.md` 為準，環境設定步驟在 `docs/setup.md`。

## 架構

- `web/` — Next.js 16 + Tailwind 4 PWA，部署於 Vercel：https://cardfolio-roan.vercel.app
- `crawler/` — Python 爬蟲（Phase 2 起使用），GitHub Actions 排程
- `supabase/migrations/` — 資料庫 schema，改 schema 一律新增編號 migration 檔，不改舊檔
- 資料庫/登入：Supabase（project ref `qxjnxctmkcgegphggzxx`），Google OAuth

## 常用指令

```bash
cd web
npm install       # 第一次或 package.json 變動後
npm run dev       # http://localhost:3000
npm run build     # 驗證能編譯，改完程式碼先跑這個再 commit
```

## 環境變數

`web/.env.local`（不進 git，新機器要手動建）：

```
NEXT_PUBLIC_SUPABASE_URL=https://qxjnxctmkcgegphggzxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ExQF3GtY0HqusXIqbCBv7Q_DbDPoVGy
```

（publishable key 本來就會隨前端公開，放這裡沒有安全疑慮；真正的機密如 Google OAuth Client Secret 只存在 Supabase/GCP 後台，不寫進 repo。）

## 多機開發規範

使用者在 Mac 與 Windows 兩台電腦輪流開發：

- **開工第一件事 `git pull`，收工前 commit + push**，避免兩邊分岔
- main 直推即可（單人專案），commit 訊息用 conventional commits（feat:/fix:/docs:）
- 有未推的變更就結束工作時，主動提醒使用者 push

## 目前進度

- Phase 0（地基）✅：腳手架、Google 登入流程、schema migration 0001、Vercel 部署
- 下一步 Phase 1：手動記帳 MVP（買入含批次輸入、賣出含部分賣出、持有清單、總損益三數字）
- 設計重點：逐筆 lot 記帳、原幣＋匯率儲存、RLS 隔離使用者資料——細節見 docs/requirements.md
