"use client";

import { useEffect, useRef, useState } from "react";
import CardThumb from "@/components/CardThumb";
import { createClient } from "@/lib/supabase/client";

export type CardHit = {
  id: string;
  name: string;
  card_no: string;
  image_url: string | null;
  set: { code: string; language: string; game_id: string };
};

const LANG_LABEL: Record<string, string> = {
  ja: "日", en: "英", "zh-TW": "繁中",
};

export default function CardSearchInput({
  value,
  cardId,
  placeholder,
  onChange,
}: {
  value: string;
  cardId: string | null;
  placeholder?: string;
  onChange: (name: string, cardId: string | null) => void;
}) {
  const [hits, setHits] = useState<CardHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 點外面關閉下拉
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const kw = q.trim();
      // 卡名、卡號、或繁中別名(OPCG 才有)任一符合
      const { data } = await supabase
        .from("cards")
        .select(
          "id, name, card_no, image_url, card_sets!inner(code, language, game_id)"
        )
        .or(`name.ilike.%${kw}%,card_no.ilike.%${kw}%,name_zh.ilike.%${kw}%`)
        .limit(12);
      setHits(
        (data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          card_no: c.card_no,
          image_url: c.image_url,
          set: Array.isArray(c.card_sets) ? c.card_sets[0] : c.card_sets,
        }))
      );
      setSearching(false);
      setOpen(true);
    }, 300);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        className="field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          // 手動改字就解除已選卡的關聯
          onChange(e.target.value, null);
          search(e.target.value);
        }}
        onFocus={() => hits.length > 0 && setOpen(true)}
      />
      {cardId && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-400">
          已選卡 ✓
        </span>
      )}

      {open && (hits.length > 0 || searching) && (
        <ul className="popover-panel absolute z-20 mt-1 max-h-72 w-full overflow-auto">
          {searching && <li className="px-3 py-2 text-xs text-muted">搜尋中…</li>}
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
                onClick={() => {
                  onChange(h.name, h.id);
                  setOpen(false);
                }}
              >
                {h.image_url ? (
                  <CardThumb
                    src={h.image_url}
                    alt=""
                    width={80}
                    className="h-12 w-9 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="h-12 w-9 shrink-0 rounded bg-white/5" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{h.name}</span>
                  <span className="block text-xs text-muted">
                    {h.set.code}・{h.card_no}・
                    {LANG_LABEL[h.set.language] ?? h.set.language}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
