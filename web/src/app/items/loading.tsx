export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-8 md:max-w-4xl">
      <div className="glass h-8 w-24 animate-pulse" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
