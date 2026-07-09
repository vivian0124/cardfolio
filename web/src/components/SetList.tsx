"use client";

import Link from "next/link";
import { useState } from "react";

export type SetListRow = {
  id: string;
  code: string;
  name: string;
  release_date: string | null;
  total_cards: number | null;
  owned: number;
};

export default function SetList({ sets }: { sets: SetListRow[] }) {
  const [q, setQ] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const keyword = q.trim().toLowerCase();
  const filtered = sets.filter((s) => {
    if (ownedOnly && s.owned === 0) return false;
    if (!keyword) return true;
    return (
      s.name.toLowerCase().includes(keyword) ||
      s.code.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="field"
          placeholder="搜尋系列名稱或代碼（例：151、噴火龍、OP-05）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setOwnedOnly(!ownedOnly)}
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
            ownedOnly ? "btn-accent" : "btn-ghost text-muted"
          }`}
        >
          只看有收藏
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">沒有符合的系列</p>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {filtered.map((s) => {
          const total = s.total_cards;
          const pct =
            total && total > 0 ? Math.min(100, (s.owned / total) * 100) : null;
          return (
            <Link
              key={s.id}
              href={`/collection/${s.id}`}
              className="glass glass-hover flex flex-col gap-1.5 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {s.name}
                </span>
                <span className="mono-num shrink-0 text-xs text-muted">
                  {total
                    ? `${s.owned} / ${total}`
                    : s.owned > 0
                      ? `持有 ${s.owned}`
                      : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>
                  {s.code}
                  {s.release_date && `・${s.release_date}`}
                </span>
              </div>
              {pct !== null && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
