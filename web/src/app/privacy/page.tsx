export const metadata = { title: "隱私權政策 - CardFolio" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 py-10 text-sm leading-relaxed">
      <h1 className="text-xl font-bold text-accent">隱私權政策</h1>
      <p className="text-xs text-muted">最後更新：2026-07-10</p>

      <p>
        CardFolio 是一個個人卡牌投資記帳與收藏圖鑑工具。這份文件說明我們收集哪些資料、如何使用，以及你的權利。
      </p>

      <h2 className="mt-2 font-semibold">我們收集什麼資料</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>登入資訊</strong>：使用 Google 登入時，我們透過 Google
          取得你的 email 與帳號識別碼，用於建立你的 CardFolio 帳號。若使用訪客模式，則不會收集任何個人資訊。
        </li>
        <li>
          <strong>你主動輸入的記帳資料</strong>：買入/賣出紀錄、金額、通路、品相、備註、手動填寫的市價等。這些資料僅供你自己使用，不會分享給其他使用者。
        </li>
      </ul>

      <h2 className="mt-2 font-semibold">資料如何儲存與使用</h2>
      <p>
        所有資料儲存在 Supabase（資料庫服務供應商）。每位使用者的記帳資料透過資料庫的列級安全性規則（RLS）彼此隔離，你只能存取自己的資料。我們不會將你的個人記帳資料出售或分享給第三方廣告商。
      </p>
      <p>
        卡牌目錄（卡名、卡圖、系列資訊）來自公開的官方卡牌資料來源，與你的個人帳號資料無關。
      </p>

      <h2 className="mt-2 font-semibold">你的權利</h2>
      <p>
        你可以隨時在「庫存」頁面刪除個別買入/賣出紀錄或項目。若想刪除整個帳號與所有資料，請寄信到下方聯絡信箱提出要求。
      </p>

      <h2 className="mt-2 font-semibold">聯絡方式</h2>
      <p>若有任何隱私相關問題，請聯絡：124yiching@gmail.com</p>
    </main>
  );
}
