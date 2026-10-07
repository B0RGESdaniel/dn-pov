"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">algo deu errado</p>
      <button
        onClick={reset}
        className="rounded-full border border-accent/30 px-6 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:border-accent"
      >
        tentar de novo
      </button>
    </div>
  );
}
