import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import SellForm, { type SellableLot } from "@/components/SellForm";
import DeleteButton from "@/components/DeleteButton";
import MarketPriceForm from "@/components/MarketPriceForm";
import { deleteItem, deleteSale } from "@/app/actions";
import { fmtMoney, fmtTWD } from "@/lib/format";
import { yuyuTeiSearchUrl } from "@/lib/priceLinks";
import {
  lotCostTWD,
  lotRemaining,
  saleNetTWD,
  unrealizedPnl,
  type SaleNumbers,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

type SaleRow = SaleNumbers & {
  id: string;
  currency: string;
  sold_at: string;
  buyer_note: string | null;
};

type LotRow = {
  id: string;
  quantity: number;
  price: string | number;
  currency: string;
  exchange_rate: string | number;
  fees: string | number;
  channel: string | null;
  purchased_at: string;
  note: string | null;
  sales: SaleRow[];
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("inventory_items")
    .select(
      "id, item_type, custom_name, condition, grading, status, note, market_price_twd, market_price_updated_at, cards(name, card_sets(game_id)), purchase_lots(id, quantity, price, currency, exchange_rate, fees, channel, purchased_at, note, sales(id, quantity, price, currency, exchange_rate, fees, buyer_note, sold_at))"
    )
    .eq("id", id)
    .single();

  if (!item) notFound();

  const linkedCard = Array.isArray(item.cards) ? item.cards[0] : item.cards;
  const linkedSet = linkedCard
    ? Array.isArray(linkedCard.card_sets)
      ? linkedCard.card_sets[0]
      : linkedCard.card_sets
    : null;
  const priceSearchUrl =
    linkedCard && linkedSet
      ? yuyuTeiSearchUrl(linkedSet.game_id, linkedCard.name)
      : null;

  const marketPrice =
    item.market_price_twd === null ? null : Number(item.market_price_twd);
  const lots = (item.purchase_lots ?? []) as LotRow[];
  const totalCost = lots.reduce((s, l) => s + lotCostTWD(l), 0);
  const totalRecovered = lots.reduce(
    (s, l) => s + (l.sales ?? []).reduce((x, sale) => x + saleNetTWD(sale), 0),
    0
  );

  const sellableLots: SellableLot[] = lots.map((l) => ({
    id: l.id,
    remaining: lotRemaining(l),
    label: `${l.purchased_at}${l.channel ? `・${l.channel}` : ""}・${fmtMoney(
      Number(l.price),
      l.currency
    )}・剩 ${lotRemaining(l)}`,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 px-4 pb-24 pt-8">
      <div>
        <Link
          href="/items"
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          ← 庫存
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold">{item.custom_name}</h1>
          <DeleteButton
            label="刪除項目"
            confirmText="確定要刪除這個項目？所有買入/賣出紀錄會一併刪除。"
            redirectTo="/items"
            action={deleteItem.bind(null, item.id)}
          />
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{item.item_type === "card" ? "單卡" : "密封品"}</span>
          {item.condition && <span>・{item.condition}</span>}
          {item.grading && <span>・{item.grading}</span>}
          {item.status === "sold" && <span>・已售出</span>}
        </div>
        {item.note && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {item.note}
          </p>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 p-4 text-center dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            總成本
          </div>
          <div className="mt-1 text-lg font-semibold">{fmtTWD(totalCost)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            已回收
          </div>
          <div className="mt-1 text-lg font-semibold">
            {fmtTWD(totalRecovered)}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">買入批次</h2>
        {lots.map((lot) => (
          <div
            key={lot.id}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <span>
                {lot.purchased_at}
                {lot.channel && (
                  <span className="text-gray-500 dark:text-gray-400">
                    ・{lot.channel}
                  </span>
                )}
              </span>
              <span className="font-semibold">
                {fmtMoney(Number(lot.price), lot.currency)}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              數量 {lot.quantity}・剩 {lotRemaining(lot)}
              {Number(lot.fees) > 0 &&
                `・費用 ${fmtMoney(Number(lot.fees), lot.currency)}`}
              {lot.currency !== "TWD" && `・匯率 ${Number(lot.exchange_rate)}`}
              ・成本 {fmtTWD(lotCostTWD(lot))}
            </div>

            {(lot.sales ?? []).length > 0 && (
              <div className="mt-1 flex flex-col gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800">
                {lot.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {sale.sold_at} 賣出 {sale.quantity} 個
                      {sale.buyer_note && `・${sale.buyer_note}`}
                    </span>
                    <span className="flex items-center gap-2">
                      <span>{fmtTWD(saleNetTWD(sale))}</span>
                      <DeleteButton
                        label="刪除"
                        confirmText="確定刪除這筆賣出紀錄？"
                        action={deleteSale.bind(null, sale.id, item.id)}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <MarketPriceForm
        itemId={item.id}
        initialPrice={marketPrice}
        updatedAt={item.market_price_updated_at}
        unrealizedPnl={unrealizedPnl(lots, marketPrice)}
        priceSearchUrl={priceSearchUrl}
      />

      <SellForm itemId={item.id} lots={sellableLots} />

      <BottomNav />
    </main>
  );
}
