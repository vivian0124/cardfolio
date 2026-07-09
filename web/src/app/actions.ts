"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PurchaseShared = {
  purchasedAt: string;
  channel: string;
  currency: string;
  exchangeRate: number;
};

export type PurchaseRow = {
  name: string;
  cardId: string | null; // 從目錄選卡時帶入，自由文字則為 null
  itemType: "card" | "sealed";
  quantity: number;
  price: number;
  fees: number;
  condition: string;
  grading: string;
  note: string;
};

export type SaleInput = {
  lotId: string;
  quantity: number;
  price: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  soldAt: string;
  buyerNote: string;
};

type ActionResult = { error: string | null };

export async function createPurchases(
  shared: PurchaseShared,
  rows: PurchaseRow[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  if (!shared.purchasedAt) return { error: "請填買入日期" };
  if (rows.length === 0) return { error: "至少要有一筆項目" };
  for (const row of rows) {
    if (!row.name.trim()) return { error: "每筆項目都要有名稱" };
    if (!(row.quantity > 0)) return { error: `「${row.name}」數量要大於 0` };
    if (!(row.price >= 0)) return { error: `「${row.name}」金額不可為負` };
  }

  for (const row of rows) {
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .insert({
        item_type: row.itemType,
        card_id: row.itemType === "card" ? row.cardId : null,
        custom_name: row.name.trim(),
        condition: row.condition || null,
        grading: row.grading.trim() || null,
        note: row.note.trim() || null,
      })
      .select("id")
      .single();
    if (itemError) return { error: itemError.message };

    const { error: lotError } = await supabase.from("purchase_lots").insert({
      item_id: item.id,
      quantity: row.quantity,
      price: row.price,
      currency: shared.currency,
      exchange_rate: shared.exchangeRate,
      fees: row.fees,
      channel: shared.channel.trim() || null,
      purchased_at: shared.purchasedAt,
    });
    if (lotError) return { error: lotError.message };
  }

  revalidatePath("/");
  revalidatePath("/items");
  return { error: null };
}

export async function createSale(
  itemId: string,
  input: SaleInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  if (!(input.quantity > 0)) return { error: "賣出數量要大於 0" };
  if (!(input.price >= 0)) return { error: "金額不可為負" };
  if (!input.soldAt) return { error: "請填賣出日期" };

  // 檢查該批次剩餘數量夠不夠賣
  const { data: lot, error: lotError } = await supabase
    .from("purchase_lots")
    .select("id, quantity, sales(quantity)")
    .eq("id", input.lotId)
    .single();
  if (lotError) return { error: lotError.message };

  const soldQty = (lot.sales ?? []).reduce(
    (sum: number, s: { quantity: number }) => sum + s.quantity,
    0
  );
  const remaining = lot.quantity - soldQty;
  if (input.quantity > remaining)
    return { error: `此批次只剩 ${remaining} 個可賣` };

  const { error: saleError } = await supabase.from("sales").insert({
    lot_id: input.lotId,
    quantity: input.quantity,
    price: input.price,
    currency: input.currency,
    exchange_rate: input.exchangeRate,
    fees: input.fees,
    buyer_note: input.buyerNote.trim() || null,
    sold_at: input.soldAt,
  });
  if (saleError) return { error: saleError.message };

  // 全部賣完就把項目標成已售出
  const { data: lots } = await supabase
    .from("purchase_lots")
    .select("quantity, sales(quantity)")
    .eq("item_id", itemId);
  const totalRemaining = (lots ?? []).reduce((sum, l) => {
    const sold = (l.sales ?? []).reduce(
      (s: number, x: { quantity: number }) => s + x.quantity,
      0
    );
    return sum + (l.quantity - sold);
  }, 0);
  if (totalRemaining === 0) {
    await supabase
      .from("inventory_items")
      .update({ status: "sold" })
      .eq("id", itemId);
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
  return { error: null };
}

export async function deleteSale(
  saleId: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sales").delete().eq("id", saleId);
  if (error) return { error: error.message };

  // 刪掉賣出紀錄後庫存一定 > 0，狀態改回持有中
  await supabase
    .from("inventory_items")
    .update({ status: "holding" })
    .eq("id", itemId);

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
  return { error: null };
}

export async function toggleWishlist(cardId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const { data: existing } = await supabase
    .from("wishlist")
    .select("id")
    .eq("card_id", cardId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("wishlist").insert({ card_id: cardId });
    if (error) return { error: error.message };
  }

  revalidatePath("/wishlist");
  return { error: null };
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/items");
  return { error: null };
}

export async function updateMarketPrice(
  itemId: string,
  priceTWD: number | null
): Promise<ActionResult> {
  const supabase = await createClient();
  if (priceTWD !== null && !(priceTWD >= 0)) {
    return { error: "市價不可為負" };
  }

  const { error } = await supabase
    .from("inventory_items")
    .update({
      market_price_twd: priceTWD,
      market_price_updated_at: priceTWD === null ? null : new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
  return { error: null };
}
