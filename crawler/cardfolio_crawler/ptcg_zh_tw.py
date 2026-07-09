"""PTCG 繁體中文卡表：asia.pokemon-card.com/tw（伺服器渲染頁面）。

- 系列清單：搜尋頁側欄的 expansionCode checkbox（代碼＋中文名稱）
- 每系列卡片：list 頁翻頁（每頁 20 張，只有 detail id 與卡圖）
- 卡名／收藏編號：要進每張卡的詳細頁 → 做成增量同步：
  已入庫（external_id = ptcg-tw-<id>）的卡不重抓，
  每次執行最多抓 MAX_DETAILS 張新卡的詳細頁，跑幾次自然補完。
"""

from __future__ import annotations

import os
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://asia.pokemon-card.com"
ROOT = f"{BASE}/tw"
HEADERS = {"User-Agent": "Mozilla/5.0 (cardfolio catalog sync)"}
SLEEP = 0.7
# 每次執行最多抓幾張新卡的詳細頁（Actions 60 分鐘限制內的安全值）
MAX_DETAILS = int(os.environ.get("PTCG_TW_MAX_DETAILS", "1500"))

DETAIL_RE = re.compile(r"/tw/card-search/detail/(\d+)/")


def _soup(url: str, params: dict | None = None) -> BeautifulSoup:
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=60)
            if resp.status_code == 429 or resp.status_code >= 500:
                raise RuntimeError(f"HTTP {resp.status_code}")
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            last_error = e
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"{url} 重試 4 次仍失敗：{last_error}")


def fetch_expansions() -> list[dict]:
    """側欄的系列 checkbox：value=代碼、label=中文名稱（新到舊）。"""
    soup = _soup(f"{ROOT}/card-search/")
    expansions = []
    for box in soup.select("input.expansionCode"):
        code = (box.get("value") or "").strip()
        label = soup.select_one(f'label[for="{box.get("id")}"]')
        if code and label:
            expansions.append({"code": code, "name": label.get_text(strip=True)})
    return expansions


def fetch_card_entries(code: str) -> list[dict]:
    """某系列所有卡的 detail id 與卡圖（翻頁到空頁為止）。"""
    entries: list[dict] = []
    seen: set[str] = set()
    page = 1
    while True:
        soup = _soup(
            f"{ROOT}/card-search/list/",
            params={"expansionCodes": code, "pageNo": page},
        )
        found_new = False
        for li in soup.select("li.card a[href]"):
            m = DETAIL_RE.search(li.get("href") or "")
            if not m or m.group(1) in seen:
                continue
            seen.add(m.group(1))
            img = li.select_one("img")
            image_url = (
                (img.get("data-original") or img.get("src") or "").strip()
                if img
                else ""
            )
            entries.append(
                {"detail_id": m.group(1), "image_url": image_url or None}
            )
            found_new = True
        if not found_new:  # 空頁或整頁重複 → 結束（超過最大頁數時站方會回第 1 頁）
            return entries
        page += 1
        time.sleep(SLEEP)


def fetch_detail(detail_id: str) -> dict:
    """詳細頁：卡名（h1 去掉進化標記）與收藏編號。"""
    soup = _soup(f"{ROOT}/card-search/detail/{detail_id}/")
    h1 = soup.select_one("h1")
    for span in h1.select("span"):
        span.decompose()
    number = soup.select_one(".collectorNumber")
    return {
        "name": h1.get_text(strip=True),
        "card_no": number.get_text(strip=True) if number else f"#{detail_id}",
    }


def sync(writer, limit_sets: int | None = None, log=print) -> None:
    expansions = fetch_expansions()
    if limit_sets:
        expansions = expansions[:limit_sets]  # 側欄本來就是新到舊
    log(f"[ptcg-zh-tw] {len(expansions)} 個系列，本次詳細頁預算 {MAX_DETAILS} 張")

    existing = writer.existing_external_ids("ptcg-tw-") if writer else set()
    budget = MAX_DETAILS
    total_new = 0
    failed: list[str] = []

    for exp in expansions:
        if budget <= 0:
            log("[ptcg-zh-tw] 本次預算用完，其餘留待下次執行")
            break
        try:
            entries = fetch_card_entries(exp["code"])
            new_entries = [
                e for e in entries if f"ptcg-tw-{e['detail_id']}" not in existing
            ]
            log(
                f"[ptcg-zh-tw] {exp['code']} {exp['name']}: "
                f"共 {len(entries)} 張、新 {len(new_entries)} 張"
            )
            if writer:
                writer.upsert(
                    "card_sets",
                    [
                        {
                            "game_id": "ptcg",
                            "code": exp["code"],
                            "name": exp["name"],
                            "language": "zh-TW",
                            "total_cards": len(entries),
                        }
                    ],
                    on_conflict="game_id,code,language",
                )
                id_map = writer.set_id_map("ptcg", "zh-TW")

            rows = []
            # dry-run 時每系列只抽 5 張詳細頁驗證解析，不燒整個預算
            per_set_cap = budget if writer else 5
            for e in new_entries[:per_set_cap]:
                detail = fetch_detail(e["detail_id"])
                rows.append(
                    {
                        "external_id": f"ptcg-tw-{e['detail_id']}",
                        "card_no": detail["card_no"],
                        "name": detail["name"],
                        "image_url": e["image_url"],
                    }
                )
                time.sleep(SLEEP)
            budget -= len(rows)
            total_new += len(rows)

            if writer and rows:
                for r in rows:
                    r["set_id"] = id_map[exp["code"]]
                # 同系列同編號的異圖卡以 external_id 區分
                writer.upsert("cards", rows, on_conflict="external_id")
        except Exception as e:
            failed.append(exp["code"])
            log(f"[ptcg-zh-tw] {exp['code']} 失敗，跳過：{e}")
            continue
        time.sleep(SLEEP)

    log(
        f"[ptcg-zh-tw] 完成，本次新增 {total_new} 張"
        + (f"，失敗：{failed}" if failed else "")
    )
