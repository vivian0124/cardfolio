/** Yuyu-tei 賣場搜尋連結（純參考用途，不做任何自動比對或資料寫入）。 */
export function yuyuTeiSearchUrl(gameId: string, cardName: string): string | null {
  const section = gameId === "ptcg" ? "poc" : gameId === "opcg" ? "opc" : null;
  if (!section) return null;
  const params = new URLSearchParams({ search_word: cardName });
  return `https://yuyu-tei.jp/sell/${section}/s/search?${params.toString()}`;
}
