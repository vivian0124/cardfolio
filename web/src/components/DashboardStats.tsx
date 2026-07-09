"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const RATES_KEY = "cardfolio:display-currency";
// 台幣兌換率預設值，僅供起始參考，使用者可自行修改成當下實際匯率
const DEFAULT_RATES: Record<string, number> = { JPY: 0.21, USD: 31 };
const CURRENCIES = ["TWD", "JPY", "USD"] as const;
type Currency = (typeof CURRENCIES)[number];

export type RankRow = { id: string; name: string; pnl: number };

export default function DashboardStats({
  invested,
  recovered,
  realizedPnl,
  inventoryCost,
  roi,
  unrealizedPnl,
  topGainers,
  topLosers,
}: {
  invested: number;
  recovered: number;
  realizedPnl: number;
  inventoryCost: number;
  roi: number | null;
  unrealizedPnl: number | null;
  topGainers: RankRow[];
  topLosers: RankRow[];
}) {
  const [currency, setCurrency] = useState<Currency>("TWD");
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RATES_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.currency) setCurrency(d.currency);
        if (d.rates) setRates((r) => ({ ...r, ...d.rates }));
      }
    } catch {
      /* 忽略壞掉的 localStorage */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RATES_KEY, JSON.stringify({ currency, rates }));
  }, [currency, rates]);

  // rates[currency] 代表「1 單位該幣別 = 多少台幣」，換算時反向除回去
  const convert = (twd: number) =>
    currency === "TWD" ? twd : twd / rates[currency];

  const fmt = (twd: number) => {
    const v = convert(twd);
    const rounded = Math.round(v).toLocaleString("zh-TW");
    return currency === "TWD" ? `NT$ ${rounded}` : `${currency} ${rounded}`;
  };

  const pnlColor = (v: number) =>
    v > 0
      ? "text-green-600 dark:text-green-400"
      : v < 0
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-xs dark:border-gray-700"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              顯示：{c}
            </option>
          ))}
        </select>
        {currency !== "TWD" && (
          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            1 {currency} =
            <input
              type="number"
              step="0.0001"
              className="w-20 rounded border border-gray-300 bg-transparent px-1.5 py-1 dark:border-gray-700"
              value={rates[currency]}
              onChange={(e) =>
                setRates((r) => ({ ...r, [currency]: Number(e.target.value) }))
              }
            />
            TWD
          </label>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: "總投入", value: fmt(invested), color: "" },
          { label: "總回收", value: fmt(recovered), color: "" },
          {
            label: "已實現損益",
            value: fmt(realizedPnl),
            color: pnlColor(realizedPnl),
          },
          {
            label: "已實現 ROI",
            value: roi === null ? "—" : `${(roi * 100).toFixed(1)}%`,
            color: roi === null ? "" : pnlColor(roi),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 p-3 text-center dark:border-gray-700"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {stat.label}
            </div>
            <div className={`mt-1 text-base font-semibold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">在庫成本</span>
          <span className="font-semibold">{fmt(inventoryCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            未實現損益
            <span className="ml-1 text-gray-400 dark:text-gray-500">
              (手動市價)
            </span>
          </span>
          <span
            className={`font-semibold ${unrealizedPnl === null ? "" : pnlColor(unrealizedPnl)}`}
          >
            {unrealizedPnl === null ? "—" : fmt(unrealizedPnl)}
          </span>
        </div>
      </section>

      {(topGainers.length > 0 || topLosers.length > 0) && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              賺最多
            </div>
            <div className="flex flex-col gap-1.5">
              {topGainers.length === 0 && (
                <span className="text-xs text-gray-400">—</span>
              )}
              {topGainers.map((r) => (
                <Link
                  key={r.id}
                  href={`/items/${r.id}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-gray-600 dark:text-gray-300">
                    {r.name}
                  </span>
                  <span className="shrink-0 text-green-600 dark:text-green-400">
                    {fmt(r.pnl)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              賠最多
            </div>
            <div className="flex flex-col gap-1.5">
              {topLosers.length === 0 && (
                <span className="text-xs text-gray-400">—</span>
              )}
              {topLosers.map((r) => (
                <Link
                  key={r.id}
                  href={`/items/${r.id}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-gray-600 dark:text-gray-300">
                    {r.name}
                  </span>
                  <span className="shrink-0 text-red-600 dark:text-red-400">
                    {fmt(r.pnl)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
