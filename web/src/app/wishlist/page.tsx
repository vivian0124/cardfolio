import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import CardThumb from "@/components/CardThumb";
import WishlistButton from "@/components/WishlistButton";

export const dynamic = "force-dynamic";

type WishRow = {
  id: string;
  card_id: string;
  cards: {
    id: string;
    name: string;
    card_no: string;
    image_url: string | null;
    card_sets: { code: string; language: string } | { code: string; language: string }[];
  } | null;
};

export default async function WishlistPage() {
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
      .from("wishlist")
      .select(
        "id, card_id, cards(id, name, card_no, image_url, card_sets(code, language))"
      )
      .order("created_at", { ascending: false }),
  ]);
  if (!user) redirect("/login");

  const rows = (data ?? []) as unknown as WishRow[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div>
        <Link href="/collection" className="text-xs text-muted">
          ← 圖鑑
        </Link>
        <h1 className="mt-1 text-xl font-bold text-accent">願望清單</h1>
      </div>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">
          還沒有想收的卡，去圖鑑點 🤍 加進來
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {rows.map((w) => {
          const card = w.cards;
          if (!card) return null;
          const set = Array.isArray(card.card_sets)
            ? card.card_sets[0]
            : card.card_sets;
          return (
            <div key={w.id} className="glass flex items-center gap-3 p-3">
              {card.image_url ? (
                <CardThumb
                  src={card.image_url}
                  alt=""
                  width={100}
                  className="h-16 w-12 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="h-16 w-12 shrink-0 rounded bg-white/5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{card.name}</div>
                <div className="text-xs text-muted">
                  {set?.code}・{card.card_no}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  prefetch={false}
                  href={`/purchases/new?card=${card.id}`}
                  className="btn-ghost px-3 py-1 text-xs text-muted"
                >
                  ＋買入
                </Link>
                <WishlistButton cardId={card.id} initialIn={true} />
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
