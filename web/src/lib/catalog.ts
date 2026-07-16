import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

/**
 * 卡表（games/card_sets/cards）是公開資料，所有使用者看到的一樣。
 * 用無 session 的用戶端查詢＋Next 資料快取（1 小時），
 * 重複瀏覽同一個遊戲/系列時完全不打資料庫。
 * 需要 migration 0007 開放目錄表的 anon 讀取。
 */
function catalogClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export type CatalogSet = {
  id: string;
  code: string;
  name: string;
  language: string;
  release_date: string | null;
  total_cards: number | null;
};

export type CatalogCard = {
  id: string;
  card_no: string;
  name: string;
  name_zh: string | null;
  rarity: string | null;
  image_url: string | null;
  supertype: string | null;
  types: string[] | null;
  color: string | null;
  category: string | null;
};

/** 某遊戲的全部系列（含所有語言，呼叫端自行過濾） */
export const getSetsByGame = unstable_cache(
  async (game: string): Promise<CatalogSet[]> => {
    const { data } = await catalogClient()
      .from("card_sets")
      .select("id, code, name, language, release_date, total_cards")
      .eq("game_id", game)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("code", { ascending: false })
      .limit(2000);
    return (data ?? []) as CatalogSet[];
  },
  ["catalog-sets-by-game"],
  { revalidate: 3600 }
);

/** 單一系列＋其所有卡片 */
export const getSetWithCards = unstable_cache(
  async (
    setId: string
  ): Promise<{
    set: {
      id: string;
      code: string;
      name: string;
      language: string;
      game_id: string;
    } | null;
    cards: CatalogCard[];
  }> => {
    const supabase = catalogClient();
    const [{ data: set }, { data: cards }] = await Promise.all([
      supabase
        .from("card_sets")
        .select("id, code, name, language, game_id")
        .eq("id", setId)
        .maybeSingle(),
      supabase
        .from("cards")
        .select(
          "id, card_no, name, name_zh, rarity, image_url, supertype, types, color, category"
        )
        .eq("set_id", setId)
        .order("card_no")
        .limit(1000),
    ]);
    return { set, cards: (cards ?? []) as CatalogCard[] };
  },
  ["catalog-set-with-cards"],
  { revalidate: 3600 }
);

/**
 * 找同一張卡的日文版名稱：同 game/系列代碼(code)/卡號，但 language='ja'。
 * 用於 yuyu-tei 這類日本賣場搜尋——不論使用者記帳時選的是哪個語言版本，
 * 都用日文名稱去搜才搜得到。找不到日文版就回傳 null（呼叫端 fallback 原名）。
 */
export const getJapaneseCardName = unstable_cache(
  async (
    gameId: string,
    setCode: string,
    cardNo: string
  ): Promise<string | null> => {
    const { data: jaSet } = await catalogClient()
      .from("card_sets")
      .select("id")
      .eq("game_id", gameId)
      .eq("code", setCode)
      .eq("language", "ja")
      .maybeSingle();
    if (!jaSet) return null;
    const { data: jaCard } = await catalogClient()
      .from("cards")
      .select("name")
      .eq("set_id", jaSet.id)
      .eq("card_no", cardNo)
      .maybeSingle();
    return jaCard?.name ?? null;
  },
  ["catalog-japanese-card-name"],
  { revalidate: 3600 }
);
