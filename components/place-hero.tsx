import Image from "next/image";
import Link from "next/link";

interface PlaceHeroProps {
  name: string;
  count: number;
  cover: {
    thumbUrl: string;
    blurDataUrl: string | null;
  } | null;
  prevName: string;
  nextName: string;
}

export function PlaceHero({ name, count, cover, prevName, nextName }: PlaceHeroProps) {
  return (
    <section className="flex flex-col items-center gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          my perspective of
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {name}
        </h1>
      </div>

      <div className="w-full max-w-sm overflow-hidden rounded-sm border border-border bg-surface shadow-lg sm:max-w-md">
        {cover && (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={cover.thumbUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 448px, 90vw"
              placeholder={cover.blurDataUrl ? "blur" : undefined}
              blurDataURL={cover.blurDataUrl ?? undefined}
              priority
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <Link
          href={`/local/${encodeURIComponent(prevName)}`}
          aria-label={`Local anterior: ${prevName}`}
          className="font-mono text-lg text-muted transition-colors hover:text-foreground"
        >
          ←
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {count} {count === 1 ? "foto" : "fotos"}
        </span>
        <Link
          href={`/local/${encodeURIComponent(nextName)}`}
          aria-label={`Próximo local: ${nextName}`}
          className="font-mono text-lg text-muted transition-colors hover:text-foreground"
        >
          →
        </Link>
      </div>

      <a
        href="#fotos"
        className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
      >
        ver fotos ↓
      </a>
    </section>
  );
}
