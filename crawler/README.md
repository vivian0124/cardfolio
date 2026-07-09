# CardFolio 卡牌目錄爬蟲

把卡牌目錄同步進 Supabase 的 `card_sets` / `cards` 表。

| 來源 | 說明 |
|---|---|
| `ptcg-en` | PTCG 英文，[pokemontcg.io](https://pokemontcg.io) API |
| `opcg-en` | One Piece 英文，官方 en.onepiece-cardgame.com 卡表 |

## 本機執行

```bash
cd crawler
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 先 dry-run 測試（不碰資料庫）
python sync.py opcg-en --dry-run --limit-sets 2

# 正式寫入：先建 crawler/.env，內容見下方
python sync.py all
```

`crawler/.env`（不進 git）：

```
SUPABASE_URL=https://qxjnxctmkcgegphggzxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase Dashboard → Settings → API keys → service_role>
PTCG_API_KEY=<選填，https://dev.pokemontcg.io 免費申請，可提高限流上限>
```

> service_role key 有完整資料庫權限，只放在 `.env` 和 GitHub Secrets，**絕不能**放進前端或 commit。

## 排程

GitHub Actions（`.github/workflows/sync-catalog.yml`）每週六早上自動跑，
也可以在 repo 的 Actions 頁手動觸發（workflow_dispatch）。

需要先在 GitHub repo → Settings → Secrets and variables → Actions 加入：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PTCG_API_KEY`（選填）

## 之後的來源（Phase 2 後段）

- `ptcg-ja`：pokemon-card.com 官方卡表
- `opcg-ja`：onepiece-cardgame.com
- 繁中版本：官網結構待調查
