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
from functools import partial

from dotenv import load_dotenv

from cardfolio_crawler import opcg, opcg_zh_alias, ptcg_en, ptcg_ja, ptcg_zh_tw

SOURCES = {
    "ptcg-en": ptcg_en.sync,
    "opcg-en": partial(opcg.sync, language="en"),
    "opcg-ja": partial(opcg.sync, language="ja"),
    "ptcg-ja": ptcg_ja.sync,
    "ptcg-zh-tw": ptcg_zh_tw.sync,
    "opcg-zh-alias": opcg_zh_alias.sync,
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
    failures = []
    for name in targets:
        # 一個來源掛掉不影響其他來源，全部跑完再回報失敗
        try:
            SOURCES[name](writer, limit_sets=args.limit_sets)
        except Exception as e:
            failures.append(name)
            print(f"[{name}] 同步失敗：{e}")
    if failures:
        raise SystemExit(f"部分來源失敗：{failures}")


if __name__ == "__main__":
    main()
