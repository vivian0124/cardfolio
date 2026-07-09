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
    """pokemontcg.io 出名地不穩：逾時、5xx、429 都退避重試。"""
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            resp = requests.get(
                f"{API}/{path}", params=params, headers=_headers(), timeout=60
            )
        except requests.exceptions.RequestException as e:
            last_error = e
            time.sleep(10 * (attempt + 1))
            continue
        if resp.status_code == 429 or resp.status_code >= 500:
            last_error = RuntimeError(f"HTTP {resp.status_code}")
            time.sleep(20 * (attempt + 1))
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError(f"pokemontcg.io {path} 重試 5 次仍失敗：{last_error}")


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
    failed: list[str] = []
    for s in sets:
        # 單一系列失敗就跳過，不讓整批同步中斷（下週排程會再補到）
        try:
            cards = fetch_cards(s["code"])
        except Exception as e:
            failed.append(s["code"])
            log(f"[ptcg-en] {s['code']} 失敗，跳過：{e}")
            continue
        total += len(cards)
        log(f"[ptcg-en] {s['code']} {s['name']}: {len(cards)} 張")
        if writer and cards:
            for c in cards:
                c["set_id"] = id_map[s["code"]]
            writer.upsert("cards", cards, on_conflict="set_id,card_no")
        time.sleep(SLEEP)
    log(f"[ptcg-en] 完成，共 {total} 張" + (f"，{len(failed)} 個系列失敗：{failed}" if failed else ""))
