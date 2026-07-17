"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CardThumb from "@/components/CardThumb";
import { createClient } from "@/lib/supabase/client";

export type SetListRow = {
  id: string;
  code: string;
  name: string;
  release_date: string | null;
  total_cards: number | null;
  owned: number;
};

type MatchedCard = {
  id: string;
  card_no: string;
  name: string;
  image_url: string | null;
};

const THUMBS_PER_SET = 6;

export default function SetList({
  sets,
  game,
  lang,
  initialQuery,
}: {
  sets: SetListRow[];
  game: string;
  lang: string;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"release" | "progress" | "code">(
    "release"
  );
  // set_id -> 該系列中名稱符合關鍵字的卡（含縮圖）
  const [matchesBySet, setMatchesBySet] = useState<Map<string, MatchedCard[]>>(
    new Map()
  );
  const [searchingCards, setSearchingCards] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyword = q.trim().toLowerCase();

  // 搜尋條件寫回網址：點進系列再返回時，伺服器會把 q 帶回來還原狀態
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q.trim()) {
      url.searchParams.set("q", q.trim());
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url.toString());
  }, [q]);

  // 除了系列名稱，也到卡牌目錄查「哪些系列含有名稱符合的卡」＋抓縮圖
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (keyword.length < 2) {
      setMatchesBySet(new Map());
      setSearchingCards(false);
      return;
    }
    setSearchingCards(true);
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      // 卡名或卡號任一符合都算（打卡名如「魯夫」、卡號如「OP01-025」「025」都能找）
      const { data } = await supabase
        .from("cards")
        .select(
          "id, set_id, card_no, name, image_url, card_sets!inner(game_id, language)"
        )
        .or(
          `name.ilike.%${keyword}%,card_no.ilike.%${keyword}%,name_zh.ilike.%${keyword}%`
        )
        .eq("card_sets.game_id", game)
        .eq("card_sets.language", lang)
        .limit(1000);
      const grouped = new Map<string, MatchedCard[]>();
      for (const row of data ?? []) {
        const setId = row.set_id as string;
        if (!grouped.has(setId)) grouped.set(setId, []);
        grouped.get(setId)!.push({
          id: row.id,
          card_no: row.card_no,
          name: row.name,
          image_url: row.image_url,
        });
      }
      setMatchesBySet(grouped);
      setSearchingCards(false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [keyword, game, lang]);

  // 出版年份選項（依現有系列的 release_date 動態產生，新到舊）
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const s of sets) {
      if (s.release_date) set.add(s.release_date.slice(0, 4));
    }
    return [...set].sort().reverse();
  }, [sets]);

  const toggleYear = (y: string) =>
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });

  const filtered = sets.filter((s) => {
    if (ownedOnly && s.owned === 0) return false;
    if (selectedYears.size > 0) {
      const y = s.release_date?.slice(0, 4);
      if (!y || !selectedYears.has(y)) return false;
    }
    if (!keyword) return true;
    return (
      s.name.toLowerCase().includes(keyword) ||
      s.code.toLowerCase().includes(keyword) ||
      matchesBySet.has(s.id)
    );
  });

  // 排序只改變顯示順序，不影響上面的篩選結果
  const sorted = useMemo(() => {
    const progressOf = (s: SetListRow) =>
      s.total_cards && s.total_cards > 0 ? s.owned / s.total_cards : 0;
    const copy = [...filtered];
    if (sortKey === "progress") {
      copy.sort((a, b) => progressOf(b) - progressOf(a));
    } else if (sortKey === "code") {
      copy.sort((a, b) => a.code.localeCompare(b.code));
    }
    // "release" 沿用伺服器端已排好的順序（release_date 新到舊）
    return copy;
  }, [filtered, sortKey]);

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
        {years.length > 1 && (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
              selectedYears.size > 0 ? "btn-accent" : "btn-ghost text-muted"
            }`}
          >
            年份{selectedYears.size > 0 ? ` ${selectedYears.size}` : ""}
          </button>
        )}
      </div>

      {showFilters && years.length > 1 && (
        <div className="glass flex flex-col gap-2 p-3">
          <span className="text-xs font-medium text-muted">出版年份</span>
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  selectedYears.has(y) ? "btn-accent" : "btn-ghost text-muted"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {selectedYears.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedYears(new Set())}
              className="self-start text-xs text-muted underline underline-offset-4"
            >
              清除年份
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted">排序</span>
        <select
          className="field w-auto py-1 text-xs"
          value={sortKey}
          onChange={(e) =>
            setSortKey(e.target.value as "release" | "progress" | "code")
          }
        >
          <option value="release">出版日期（新到舊）</option>
          <option value="progress">收藏進度（高到低）</option>
          <option value="code">系列代碼</option>
        </select>
      </div>

      {searchingCards && <p className="text-xs text-muted">搜尋卡片中…</p>}

      {!searchingCards && sorted.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          沒有符合的系列或卡片
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {sorted.map((s) => {
          const total = s.total_cards;
          const pct =
            total && total > 0 ? Math.min(100, (s.owned / total) * 100) : null;
          const matched = keyword.length >= 2 ? matchesBySet.get(s.id) : null;
          return (
            <Link
              key={s.id}
              prefetch={false}
              href={`/collection/${s.id}${
                matched ? `?q=${encodeURIComponent(q.trim())}` : ""
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
                {matched && (
                  <span className="shrink-0 text-accent">
                    {matched.length} 張符合
                  </span>
                )}
              </div>
              {pct !== null && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {matched && (
                <div className="mt-1 flex items-end gap-1.5 overflow-hidden">
                  {matched.slice(0, THUMBS_PER_SET).map((c) =>
                    c.image_url ? (
                      <CardThumb
                        key={c.id}
                        src={c.image_url}
                        alt={c.name}
                        title={`${c.card_no} ${c.name}`}
                        width={120}
                        className="h-16 w-auto shrink-0 rounded border border-border object-cover"
                      />
                    ) : (
                      <span
                        key={c.id}
                        className="flex h-16 w-11 shrink-0 items-center justify-center rounded border border-border bg-white/5 p-0.5 text-center text-[10px] leading-tight text-muted"
                      >
                        {c.card_no}
                      </span>
                    )
                  )}
                  {matched.length > THUMBS_PER_SET && (
                    <span className="shrink-0 pb-1 text-xs text-muted">
                      +{matched.length - THUMBS_PER_SET}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
