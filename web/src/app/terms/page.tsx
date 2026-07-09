export const metadata = { title: "服務條款 - CardFolio" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 py-10 text-sm leading-relaxed">
      <h1 className="text-xl font-bold">服務條款</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        最後更新：2026-07-10
      </p>

      <p>
        CardFolio 是個人開發、非營利的卡牌投資記帳工具，目前為早期開發階段。使用本服務即表示你同意以下條款。
      </p>

      <h2 className="mt-2 font-semibold">服務現況</h2>
      <p>
        本服務仍在持續開發中，功能與資料結構可能隨時調整。我們會盡力保持資料完整，但不保證服務不中斷、不保證資料永久保存，建議定期使用「匯出
        CSV」功能自行備份重要記帳資料。
      </p>

      <h2 className="mt-2 font-semibold">你的責任</h2>
      <p>
        你輸入的記帳資料（金額、交易紀錄等）僅供個人參考，不構成任何投資建議。卡牌市價由你自行填寫或參考外部網站，實際交易請自行判斷。
      </p>

      <h2 className="mt-2 font-semibold">帳號</h2>
      <p>
        訪客帳號的資料僅存在該瀏覽器的登入狀態中，清除瀏覽資料或更換裝置可能導致資料遺失。若需要資料持久保存，建議使用 Google 帳號登入。
      </p>

      <h2 className="mt-2 font-semibold">服務變更與終止</h2>
      <p>
        我們保留隨時修改、暫停或終止服務的權利。若服務終止，會盡量提前告知並提供資料匯出的機會。
      </p>

      <h2 className="mt-2 font-semibold">聯絡方式</h2>
      <p>若有任何問題，請聯絡：124yiching@gmail.com</p>
    </main>
  );
}
