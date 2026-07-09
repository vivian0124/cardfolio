"""卡牌目錄同步入口。

用法：
  python sync.py ptcg-en [--dry-run] [--limit-sets N]
  python sync.py opcg-en [--dry-run] [--limit-sets N]
  python sync.py all

正式寫入需要環境變數 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
（本機放 crawler/.env，GitHub Actions 用 repo secrets）。
--dry-run 只抓資料印出統計，不碰資料庫。
"""

import argparse

from dotenv import load_dotenv

from cardfolio_crawler import opcg_en, ptcg_en

SOURCES = {
    "ptcg-en": ptcg_en.sync,
    "opcg-en": opcg_en.sync,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="CardFolio 卡牌目錄同步")
    parser.add_argument("source", choices=[*SOURCES, "all"])
    parser.add_argument("--dry-run", action="store_true", help="只抓不寫 DB")
    parser.add_argument("--limit-sets", type=int, help="只同步最新 N 個系列（測試用）")
    args = parser.parse_args()

    load_dotenv()

    writer = None
    if not args.dry_run:
        from cardfolio_crawler.db import SupabaseWriter

        writer = SupabaseWriter()

    targets = list(SOURCES) if args.source == "all" else [args.source]
    for name in targets:
        SOURCES[name](writer, limit_sets=args.limit_sets)


if __name__ == "__main__":
    main()
