export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-5xl">
      <div className="glass h-8 w-56 animate-pulse" />
      <div className="glass h-10 animate-pulse" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="glass aspect-[5/7] animate-pulse" />
        ))}
      </div>
    </main>
  );
}
