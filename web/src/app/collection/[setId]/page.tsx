import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import CardGrid, { type GridCard } from "@/components/CardGrid";

export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  card_no: string;
  name: string;
  rarity: string | null;
  image_url: string | null;
};

export default async function SetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { setId } = await params;
  const [{ data: set }, { data: cardsData }, { data: ownedData }, { data: wishData }] =
    await Promise.all([
      supabase
        .from("card_sets")
        .select("id, code, name, language, game_id")
        .eq("id", setId)
        .maybeSingle(),
      supabase
        .from("cards")
        .select("id, card_no, name, rarity, image_url")
        .eq("set_id", setId)
        .order("card_no")
        .limit(1000),
      supabase
        .from("inventory_items")
        .select("card_id, cards!inner(set_id)")
        .not("card_id", "is", null)
        .eq("status", "holding")
        .eq("cards.set_id", setId),
      supabase.from("wishlist").select("card_id"),
    ]);

  if (!set) notFound();

  const cards = (cardsData ?? []) as CardRow[];
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

      <CardGrid cards={gridCards} />

      <BottomNav />
    </main>
  );
}
