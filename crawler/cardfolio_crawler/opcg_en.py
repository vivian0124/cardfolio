"""One Piece 卡牌英文卡表：爬官方 en.onepiece-cardgame.com 的 cardlist。"""

from __future__ import annotations

import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://en.onepiece-cardgame.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (cardfolio catalog sync)"}
SLEEP = 1.5


def _soup(url: str, params: dict | None = None) -> BeautifulSoup:
    resp = requests.get(url, params=params, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def fetch_series() -> list[dict]:
    """從系列下拉選單取得所有系列：value（查詢參數）、code（如 OP-16）、名稱。"""
    soup = _soup(f"{BASE}/cardlist/")
    series = []
    for opt in soup.select("select#series option"):
        value = (opt.get("value") or "").strip()
        if not value:
            continue
        text = opt.get_text(" ", strip=True)
        # 選單文字裡有跳脫過的 <br> 標籤，清掉
        text = re.sub(r"<br[^>]*>", " ", text)
        text = " ".join(text.split())
        # 系列代碼在結尾的中括號裡，例：[OP-16]、[PRB-01]、[OP15-EB04]
        m = re.search(r"\[([^\[\]]+)\]\s*$", text)
        code = m.group(1) if m else value
        name = re.sub(r"\s*\[[^\[\]]+\]\s*$", "", text).strip(" -")
        series.append({"value": value, "code": code, "name": name})
    return series


def fetch_cards(series_value: str) -> list[dict]:
    """回傳某系列的 cards rows（不含 set_id，由呼叫端補）。"""
    soup = _soup(f"{BASE}/cardlist/", params={"series": series_value})
    rows = []
    for dl in soup.select("dl.modalCol"):
        card_no = (dl.get("id") or "").strip()
        name_el = dl.select_one(".cardName")
        info_spans = dl.select(".infoCol span")
        rarity = info_spans[1].get_text(strip=True) if len(info_spans) > 1 else None
        img = dl.select_one(".frontCol img")
        image_url = None
        if img:
            src = (img.get("data-src") or img.get("src") or "").split("?")[0]
            if src and "dummy" not in src:
                image_url = BASE + "/" + src.lstrip("./")
        if not card_no or not name_el:
            continue
        rows.append(
            {
                "card_no": card_no,
                "name": name_el.get_text(strip=True),
                "rarity": rarity,
                "image_url": image_url,
            }
        )
    return rows


def sync(writer, limit_sets: int | None = None, log=print) -> None:
    series = fetch_series()
    if limit_sets:
        series = series[:limit_sets]  # 下拉選單本來就是新到舊
    log(f"[opcg-en] {len(series)} 個系列")

    total = 0
    for s in series:
        cards = fetch_cards(s["value"])
        total += len(cards)
        log(f"[opcg-en] {s['code']} {s['name']}: {len(cards)} 張")
        if writer and cards:
            set_rows = [
                {
                    "game_id": "opcg",
                    "code": s["code"],
                    "name": s["name"],
                    "language": "en",
                    "total_cards": len(cards),
                }
            ]
            writer.upsert("card_sets", set_rows, on_conflict="game_id,code,language")
            id_map = writer.set_id_map("opcg", "en")
            for c in cards:
                c["set_id"] = id_map[s["code"]]
            writer.upsert("cards", cards, on_conflict="set_id,card_no")
        time.sleep(SLEEP)
    log(f"[opcg-en] 完成，共 {total} 張")
