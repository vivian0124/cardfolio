import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSetsByGame } from "@/lib/catalog";
import BottomNav from "@/components/BottomNav";
import SetList, { type SetListRow } from "@/components/SetList";

export const dynamic = "force-dynamic";

const GAMES = [
  { id: "ptcg", label: "寶可夢" },
  { id: "opcg", label: "One Piece" },
];
const LANGS = [
  { id: "zh-TW", label: "繁中" },
  { id: "ja", label: "日文" },
  { id: "en", label: "英文" },
];

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; lang?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const game = GAMES.some((g) => g.id === params.game) ? params.game! : "ptcg";

  // 三路平行：身分驗證、卡表（跨使用者快取）、使用者持有資料
  const [
    {
      data: { user },
    },
    allSets,
    { data: ownedData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getSetsByGame(game),
    supabase
      .from("inventory_items")
      .select("card_id, cards!inner(set_id)")
      .not("card_id", "is", null)
      .eq("status", "holding"),
  ]);
  if (!user) redirect("/login");

  // 只保留這個遊戲真的有卡表的語言（OPCG 目前沒繁中 → 繁中分頁自動消失）
  const availableLangs = new Set(allSets.map((s) => s.language));
  const langs = LANGS.filter((l) => availableLangs.has(l.id));
  const requestedLang =
    params.lang && availableLangs.has(params.lang) ? params.lang : null;
  const lang = requestedLang ?? langs[0]?.id ?? "en";

  const sets = allSets.filter((s) => s.language === lang);
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

  const setRows: SetListRow[] = sets.map((s) => ({
    ...s,
    owned: ownedBySet.get(s.id)?.size ?? 0,
  }));

  const tabCls = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
      active ? "btn-accent" : "btn-ghost text-muted"
    }`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent">收藏圖鑑</h1>
        <Link
          href="/wishlist"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          ❤️ 願望清單
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/collection?game=${g.id}&lang=${lang}`}
            className={tabCls(g.id === game)}
          >
            {g.label}
          </Link>
        ))}
        <span className="mx-1 shrink-0 self-center text-muted">|</span>
        {langs.map((l) => (
          <Link
            key={l.id}
            href={`/collection?game=${game}&lang=${l.id}`}
            className={tabCls(l.id === lang)}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {sets.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          這個語系的卡表還沒同步進來
        </p>
      ) : (
        <SetList sets={setRows} game={game} lang={lang} initialQuery={params.q} />
      )}

      <BottomNav />
    </main>
  );
}
