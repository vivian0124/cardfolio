"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WishlistButton from "@/components/WishlistButton";

export type GridCard = {
  id: string;
  card_no: string;
  name: string;
  rarity: string | null;
  image_url: string | null;
  owned: boolean;
  wished: boolean;
};

export default function CardGrid({
  cards,
  initialQuery,
}: {
  cards: GridCard[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [ownedOnly, setOwnedOnly] = useState(false);

  // 搜尋條件寫回網址，返回這頁時可還原
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q.trim()) {
      url.searchParams.set("q", q.trim());
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url.toString());
  }, [q]);

  const keyword = q.trim().toLowerCase();
  const filtered = cards.filter((c) => {
    if (ownedOnly && !c.owned) return false;
    if (!keyword) return true;
    return (
      c.name.toLowerCase().includes(keyword) ||
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
      </div>

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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image_url}
                alt={c.name}
                loading="lazy"
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
