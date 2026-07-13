"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CardThumb from "@/components/CardThumb";
import WishlistButton from "@/components/WishlistButton";

export type GridCard = {
  id: string;
  card_no: string;
  name: string;
  name_zh: string | null;
  rarity: string | null;
  image_url: string | null;
  supertype: string | null;
  types: string[] | null;
  color: string | null;
  category: string | null;
  owned: boolean;
  wished: boolean;
};

type FacetKey = "rarity" | "types" | "supertype" | "color" | "category";

const FACET_LABELS: Record<FacetKey, string> = {
  rarity: "稀有度",
  types: "屬性",
  supertype: "卡種",
  color: "顏色",
  category: "卡種",
};

// 依當前系列實際有值的群組才會出現
const FACET_ORDER: FacetKey[] = [
  "rarity",
  "types",
  "supertype",
  "color",
  "category",
];

function valuesOf(cards: GridCard[], key: FacetKey): string[] {
  const set = new Set<string>();
  for (const c of cards) {
    if (key === "types") {
      (c.types ?? []).forEach((t) => t && set.add(t));
    } else {
      const v = c[key];
      if (typeof v === "string" && v) set.add(v);
    }
  }
  return [...set].sort();
}

export default function CardGrid({
  cards,
  initialQuery,
}: {
  cards: GridCard[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Record<FacetKey, Set<string>>>({
    rarity: new Set(),
    types: new Set(),
    supertype: new Set(),
    color: new Set(),
    category: new Set(),
  });

  // 搜尋條件寫回網址，返回這頁時可還原
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [q]);

  // 依當前系列的卡片動態算出可用的篩選群組
  const facets = useMemo(
    () =>
      FACET_ORDER.map((key) => ({ key, values: valuesOf(cards, key) })).filter(
        (f) => f.values.length > 0
      ),
    [cards]
  );

  const toggle = (key: FacetKey, value: string) =>
    setSelected((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });

  const activeCount = Object.values(selected).reduce(
    (sum, s) => sum + s.size,
    0
  );
  const clearAll = () =>
    setSelected({
      rarity: new Set(),
      types: new Set(),
      supertype: new Set(),
      color: new Set(),
      category: new Set(),
    });

  const keyword = q.trim().toLowerCase();
  const filtered = cards.filter((c) => {
    if (ownedOnly && !c.owned) return false;
    // 每個有選值的 facet 都要命中（群組間 AND、群組內 OR）
    for (const key of FACET_ORDER) {
      const sel = selected[key];
      if (sel.size === 0) continue;
      if (key === "types") {
        if (!(c.types ?? []).some((t) => sel.has(t))) return false;
      } else {
        const v = c[key];
        if (typeof v !== "string" || !sel.has(v)) return false;
      }
    }
    if (!keyword) return true;
    return (
      c.name.toLowerCase().includes(keyword) ||
      (c.name_zh ?? "").toLowerCase().includes(keyword) ||
      c.card_no.toLowerCase().includes(keyword) ||
      (c.rarity ?? "").toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="field"
          placeholder="搜尋卡名、編號或稀有度（例：皮卡丘、025、SAR）"
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
          只看持有
        </button>
        {facets.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
              activeCount > 0 ? "btn-accent" : "btn-ghost text-muted"
            }`}
          >
            篩選{activeCount > 0 ? ` ${activeCount}` : ""}
          </button>
        )}
      </div>

      {showFilters && facets.length > 0 && (
        <div className="glass flex flex-col gap-3 p-3">
          {facets.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">
                {FACET_LABELS[f.key]}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {f.values.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggle(f.key, v)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      selected[f.key].has(v)
                        ? "btn-accent"
                        : "btn-ghost text-muted"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="self-start text-xs text-muted underline underline-offset-4"
            >
              清除全部篩選
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        {filtered.length} / {cards.length} 張
      </p>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">沒有符合的卡片</p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`glass flex flex-col gap-1 p-1.5 ${
              c.owned ? "glass-owned" : ""
            }`}
          >
            {c.image_url ? (
              <CardThumb
                src={c.image_url}
                alt={c.name}
                width={400}
                className="aspect-[5/7] w-full rounded object-cover"
              />
            ) : (
              <div className="flex aspect-[5/7] w-full items-center justify-center rounded bg-white/5 p-1 text-center text-xs text-muted">
                {c.name}
              </div>
            )}
            <div className="flex items-center justify-between px-0.5 text-xs text-muted">
              <span className="truncate">
                {c.card_no}
                {c.rarity && `・${c.rarity}`}
              </span>
              {c.owned && <span className="text-accent">✓</span>}
            </div>
            <div className="flex items-center justify-between px-0.5">
              <WishlistButton cardId={c.id} initialIn={c.wished} />
              <Link
                href={`/purchases/new?card=${c.id}`}
                className="btn-ghost px-2 py-0.5 text-xs text-muted"
              >
                ＋買入
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
