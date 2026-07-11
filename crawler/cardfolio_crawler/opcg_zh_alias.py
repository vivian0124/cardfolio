"""One Piece 繁中別名同步：爬官方繁中卡表，把繁中卡名依卡號貼到日/英卡的
name_zh 欄位（不另建繁中卡列，只當搜尋別名）。

繁中站與日/英站同一套系統，卡號格式一致（OP16-001、OP16-001_p1），
所以能用共用的 opcg 解析模組，再以 card_no 對應回既有卡片。
"""

from __future__ import annotations

import os
import time

import requests

from . import opcg

ZH_BASE = "https://asia-hk.onepiece-cardgame.com"


def build_alias_map(limit_sets: int | None = None, log=print) -> dict[str, str]:
    """回傳 card_no -> 繁中卡名。"""
    series = opcg.fetch_series(ZH_BASE)
    if limit_sets:
        series = series[:limit_sets]
    log(f"[opcg-zh-alias] 繁中站 {len(series)} 個系列")
    alias: dict[str, str] = {}
    for s in series:
        try:
            cards = opcg.fetch_cards(ZH_BASE, s["value"])
        except Exception as e:
            log(f"[opcg-zh-alias] {s['code']} 抓取失敗，跳過：{e}")
            continue
        for c in cards:
            # 同卡號若重複出現保留第一個非空名稱
            if c["card_no"] not in alias and c["name"]:
                alias[c["card_no"]] = c["name"]
        log(f"[opcg-zh-alias] {s['code']}: 累計 {len(alias)} 個卡號")
        time.sleep(opcg.SLEEP)
    return alias


def sync(writer, limit_sets: int | None = None, log=print) -> None:
    alias = build_alias_map(limit_sets=limit_sets, log=log)
    if not writer:
        log(f"[opcg-zh-alias] dry-run，共 {len(alias)} 個繁中別名，樣本：")
        for cn in list(alias)[:5]:
            log(f"    {cn} = {alias[cn]}")
        return

    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    updated = 0
    for card_no, name_zh in alias.items():
        # 依 card_no 更新（一次更新日+英兩張版本），只碰 OPCG 卡
        resp = requests.patch(
            f"{url}/rest/v1/cards",
            params={"card_no": f"eq.{card_no}"},
            headers=headers,
            json={"name_zh": name_zh},
            timeout=30,
        )
        if resp.status_code < 300:
            updated += 1
        else:
            log(f"[opcg-zh-alias] {card_no} 更新失敗 {resp.status_code}: {resp.text[:120]}")
        if updated % 200 == 0 and updated:
            log(f"[opcg-zh-alias] 已更新 {updated}/{len(alias)} 個卡號")
    log(f"[opcg-zh-alias] 完成，更新 {updated} 個卡號的繁中別名")
