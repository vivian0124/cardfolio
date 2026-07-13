export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div className="glass h-8 w-40 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="glass h-20 animate-pulse" />
        <div className="glass h-20 animate-pulse" />
        <div className="glass h-20 animate-pulse" />
        <div className="glass h-20 animate-pulse" />
      </div>
      <div className="glass h-32 animate-pulse" />
    </main>
  );
}
