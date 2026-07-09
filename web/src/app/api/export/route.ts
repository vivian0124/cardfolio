import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Row = {
  type: "買入" | "賣出";
  item_name: string;
  item_type: string;
  date: string;
  quantity: number;
  currency: string;
  price: number;
  fees: number;
  exchange_rate: number;
  amount_twd: number;
  note: string;
};

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data: items } = await supabase.from("inventory_items").select(
    "id, custom_name, item_type, purchase_lots(quantity, price, fees, currency, exchange_rate, channel, purchased_at, sales(quantity, price, fees, currency, exchange_rate, buyer_note, sold_at))"
  );

  const rows: Row[] = [];
  for (const item of items ?? []) {
    const name = item.custom_name ?? "未命名";
    for (const lot of item.purchase_lots ?? []) {
      const price = Number(lot.price);
      const fees = Number(lot.fees);
      const rate = Number(lot.exchange_rate);
      rows.push({
        type: "買入",
        item_name: name,
        item_type: item.item_type,
        date: lot.purchased_at,
        quantity: lot.quantity,
        currency: lot.currency,
        price,
        fees,
        exchange_rate: rate,
        amount_twd: Math.round((price + fees) * rate),
        note: lot.channel ?? "",
      });
      for (const sale of lot.sales ?? []) {
        const sPrice = Number(sale.price);
        const sFees = Number(sale.fees);
        const sRate = Number(sale.exchange_rate);
        rows.push({
          type: "賣出",
          item_name: name,
          item_type: item.item_type,
          date: sale.sold_at,
          quantity: sale.quantity,
          currency: sale.currency,
          price: sPrice,
          fees: sFees,
          exchange_rate: sRate,
          amount_twd: Math.round((sPrice - sFees) * sRate),
          note: sale.buyer_note ?? "",
        });
      }
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  const header = [
    "類型",
    "項目名稱",
    "種類",
    "日期",
    "數量",
    "幣別",
    "金額",
    "費用",
    "匯率",
    "台幣金額",
    "備註",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.type,
        r.item_name,
        r.item_type === "card" ? "單卡" : "密封品",
        r.date,
        r.quantity,
        r.currency,
        r.price,
        r.fees,
        r.exchange_rate,
        r.amount_twd,
        r.note,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];
  // 加 UTF-8 BOM，Excel 開啟中文才不會亂碼
  const csv = "﻿" + lines.join("\r\n");

  const filename = `cardfolio-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
