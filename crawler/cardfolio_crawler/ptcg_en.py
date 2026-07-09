"""PTCG 英文卡表：pokemontcg.io 免費 API（有 PTCG_API_KEY 環境變數就帶上）。"""

from __future__ import annotations

import os
import time

import requests

API = "https://api.pokemontcg.io/v2"
PAGE_SIZE = 250
SLEEP = 2.0  # 無 API key 的保守節流


def _headers() -> dict:
    key = os.environ.get("PTCG_API_KEY")
    return {"X-Api-Key": key} if key else {}


def _get(path: str, params: dict) -> dict:
    for attempt in range(3):
        resp = requests.get(
            f"{API}/{path}", params=params, headers=_headers(), timeout=60
        )
        if resp.status_code == 429:  # 被限流就多等一下重試
            time.sleep(30 * (attempt + 1))
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError(f"pokemontcg.io {path} 連續被限流")


def _paged(path: str, params: dict):
    page = 1
    while True:
        data = _get(path, {**params, "page": page, "pageSize": PAGE_SIZE})
        yield from data["data"]
        if page * PAGE_SIZE >= data["totalCount"]:
            return
        page += 1
        time.sleep(SLEEP)


def _iso_date(value: str | None) -> str | None:
    return value.replace("/", "-") if value else None


def fetch_sets() -> list[dict]:
    """回傳 card_sets rows（code 用 pokemontcg.io 的 set id，如 sv4、me4）。"""
    rows = []
    for s in _paged("sets", {"select": "id,name,total,releaseDate"}):
        rows.append(
            {
                "game_id": "ptcg",
                "code": s["id"],
                "name": s["name"],
                "language": "en",
                "release_date": _iso_date(s.get("releaseDate")),
                "total_cards": s.get("total"),
            }
        )
    return rows


def fetch_cards(set_code: str) -> list[dict]:
    """回傳某個系列的 cards rows（不含 set_id，由呼叫端補）。"""
    rows = []
    for c in _paged(
        "cards",
        {"q": f"set.id:{set_code}", "select": "number,name,rarity,images"},
    ):
        rows.append(
            {
                "card_no": c["number"],
                "name": c["name"],
                "rarity": c.get("rarity"),
                "image_url": (c.get("images") or {}).get("small"),
            }
        )
    return rows


def sync(writer, limit_sets: int | None = None, log=print) -> None:
    sets = fetch_sets()
    if limit_sets:
        # 測試用：只同步最新幾個系列
        sets.sort(key=lambda s: s["release_date"] or "", reverse=True)
        sets = sets[:limit_sets]
    log(f"[ptcg-en] {len(sets)} 個系列")
    if writer:
        writer.upsert("card_sets", sets, on_conflict="game_id,code,language")
        id_map = writer.set_id_map("ptcg", "en")

    total = 0
    for s in sets:
        cards = fetch_cards(s["code"])
        total += len(cards)
        log(f"[ptcg-en] {s['code']} {s['name']}: {len(cards)} 張")
        if writer and cards:
            for c in cards:
                c["set_id"] = id_map[s["code"]]
            writer.upsert("cards", cards, on_conflict="set_id,card_no")
        time.sleep(SLEEP)
    log(f"[ptcg-en] 完成，共 {total} 張")
