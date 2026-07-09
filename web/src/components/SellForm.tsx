"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/app/actions";
import { CURRENCIES } from "@/lib/format";

export type SellableLot = {
  id: string;
  label: string; // 例：2026-07-01・露天・NT$ 1,200・剩 3
  remaining: number;
};

const inputCls = "field";
const labelCls = "field-label";

export default function SellForm({
  itemId,
  lots,
}: {
  itemId: string;
  lots: SellableLot[];
}) {
  const router = useRouter();
  const sellable = lots.filter((l) => l.remaining > 0);
  const [lotId, setLotId] = useState(sellable[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [fees, setFees] = useState(0);
  const [currency, setCurrencyState] = useState("TWD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [buyerNote, setBuyerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (sellable.length === 0) return null;

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    if (c === "TWD") setExchangeRate(1);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createSale(itemId, {
      lotId,
      quantity,
      price,
      fees,
      currency,
      exchangeRate,
      soldAt,
      buyerNote,
    });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.refresh();
    setSubmitting(false);
    setQuantity(1);
    setPrice(0);
    setFees(0);
    setBuyerNote("");
  };

  return (
    <div className="glass flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-accent">記一筆賣出</h2>

      <div>
        <label className={labelCls}>從哪個批次賣</label>
        <select
          className={inputCls}
          value={lotId}
          onChange={(e) => setLotId(e.target.value)}
        >
          {sellable.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>數量</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>總價（{currency}）</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>費用</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={fees}
            onChange={(e) => setFees(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>幣別</label>
          <select
            className={inputCls}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>匯率</label>
          <input
            type="number"
            step="0.0001"
            className={inputCls}
            disabled={currency === "TWD"}
            value={exchangeRate}
            onChange={(e) => setExchangeRate(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>賣出日期</label>
          <input
            type="date"
            className={inputCls}
            value={soldAt}
            onChange={(e) => setSoldAt(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>買家/訂單備註</label>
        <input
          type="text"
          className={inputCls}
          placeholder="賣給誰、哪筆訂單…"
          value={buyerNote}
          onChange={(e) => setBuyerNote(e.target.value)}
        />
      </div>

      {error && (
        <p className="glass rounded-md px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="btn-accent py-2.5 text-sm disabled:opacity-50"
      >
        {submitting ? "儲存中…" : "儲存賣出"}
      </button>
    </div>
  );
}
