import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { fmtTWD } from "@/lib/format";
import { computeStats, type LotNumbers } from "@/lib/stats";

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

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">CardFolio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          卡牌投資記帳・收藏圖鑑
        </p>
        <Link
          href="/login"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
        >
          登入開始使用
        </Link>
      </main>
    );
  }

  const { data: lotsData } = await supabase
    .from("purchase_lots")
    .select(
      "quantity, price, fees, exchange_rate, sales(quantity, price, fees, exchange_rate)"
    );
  const stats = computeStats((lotsData ?? []) as LotNumbers[]);
  const pnlColor =
    stats.realizedPnl > 0
      ? "text-green-600 dark:text-green-400"
      : stats.realizedPnl < 0
        ? "text-red-600 dark:text-red-400"
        : "";

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

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "總投入", value: fmtTWD(stats.invested), color: "" },
          { label: "總回收", value: fmtTWD(stats.recovered), color: "" },
          {
            label: "已實現損益",
            value: fmtTWD(stats.realizedPnl),
            color: pnlColor,
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

      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">在庫成本</span>
          <span className="font-semibold">{fmtTWD(stats.inventoryCost)}</span>
        </div>
      </section>

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
