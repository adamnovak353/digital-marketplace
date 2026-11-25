"use client";

export default function AccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-300/40 bg-[#10162c] px-6 py-14 text-center">
      <h1 className="text-xl font-semibold">This page didn’t load</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{error.message || "Your account data could not be loaded."}</p>
      <button type="button" className="mt-5 rounded-xl bg-[#FF00C8] px-4 py-2.5 text-sm font-semibold text-white" onClick={reset}>Try again</button>
    </div>
  );
}
