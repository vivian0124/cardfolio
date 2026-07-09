"""PTCG 日文卡表：pokemon-card.com 內部搜尋 API（resultAPI.php）全卡分頁掃描。

這個 API 只給 cardID／卡名／卡圖，沒有收藏編號與稀有度：
- card_no 先存 "#<cardID>" 佔位（卡圖上看得到實際編號，選卡不受影響）
- external_id 存官方 cardID，之後補完詳細資料時以此為穩定識別
- 系列代碼藏在卡圖路徑裡（/card_images/large/SV11B/...）

注意：官方 CDN 會快取 API 回應，每個請求都要帶防快取參數；
也要帶 Referer / X-Requested-With，否則拿到過期或錯誤內容。
"""

from __future__ import annotations

import time

import requests

BASE = "https://www.pokemon-card.com"
API = f"{BASE}/card-search/resultAPI.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (cardfolio catalog sync)",
    "Referer": f"{BASE}/card-search/index.php",
    "X-Requested-With": "XMLHttpRequest",
}
SLEEP = 1.0


def _fetch_page(page: int) -> dict:
    # 注意：pg 參數是「商品 ID 過濾」不是頁碼，必須留空；分頁用 page
    params = {
        "keyword": "",
        "se_ta": "",
        "regulation_sidebar_form": "all",
        "pg": "",
        "page": page,
        "illust": "",
        "sm_and_keyword": "true",
        "_cb": int(time.time() * 1000),  # 防 CDN 快取
    }
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            resp = requests.get(API, params=params, headers=HEADERS, timeout=60)
            if resp.status_code == 429 or resp.status_code >= 500:
                raise RuntimeError(f"HTTP {resp.status_code}")
            resp.raise_for_status()
            data = resp.json()
            if data.get("result") != 1:
                raise RuntimeError(f"API result != 1: {data.get('errMsg')}")
            return data
        except Exception as e:
            last_error = e
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"resultAPI pg={pg} 重試 5 次仍失敗：{last_error}")


def _set_code(thumb: str) -> str:
    # /assets/images/card_images/large/SV11B/046466_P_XXX.jpg → SV11B
    parts = [p for p in thumb.split("/") if p]
    return parts[-2] if len(parts) >= 2 else "UNKNOWN"


def sync(writer, limit_sets: int | None = None, log=print) -> None:
    """limit_sets 對此來源代表「最多掃描的頁數」（測試用）。"""
    first = _fetch_page(1)
    max_page = first["maxPage"]
    pages = min(max_page, limit_sets) if limit_sets else max_page
    log(f"[ptcg-ja] 共 {first['hitCnt']} 張、{max_page} 頁，本次掃 {pages} 頁")

    cards_by_id: dict[str, dict] = {}
    for pg in range(1, pages + 1):
        data = first if pg == 1 else _fetch_page(pg)
        for c in data.get("cardList", []):
            card_id = str(c["cardID"])
            thumb = c.get("cardThumbFile") or ""
            cards_by_id[card_id] = {
                "external_id": f"ptcg-ja-{card_id}",
                "card_no": f"#{card_id}",
                "name": c.get("cardNameViewText") or c.get("cardNameAltText"),
                "image_url": BASE + thumb if thumb else None,
                "_set_code": _set_code(thumb),
            }
        if pg % 50 == 0:
            log(f"[ptcg-ja] 已掃 {pg}/{pages} 頁（累計 {len(cards_by_id)} 張）")
        if pg < pages:
            time.sleep(SLEEP)

    set_codes = sorted({c["_set_code"] for c in cards_by_id.values()})
    log(f"[ptcg-ja] 掃描完成：{len(cards_by_id)} 張、{len(set_codes)} 個系列")

    if not writer:
        return

    set_rows = [
        {"game_id": "ptcg", "code": code, "name": code, "language": "ja"}
        for code in set_codes
    ]
    writer.upsert("card_sets", set_rows, on_conflict="game_id,code,language")
    id_map = writer.set_id_map("ptcg", "ja")

    rows = []
    for c in cards_by_id.values():
        rows.append(
            {
                "set_id": id_map[c["_set_code"]],
                "external_id": c["external_id"],
                "card_no": c["card_no"],
                "name": c["name"],
                "image_url": c["image_url"],
            }
        )
    written = writer.upsert("cards", rows, on_conflict="external_id")
    log(f"[ptcg-ja] 寫入 {written} 張")
