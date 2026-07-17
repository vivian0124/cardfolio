"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TrendChart from "@/components/TrendChart";

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
  monthlySeries,
}: {
  invested: number;
  recovered: number;
  realizedPnl: number;
  inventoryCost: number;
  roi: number | null;
  unrealizedPnl: number | null;
  topGainers: RankRow[];
  topLosers: RankRow[];
  monthlySeries: { month: string; cumulative: number }[];
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
    v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <select
          className="field w-auto py-1 text-xs"
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
          <label className="flex items-center gap-1 text-xs text-muted">
            1 {currency} =
            <input
              type="number"
              step="0.0001"
              className="field w-20 py-1"
              value={rates[currency]}
              onChange={(e) =>
                setRates((r) => ({ ...r, [currency]: Number(e.target.value) }))
              }
            />
            TWD
          </label>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <div key={stat.label} className="glass p-3 text-center">
            <div className="text-xs text-muted">{stat.label}</div>
            <div className={`mono-num mt-1 text-base font-semibold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      {monthlySeries.length >= 2 && (
        <section className="glass flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">投入成長曲線</span>
            <span className="mono-num font-semibold">
              {fmt(monthlySeries[monthlySeries.length - 1].cumulative)}
            </span>
          </div>
          <TrendChart
            points={monthlySeries.map((p) => ({
              month: p.month,
              value: convert(p.cumulative),
            }))}
            format={(v) =>
              currency === "TWD"
                ? `NT$ ${Math.round(v).toLocaleString("zh-TW")}`
                : `${currency} ${Math.round(v).toLocaleString("zh-TW")}`
            }
          />
        </section>
      )}

      <section className="glass flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">在庫成本</span>
          <span className="mono-num font-semibold">{fmt(inventoryCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            未實現損益<span className="ml-1">(手動市價)</span>
          </span>
          <span
            className={`mono-num font-semibold ${unrealizedPnl === null ? "" : pnlColor(unrealizedPnl)}`}
          >
            {unrealizedPnl === null ? "—" : fmt(unrealizedPnl)}
          </span>
        </div>
      </section>

      {(topGainers.length > 0 || topLosers.length > 0) && (
        <section className="grid grid-cols-2 gap-3">
          <div className="glass p-3">
            <div className="mb-2 text-xs font-semibold text-muted">
              賺最多
            </div>
            <div className="flex flex-col gap-1.5">
              {topGainers.length === 0 && (
                <span className="text-xs text-muted">—</span>
              )}
              {topGainers.map((r) => (
                <Link
                  key={r.id}
                  href={`/items/${r.id}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate">{r.name}</span>
                  <span className="mono-num shrink-0 text-green-400">
                    {fmt(r.pnl)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="glass p-3">
            <div className="mb-2 text-xs font-semibold text-muted">
              賠最多
            </div>
            <div className="flex flex-col gap-1.5">
              {topLosers.length === 0 && (
                <span className="text-xs text-muted">—</span>
              )}
              {topLosers.map((r) => (
                <Link
                  key={r.id}
                  href={`/items/${r.id}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate">{r.name}</span>
                  <span className="mono-num shrink-0 text-red-400">
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
