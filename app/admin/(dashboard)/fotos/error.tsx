"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">algo deu errado</p>
      <p className="max-w-md font-mono text-xs text-red-400">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-full border border-accent/30 px-6 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:border-accent"
      >
        tentar de novo
      </button>
    </div>
  );
}
