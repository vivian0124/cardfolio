"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SetListRow = {
  id: string;
  code: string;
  name: string;
  release_date: string | null;
  total_cards: number | null;
  owned: number;
};

export default function SetList({
  sets,
  game,
  lang,
}: {
  sets: SetListRow[];
  game: string;
  lang: string;
}) {
  const [q, setQ] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  // 關鍵字有比對到「系列裡的卡片名稱」時，該系列的 id 會出現在這裡
  const [cardMatchSetIds, setCardMatchSetIds] = useState<Set<string>>(
    new Set()
  );
  const [searchingCards, setSearchingCards] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyword = q.trim().toLowerCase();

  // 除了系列名稱，也到卡牌目錄查「哪些系列含有名稱符合的卡」
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (keyword.length < 2) {
      setCardMatchSetIds(new Set());
      setSearchingCards(false);
      return;
    }
    setSearchingCards(true);
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("cards")
        .select("set_id, card_sets!inner(game_id, language)")
        .ilike("name", `%${keyword}%`)
        .eq("card_sets.game_id", game)
        .eq("card_sets.language", lang)
        .limit(1000);
      setCardMatchSetIds(new Set((data ?? []).map((r) => r.set_id as string)));
      setSearchingCards(false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [keyword, game, lang]);

  const filtered = sets.filter((s) => {
    if (ownedOnly && s.owned === 0) return false;
    if (!keyword) return true;
    return (
      s.name.toLowerCase().includes(keyword) ||
      s.code.toLowerCase().includes(keyword) ||
      cardMatchSetIds.has(s.id)
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="field"
          placeholder="搜尋系列或卡片名稱（例：151、皮卡丘、魯夫）"
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

      {searchingCards && (
        <p className="text-xs text-muted">搜尋卡片中…</p>
      )}

      {!searchingCards && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          沒有符合的系列或卡片
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {filtered.map((s) => {
          const total = s.total_cards;
          const pct =
            total && total > 0 ? Math.min(100, (s.owned / total) * 100) : null;
          const viaCard =
            keyword.length >= 2 &&
            cardMatchSetIds.has(s.id) &&
            !s.name.toLowerCase().includes(keyword) &&
            !s.code.toLowerCase().includes(keyword);
          return (
            <Link
              key={s.id}
              href={`/collection/${s.id}${
                viaCard ? `?q=${encodeURIComponent(q.trim())}` : ""
              }`}
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
                {viaCard && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-accent">
                    含「{q.trim()}」的卡
                  </span>
                )}
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
