import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import DashboardStats from "@/components/DashboardStats";
import Logo from "@/components/Logo";
import {
  computeStats,
  monthlyInvestedSeries,
  realizedRoi,
  unrealizedPnl,
  type LotNumbers,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-accent">
          CardFolio
        </h1>
        <p className="text-sm text-muted">
          尚未設定 Supabase 環境變數，請參考 docs/setup.md 完成設定
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  // 身分驗證與資料查詢平行跑（RLS 用 cookie 裡的 JWT，不需等 getUser 回來）；
  // 一次撈 items+lots+sales，整體統計由同一份資料 flatten 計算，省掉重複查詢
  const [
    {
      data: { user },
    },
    { data: itemsData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("inventory_items")
      .select(
        "id, custom_name, market_price_twd, purchase_lots(quantity, price, fees, exchange_rate, purchased_at, sales(quantity, price, fees, exchange_rate))"
      ),
  ]);

  if (!user) redirect("/login");

  type RankItem = {
    id: string;
    custom_name: string | null;
    market_price_twd: string | number | null;
    purchase_lots: (LotNumbers & { purchased_at: string })[];
  };
  const items = (itemsData ?? []) as RankItem[];

  const allLots = items.flatMap((i) => i.purchase_lots);
  const stats = computeStats(allLots);
  const roi = realizedRoi(stats);
  const monthlySeries = monthlyInvestedSeries(allLots);

  const ranked = items
    .map((item) => ({
      id: item.id,
      name: item.custom_name ?? "未命名",
      pnl: computeStats(item.purchase_lots).realizedPnl,
    }))
    .filter((r) => r.pnl !== 0);
  const topGainers = [...ranked]
    .filter((r) => r.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);
  const topLosers = [...ranked]
    .filter((r) => r.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 5);

  const unrealizedTotals = items
    .map((item) =>
      unrealizedPnl(
        item.purchase_lots,
        item.market_price_twd === null ? null : Number(item.market_price_twd)
      )
    )
    .filter((v): v is number => v !== null);
  const totalUnrealizedPnl =
    unrealizedTotals.length > 0
      ? unrealizedTotals.reduce((s, v) => s + v, 0)
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 pb-24 pt-8 md:max-w-4xl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <h1 className="text-2xl font-bold tracking-tight text-accent">
            CardFolio
          </h1>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-muted underline-offset-4 hover:underline"
          >
            登出
          </button>
        </form>
      </header>

      <DashboardStats
        invested={stats.invested}
        recovered={stats.recovered}
        realizedPnl={stats.realizedPnl}
        inventoryCost={stats.inventoryCost}
        roi={roi}
        unrealizedPnl={totalUnrealizedPnl}
        topGainers={topGainers}
        topLosers={topLosers}
        monthlySeries={monthlySeries}
      />

      <Link
        href="/purchases/new"
        className="btn-accent py-3 text-center text-sm"
      >
        ＋ 記一筆買入
      </Link>

      <BottomNav />
    </main>
  );
}
