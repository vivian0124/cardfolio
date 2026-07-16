"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPurchases,
  type PurchaseRow,
  type PurchaseShared,
} from "@/app/actions";
import { CURRENCIES, CONDITIONS } from "@/lib/format";
import CardSearchInput from "@/components/CardSearchInput";

const DEFAULTS_KEY = "cardfolio:purchase-defaults";

const emptyRow = (): PurchaseRow => ({
  name: "",
  cardId: null,
  itemType: "card",
  quantity: 1,
  price: 0,
  fees: 0,
  condition: "",
  grading: "",
  note: "",
});

const inputCls = "field";
const labelCls = "field-label";

export default function PurchaseForm({
  initialCard,
}: {
  initialCard?: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [shared, setShared] = useState<PurchaseShared>({
    purchasedAt: new Date().toISOString().slice(0, 10),
    channel: "",
    currency: "TWD",
    exchangeRate: 1,
  });
  const [rows, setRows] = useState<PurchaseRow[]>([
    initialCard
      ? { ...emptyRow(), name: initialCard.name, cardId: initialCard.id }
      : emptyRow(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 帶入上次的通路/幣別/匯率（輸入求快）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEFAULTS_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setShared((s) => ({
          ...s,
          channel: d.channel ?? "",
          currency: d.currency ?? "TWD",
          exchangeRate: d.exchangeRate ?? 1,
        }));
      }
    } catch {
      /* 忽略壞掉的 localStorage */
    }
  }, []);

  const setRow = (i: number, patch: Partial<PurchaseRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const setCurrency = (currency: string) =>
    setShared((s) => ({
      ...s,
      currency,
      exchangeRate: currency === "TWD" ? 1 : s.exchangeRate,
    }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createPurchases(shared, rows);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    localStorage.setItem(
      DEFAULTS_KEY,
      JSON.stringify({
        channel: shared.channel,
        currency: shared.currency,
        exchangeRate: shared.exchangeRate,
      })
    );
    router.push("/items");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 整單共用欄位 */}
      <section className="grid grid-cols-1 gap-3 glass p-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>買入日期</label>
          <input
            type="date"
            className={inputCls}
            value={shared.purchasedAt}
            onChange={(e) =>
              setShared((s) => ({ ...s, purchasedAt: e.target.value }))
            }
          />
        </div>
        <div>
          <label className={labelCls}>通路/店家</label>
          <input
            type="text"
            className={inputCls}
            placeholder="露天、卡店…"
            value={shared.channel}
            onChange={(e) =>
              setShared((s) => ({ ...s, channel: e.target.value }))
            }
          />
        </div>
        <div>
          <label className={labelCls}>幣別</label>
          <select
            className={inputCls}
            value={shared.currency}
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
          <label className={labelCls}>匯率（對台幣）</label>
          <input
            type="number"
            step="0.0001"
            className={inputCls}
            disabled={shared.currency === "TWD"}
            value={shared.exchangeRate}
            onChange={(e) =>
              setShared((s) => ({
                ...s,
                exchangeRate: Number(e.target.value),
              }))
            }
          />
        </div>
      </section>

      {/* 批次項目 */}
      {rows.map((row, i) => (
        <section
          key={i}
          className="flex flex-col gap-3 glass p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              項目 {i + 1}
            </span>
            {rows.length > 1 && (
              <button
                type="button"
                className="text-xs text-red-400"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              >
                移除
              </button>
            )}
          </div>

          <div>
            <label className={labelCls}>名稱</label>
            {row.itemType === "card" ? (
              <CardSearchInput
                value={row.name}
                cardId={row.cardId}
                placeholder="打卡名搜尋目錄，或直接自由輸入"
                onChange={(name, cardId) => setRow(i, { name, cardId })}
              />
            ) : (
              <input
                type="text"
                className={inputCls}
                placeholder="商品名（例：151 禮盒、OP-16 一箱）"
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>類型</label>
              <select
                className={inputCls}
                value={row.itemType}
                onChange={(e) =>
                  setRow(i, { itemType: e.target.value as "card" | "sealed" })
                }
              >
                <option value="card">單卡</option>
                <option value="sealed">密封品</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>數量</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={row.quantity}
                onChange={(e) =>
                  setRow(i, { quantity: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={labelCls}>總價（{shared.currency}）</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={row.price}
                onChange={(e) => setRow(i, { price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>運費/手續費</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={row.fees}
                onChange={(e) => setRow(i, { fees: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>品相</label>
              <select
                className={inputCls}
                value={row.condition}
                onChange={(e) => setRow(i, { condition: e.target.value })}
              >
                <option value="">—</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>鑑定</label>
              <input
                type="text"
                className={inputCls}
                placeholder="PSA 10"
                value={row.grading}
                onChange={(e) => setRow(i, { grading: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>備註</label>
            <input
              type="text"
              className={inputCls}
              value={row.note}
              onChange={(e) => setRow(i, { note: e.target.value })}
            />
          </div>
        </section>
      ))}

      <button
        type="button"
        className="rounded-xl border border-dashed border-border py-3 text-sm text-muted glass-hover"
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
      >
        ＋ 再加一筆（同一張訂單）
      </button>

      {error && (
        <p className="glass rounded-md px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="btn-accent py-3 text-sm disabled:opacity-50"
      >
        {submitting ? "儲存中…" : `儲存 ${rows.length} 筆買入`}
      </button>
    </div>
  );
}
