import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const GAMES = [
  { id: "ptcg", label: "寶可夢" },
  { id: "opcg", label: "One Piece" },
];
const LANGS = [
  { id: "ja", label: "日文" },
  { id: "en", label: "英文" },
  { id: "zh-TW", label: "繁中" },
];

type SetRow = {
  id: string;
  code: string;
  name: string;
  release_date: string | null;
  total_cards: number | null;
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; lang?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const game = GAMES.some((g) => g.id === params.game) ? params.game! : "ptcg";
  const lang = LANGS.some((l) => l.id === params.lang) ? params.lang! : "ja";

  const [{ data: setsData }, { data: ownedData }] = await Promise.all([
    supabase
      .from("card_sets")
      .select("id, code, name, release_date, total_cards")
      .eq("game_id", game)
      .eq("language", lang)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("code", { ascending: false })
      .limit(500),
    supabase
      .from("inventory_items")
      .select("card_id, cards!inner(set_id)")
      .not("card_id", "is", null)
      .eq("status", "holding"),
  ]);

  const sets = (setsData ?? []) as SetRow[];
  // 每個系列持有幾種不同的卡（收集進度算「種類」不算張數）
  const ownedBySet = new Map<string, Set<string>>();
  for (const row of ownedData ?? []) {
    const setId = (
      Array.isArray(row.cards) ? row.cards[0] : row.cards
    )?.set_id;
    if (!setId) continue;
    if (!ownedBySet.has(setId)) ownedBySet.set(setId, new Set());
    ownedBySet.get(setId)!.add(row.card_id as string);
  }

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${
      active
        ? "bg-foreground font-medium text-background"
        : "border border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
    }`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">收藏圖鑑</h1>
        <Link
          href="/wishlist"
          className="text-sm text-gray-500 underline-offset-4 hover:underline dark:text-gray-400"
        >
          ❤️ 願望清單
        </Link>
      </div>

      <div className="flex gap-2">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/collection?game=${g.id}&lang=${lang}`}
            className={tabCls(g.id === game)}
          >
            {g.label}
          </Link>
        ))}
        <span className="mx-1 self-center text-gray-300 dark:text-gray-600">
          |
        </span>
        {LANGS.map((l) => (
          <Link
            key={l.id}
            href={`/collection?game=${game}&lang=${l.id}`}
            className={tabCls(l.id === lang)}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {sets.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
          這個語系的卡表還沒同步進來
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sets.map((s) => {
          const owned = ownedBySet.get(s.id)?.size ?? 0;
          const total = s.total_cards;
          const pct =
            total && total > 0 ? Math.min(100, (owned / total) * 100) : null;
          return (
            <Link
              key={s.id}
              href={`/collection/${s.id}`}
              className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {s.name}
                </span>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {total ? `${owned} / ${total}` : owned > 0 ? `持有 ${owned}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {s.code}
                  {s.release_date && `・${s.release_date}`}
                </span>
              </div>
              {pct !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
