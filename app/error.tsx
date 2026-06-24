"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-6">
      <section className="max-w-md rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          The tracker could not render.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error.message}</p>
        <button
          className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          onClick={reset}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
