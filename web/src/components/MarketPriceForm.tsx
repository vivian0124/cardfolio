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
        ? "text-green-600 dark:text-green-400"
        : unrealizedPnl < 0
          ? "text-red-600 dark:text-red-400"
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
    <section className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">目前市價（手動填寫）</h2>
        {priceSearchUrl && (
          <a
            href={priceSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 underline underline-offset-4 dark:text-gray-400"
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
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "儲存中…" : "更新"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {updatedAt && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          更新於 {new Date(updatedAt).toLocaleDateString("zh-TW")}
        </p>
      )}
      {unrealizedPnl !== null && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">未實現損益</span>
          <span className={`font-semibold ${pnlColor}`}>
            {fmtTWD(unrealizedPnl)}
          </span>
        </div>
      )}
    </section>
  );
}
