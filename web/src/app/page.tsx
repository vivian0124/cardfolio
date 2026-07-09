import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import DashboardStats from "@/components/DashboardStats";
import { computeStats, realizedRoi, type LotNumbers } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">CardFolio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          尚未設定 Supabase 環境變數，請參考 docs/setup.md 完成設定
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lotsData } = await supabase
    .from("purchase_lots")
    .select(
      "quantity, price, fees, exchange_rate, sales(quantity, price, fees, exchange_rate)"
    );
  const stats = computeStats((lotsData ?? []) as LotNumbers[]);
  const roi = realizedRoi(stats);

  // 單卡損益排行：逐項目算已實現損益，篩出有實際交易的項目
  const { data: itemsData } = await supabase.from("inventory_items").select(
    "id, custom_name, purchase_lots(quantity, price, fees, exchange_rate, sales(quantity, price, fees, exchange_rate))"
  );
  type RankItem = {
    id: string;
    custom_name: string | null;
    purchase_lots: LotNumbers[];
  };
  const ranked = ((itemsData ?? []) as RankItem[])
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">CardFolio</h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-500 underline-offset-4 hover:underline dark:text-gray-400"
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
        topGainers={topGainers}
        topLosers={topLosers}
      />

      <Link
        href="/purchases/new"
        className="rounded-full bg-foreground py-3 text-center text-sm font-medium text-background"
      >
        ＋ 記一筆買入
      </Link>

      <BottomNav />
    </main>
  );
}
