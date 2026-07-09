"""Supabase 寫入層：用 service role key 走 PostgREST upsert（繞過 RLS）。"""

from __future__ import annotations

import os

import requests

BATCH_SIZE = 500


class SupabaseWriter:
    def __init__(self) -> None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit(
                "缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 環境變數"
                "（本機可放 crawler/.env）"
            )
        self.rest = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> int:
        """批次 upsert，回傳寫入筆數。"""
        written = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            resp = requests.post(
                f"{self.rest}/{table}",
                params={"on_conflict": on_conflict},
                headers={
                    **self.headers,
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                },
                json=batch,
                timeout=60,
            )
            if resp.status_code >= 300:
                raise RuntimeError(
                    f"upsert {table} 失敗 HTTP {resp.status_code}: {resp.text[:500]}"
                )
            written += len(batch)
        return written

    def set_id_map(self, game_id: str, language: str) -> dict[str, str]:
        """取 card_sets 的 code -> id 對照（寫 cards 時要換成 set_id）。"""
        resp = requests.get(
            f"{self.rest}/card_sets",
            params={
                "game_id": f"eq.{game_id}",
                "language": f"eq.{language}",
                "select": "id,code",
                "limit": "10000",
            },
            headers=self.headers,
            timeout=60,
        )
        resp.raise_for_status()
        return {row["code"]: row["id"] for row in resp.json()}
