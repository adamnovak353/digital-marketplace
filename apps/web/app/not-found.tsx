import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">That route is not part of the demo marketplace.</p>
      <Link href="/" className="mt-4 inline-block text-cyan-300">Back home</Link>
    </div>
  );
}
