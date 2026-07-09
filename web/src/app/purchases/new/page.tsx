import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import PurchaseForm from "@/components/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 從圖鑑「＋買入」帶卡片過來時預填第一列
  const { card: cardParam } = await searchParams;
  let initialCard: { id: string; name: string } | null = null;
  if (cardParam) {
    const { data: card } = await supabase
      .from("cards")
      .select("id, name")
      .eq("id", cardParam)
      .maybeSingle();
    if (card) initialCard = card;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 px-4 pb-24 pt-8">
      <h1 className="text-xl font-bold">記一筆買入</h1>
      <PurchaseForm initialCard={initialCard} />
      <BottomNav />
    </main>
  );
}
