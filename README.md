# CardFolio

卡牌投資記帳 PWA — 記錄 TCG 卡牌（寶可夢 PTCG / One Piece）的買入與賣出，計算投資損益。

## 為什麼做這個

收藏卡牌同時也在做卡牌買賣，需要一個手機上就能操作的工具來記錄：

- 單卡、補充包、禮盒的**買入成本**（含手續費、運費）
- **賣出金額**與平台費用
- 整體與單項的**投資損益**

## 架構

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ 爬蟲 (Python) │ ──▶ │  Supabase        │ ◀── │ Next.js PWA  │
│ GitHub Actions│     │ (Postgres + Auth)│     │  (Vercel)    │
│ 定期更新卡表   │     │ 卡牌目錄 + 交易紀錄│     │ 手機操作介面   │
└──────────────┘     └──────────────────┘     └──────────────┘
```

| 層 | 技術 | 說明 |
|---|---|---|
| 前端 | Next.js + Tailwind CSS | mobile-first PWA，部署 Vercel |
| 資料庫/登入 | Supabase 免費方案 | 從第一天就帶 `user_id` + RLS，預留多人擴充 |
| 卡牌目錄 | Python 爬蟲 + pokemontcg.io API | GitHub Actions 排程更新 |

### 資料來源

- **PTCG（英文）**：[pokemontcg.io](https://pokemontcg.io) 免費 API
- **PTCG（日文）**：pokemon-card.com 官方卡表爬蟲
- **One Piece**：onepiece-cardgame.com 官方 cardlist 爬蟲

## 目錄結構

```
cardfolio/
├── web/          # Next.js PWA
├── crawler/      # Python 爬蟲與 API 同步
├── docs/         # 規劃文件、資料模型、功能規格
└── .github/      # CI / 爬蟲排程 workflows
```

## 開發階段

- [ ] **Phase 0 — 地基**：repo、Next.js 腳手架、Supabase、Vercel 部署
- [ ] **Phase 1 — 手動記帳 MVP**：手動新增買入/賣出、持有清單、總損益（不等爬蟲，先真實使用）
- [ ] **Phase 2 — 卡牌目錄**：接 API + 爬蟲，排程更新卡表
- [ ] **Phase 3 — 選卡整合**：搜尋/自動完成選卡、卡圖顯示
- [ ] **Phase 4 — 儀表板**：ROI、月度損益、庫存明細
- [ ] **Phase 5+**：多人開放、拆盒成本分攤、市價快照追蹤

詳細功能規格見 [docs/](docs/)。
