import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import PurchaseForm from "@/components/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 px-4 pb-24 pt-8">
      <h1 className="text-xl font-bold">記一筆買入</h1>
      <PurchaseForm />
      <BottomNav />
    </main>
  );
}
