import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <p className="text-5xl">🏆</p>
      <h1 className="text-xl font-bold text-neutral-900">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-neutral-500">
        That page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Prize Board home
      </Link>
    </main>
  );
}
