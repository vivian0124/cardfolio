import Logo from "@/components/Logo";

/** 跳頁 loading：C 環旋轉、笑臉卡不動，下方終端機式閃爍文字 */
export default function PageLoader() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <Logo size={84} spinning />
      <p className="mono-num animate-pulse text-xs tracking-widest text-muted">
        LOADING…
      </p>
    </main>
  );
}
