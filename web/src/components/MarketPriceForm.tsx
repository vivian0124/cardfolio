"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMarketPrice } from "@/app/actions";
import { fmtTWD } from "@/lib/format";

export default function MarketPriceForm({
  itemId,
  initialPrice,
  updatedAt,
  unrealizedPnl,
  priceSearchUrl,
}: {
  itemId: string;
  initialPrice: number | null;
  updatedAt: string | null;
  unrealizedPnl: number | null;
  priceSearchUrl?: string | null;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pnlColor =
    unrealizedPnl === null
      ? ""
      : unrealizedPnl > 0
        ? "text-green-400"
        : unrealizedPnl < 0
          ? "text-red-400"
          : "";

  const save = async () => {
    setSaving(true);
    setError(null);
    const value = price.trim() === "" ? null : Number(price);
    const result = await updateMarketPrice(itemId, value);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <section className="glass flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-accent">目前市價（手動填寫）</h2>
        {priceSearchUrl && (
          <a
            href={priceSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted underline underline-offset-4"
          >
            去 Yuyu-tei 查價 ↗
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="1"
          placeholder="NT$"
          className="field"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="btn-accent shrink-0 px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "儲存中…" : "更新"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {updatedAt && (
        <p className="text-xs text-muted">
          更新於 {new Date(updatedAt).toLocaleDateString("zh-TW")}
        </p>
      )}
      {unrealizedPnl !== null && (
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
          <span className="text-muted">未實現損益</span>
          <span className={`mono-num font-semibold ${pnlColor}`}>
            {fmtTWD(unrealizedPnl)}
          </span>
        </div>
      )}
    </section>
  );
}
