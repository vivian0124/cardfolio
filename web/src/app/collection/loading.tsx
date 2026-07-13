export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div className="glass h-8 w-32 animate-pulse" />
      <div className="flex gap-2">
        <div className="glass h-8 w-20 animate-pulse rounded-full" />
        <div className="glass h-8 w-24 animate-pulse rounded-full" />
        <div className="glass h-8 w-16 animate-pulse rounded-full" />
      </div>
      <div className="glass h-10 animate-pulse" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
