# 環境設定指南（Phase 0）

程式碼已就緒，以下三個步驟需要本人帳號操作，完成後 App 就能上線。

## 1. Supabase 專案

1. 到 [supabase.com](https://supabase.com) 用 GitHub 帳號登入，**New project**（Free plan）
   - Region 選 `Northeast Asia (Tokyo)`（離台灣最近）
   - Database password 記下來（之後很少用到，但要保存）
2. 建好後到 **SQL Editor**，貼上 [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) 全部內容並執行
3. 到 **Settings → API** 抄下兩個值：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 本機開發：複製 `web/.env.example` 為 `web/.env.local`，填入上面兩個值

## 2. Google 登入

1. 到 [Google Cloud Console](https://console.cloud.google.com) → 建立專案（名稱隨意，例如 `cardfolio`）
2. **APIs & Services → OAuth consent screen**：
   - User type 選 External，App 名稱填 CardFolio，其他必填欄位填自己的 email
   - 不用送審，維持 Testing 狀態即可（把自己的 Gmail 加進 Test users）
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**：
   - Application type：Web application
   - Authorized redirect URIs 填：`https://<你的-project-ref>.supabase.co/auth/v1/callback`
     （project-ref 看 Supabase Project URL 的子網域）
4. 把產生的 **Client ID / Client Secret** 填到 Supabase Dashboard：
   **Authentication → Providers → Google** → 啟用並貼上
5. Supabase **Authentication → URL Configuration**：
   - Site URL：先填 `http://localhost:3000`，Vercel 部署後改成正式網址
   - Redirect URLs 加上：`http://localhost:3000/auth/callback` 和 `https://<vercel網址>/auth/callback`

## 3. Vercel 部署

1. 到 [vercel.com](https://vercel.com) 用 GitHub 帳號登入 → **Add New → Project** → 選 `cardfolio` repo
2. **Root Directory 設成 `web`**（重要，因為是 monorepo 結構）
3. Environment Variables 加入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy。完成後把 Vercel 網址回填到上面 2-5 的 Site URL / Redirect URLs

## 完成檢查

- [ ] 手機瀏覽器打開 Vercel 網址，看到 CardFolio 首頁
- [ ] 「使用 Google 登入」可以完成登入，回到首頁看到自己的 email
- [ ] 手機加入主畫面（iOS Safari：分享 → 加入主畫面），開啟後是全螢幕 App 樣式

## 本機開發

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```
