import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSetWithCards } from "@/lib/catalog";
import BottomNav from "@/components/BottomNav";
import CardGrid, { type GridCard } from "@/components/CardGrid";

export const dynamic = "force-dynamic";

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { setId } = await params;
  const { q } = await searchParams;

  // 三路平行：身分驗證、卡表（跨使用者快取，含系列+全部卡片）、使用者持有/願望
  const [
    {
      data: { user },
    },
    { set, cards },
    { data: ownedData },
    { data: wishData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getSetWithCards(setId),
    supabase
      .from("inventory_items")
      .select("card_id, cards!inner(set_id)")
      .not("card_id", "is", null)
      .eq("status", "holding")
      .eq("cards.set_id", setId),
    supabase.from("wishlist").select("card_id"),
  ]);
  if (!user) redirect("/login");
  if (!set) notFound();

  const owned = new Set((ownedData ?? []).map((r) => r.card_id as string));
  const wished = new Set((wishData ?? []).map((r) => r.card_id as string));

  const gridCards: GridCard[] = cards.map((c) => ({
    ...c,
    owned: owned.has(c.id),
    wished: wished.has(c.id),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-5xl">
      <div>
        <Link
          href={`/collection?game=${set.game_id}&lang=${set.language}`}
          className="text-xs text-muted"
        >
          ← 圖鑑
        </Link>
        <h1 className="mt-1 text-lg font-bold">{set.name}</h1>
        <p className="mono-num text-xs text-muted">
          {set.code}・已收集 {owned.size} / {cards.length}
        </p>
      </div>

      <CardGrid cards={gridCards} initialQuery={q} />

      <BottomNav />
    </main>
  );
}
