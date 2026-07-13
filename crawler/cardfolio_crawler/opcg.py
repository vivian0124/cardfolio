"""One Piece 卡牌官方卡表爬蟲：英文站與日文站結構相同，共用一套解析。"""

from __future__ import annotations

import re
import time

import requests
from bs4 import BeautifulSoup

SITES = {
    "en": "https://en.onepiece-cardgame.com",
    "ja": "https://onepiece-cardgame.com",
}
HEADERS = {"User-Agent": "Mozilla/5.0 (cardfolio catalog sync)"}
SLEEP = 1.5
# 系列代碼在結尾括號裡：英文站 [OP-16]、日文站【OP-16】
CODE_RE = re.compile(r"[\[【]([^\[\]【】]+)[\]】]\s*$")


def _soup(url: str, params: dict | None = None) -> BeautifulSoup:
    resp = requests.get(url, params=params, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def fetch_series(base: str) -> list[dict]:
    """從系列下拉選單取得所有系列：value（查詢參數）、code（如 OP-16）、名稱。"""
    soup = _soup(f"{base}/cardlist/")
    series = []
    for opt in soup.select("select#series option"):
        value = (opt.get("value") or "").strip()
        if not value:
            continue
        text = opt.get_text(" ", strip=True)
        # 選單文字裡有跳脫過的 <br> 標籤，清掉
        text = re.sub(r"<br[^>]*>", " ", text)
        text = " ".join(text.split())
        m = CODE_RE.search(text)
        code = m.group(1) if m else value
        name = CODE_RE.sub("", text).strip(" -")
        series.append({"value": value, "code": code, "name": name})
    return series


def fetch_cards(base: str, series_value: str) -> list[dict]:
    """回傳某系列的 cards rows（不含 set_id，由呼叫端補）。"""
    soup = _soup(f"{base}/cardlist/", params={"series": series_value})
    rows = []
    for dl in soup.select("dl.modalCol"):
        card_no = (dl.get("id") or "").strip()
        name_el = dl.select_one(".cardName")
        # infoCol：卡號 | 稀有度 | 卡種(LEADER/CHARACTER/EVENT/STAGE/DON)
        info_spans = dl.select(".infoCol span")
        rarity = info_spans[1].get_text(strip=True) if len(info_spans) > 1 else None
        category = info_spans[2].get_text(strip=True) if len(info_spans) > 2 else None
        # 顏色：<div class="color"><h3>Color</h3>Red</div> → 去掉標題只留值
        color = None
        color_el = dl.select_one(".backCol .color")
        if color_el:
            h3 = color_el.select_one("h3")
            if h3:
                h3.extract()
            color = color_el.get_text(strip=True) or None
        img = dl.select_one(".frontCol img")
        image_url = None
        if img:
            src = (img.get("data-src") or img.get("src") or "").split("?")[0]
            if src and "dummy" not in src:
                image_url = base + "/" + src.lstrip("./")
        if not card_no or not name_el:
            continue
        rows.append(
            {
                "card_no": card_no,
                "name": name_el.get_text(strip=True),
                "rarity": rarity,
                "image_url": image_url,
                "color": color,
                "category": category,
            }
        )
    return rows


def sync(writer, language: str, limit_sets: int | None = None, log=print) -> None:
    base = SITES[language]
    tag = f"[opcg-{language}]"
    series = fetch_series(base)
    if limit_sets:
        series = series[:limit_sets]  # 下拉選單本來就是新到舊
    log(f"{tag} {len(series)} 個系列")

    total = 0
    failed: list[str] = []
    for s in series:
        try:
            cards = fetch_cards(base, s["value"])
            # 防重複卡號（同一批 upsert 不能撞同一列），保留第一筆
            cards = list({c["card_no"]: c for c in reversed(cards)}.values())
            if writer and cards:
                set_rows = [
                    {
                        "game_id": "opcg",
                        "code": s["code"],
                        "name": s["name"],
                        "language": language,
                        "total_cards": len(cards),
                    }
                ]
                writer.upsert(
                    "card_sets", set_rows, on_conflict="game_id,code,language"
                )
                id_map = writer.set_id_map("opcg", language)
                for c in cards:
                    c["set_id"] = id_map[s["code"]]
                    c["external_id"] = f"opcg-{language}-{s['code']}-{c['card_no']}"
                writer.upsert("cards", cards, on_conflict="external_id")
        except Exception as e:
            failed.append(s["code"])
            log(f"{tag} {s['code']} 失敗，跳過：{e}")
            continue
        total += len(cards)
        log(f"{tag} {s['code']} {s['name']}: {len(cards)} 張")
        time.sleep(SLEEP)
    log(f"{tag} 完成，共 {total} 張" + (f"，失敗：{failed}" if failed else ""))
