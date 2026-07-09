import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import WishlistButton from "@/components/WishlistButton";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8">
      <div>
        <Link
          href={`/collection?game=${set.game_id}&lang=${set.language}`}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          ← 圖鑑
        </Link>
        <h1 className="mt-1 text-lg font-bold">{set.name}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {set.code}・已收集 {owned.size} / {cards.length}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className={`flex flex-col gap-1 rounded-lg border p-1.5 ${
              owned.has(c.id)
                ? "border-green-500"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image_url}
                alt={c.name}
                loading="lazy"
                className="aspect-[5/7] w-full rounded object-cover"
              />
            ) : (
              <div className="flex aspect-[5/7] w-full items-center justify-center rounded bg-gray-100 p-1 text-center text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {c.name}
              </div>
            )}
            <div className="flex items-center justify-between px-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="truncate">
                {c.card_no}
                {c.rarity && `・${c.rarity}`}
              </span>
              {owned.has(c.id) && <span className="text-green-500">✓</span>}
            </div>
            <div className="flex items-center justify-between px-0.5">
              <WishlistButton cardId={c.id} initialIn={wished.has(c.id)} />
              <Link
                href={`/purchases/new?card=${c.id}`}
                className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
              >
                ＋買入
              </Link>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
