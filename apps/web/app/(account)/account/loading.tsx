export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-white/10" />
      <div className="h-4 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}
      </div>
      <p className="text-sm text-slate-400">Loading your account…</p>
    </div>
  );
}
