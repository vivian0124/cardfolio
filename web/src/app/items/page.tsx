import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import CardThumb from "@/components/CardThumb";
import { fmtTWD } from "@/lib/format";
import { lotCostTWD, lotRemaining, type LotNumbers } from "@/lib/stats";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: string;
  item_type: string;
  custom_name: string | null;
  condition: string | null;
  grading: string | null;
  status: string;
  cards: { image_url: string | null } | { image_url: string | null }[] | null;
  purchase_lots: LotNumbers[];
};

export default async function ItemsPage() {
  const supabase = await createClient();

  // 身分驗證與查詢平行跑，省一趟資料庫往返
  const [
    {
      data: { user },
    },
    { data },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("inventory_items")
      .select(
        "id, item_type, custom_name, condition, grading, status, cards(image_url), purchase_lots(quantity, price, fees, exchange_rate, sales(quantity, price, fees, exchange_rate))"
      )
      .order("created_at", { ascending: false }),
  ]);
  if (!user) redirect("/login");

  const items = (data ?? []) as ItemRow[];
  const holding = items.filter((i) => i.status === "holding");
  const sold = items.filter((i) => i.status === "sold");

  const renderItem = (item: ItemRow) => {
    const remaining = item.purchase_lots.reduce(
      (sum, l) => sum + lotRemaining(l),
      0
    );
    const cost = item.purchase_lots.reduce((sum, l) => sum + lotCostTWD(l), 0);
    const card = Array.isArray(item.cards) ? item.cards[0] : item.cards;
    return (
      <Link
        key={item.id}
        prefetch={false}
        href={`/items/${item.id}`}
        className="glass glass-hover flex items-center justify-between gap-3 p-3"
      >
        {card?.image_url ? (
          <CardThumb
            src={card.image_url}
            alt=""
            width={80}
            className="h-14 w-10 shrink-0 rounded object-cover"
          />
        ) : (
          <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-white/5 text-base">
            {item.item_type === "sealed" ? "📦" : "🃏"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {item.custom_name}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
            <span>{item.item_type === "card" ? "單卡" : "密封品"}</span>
            {item.condition && <span>・{item.condition}</span>}
            {item.grading && <span>・{item.grading}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="mono-num text-sm font-semibold">{fmtTWD(cost)}</div>
          <div className="text-xs text-muted">
            {item.status === "sold" ? "已售出" : `持有 ${remaining}`}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent">庫存</h1>
        <a
          href="/api/export"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          匯出 CSV
        </a>
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">
          還沒有任何紀錄，先去
          <Link href="/purchases/new" className="text-accent underline underline-offset-4">
            記一筆買入
          </Link>
        </p>
      )}

      {holding.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-muted">
            持有中（{holding.length}）
          </h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {holding.map(renderItem)}
          </div>
        </section>
      )}

      {sold.length > 0 && (
        <section className="mt-2 flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-muted">
            已售出（{sold.length}）
          </h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {sold.map(renderItem)}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
