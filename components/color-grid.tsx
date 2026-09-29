import Link from "next/link";
import { ColorAlbum } from "@/lib/db";

interface ColorGridProps {
  colors: ColorAlbum[];
}

export function ColorGrid({ colors }: ColorGridProps) {
  if (colors.length === 0) {
    return (
      <p className="p-8 pt-24 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma cor cadastrada ainda
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 pt-16 sm:grid-cols-3 sm:pt-20 md:grid-cols-4">
      {colors.map(({ tag }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          className="isolate relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden"
          style={{ backgroundColor: tag.colorBg }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-90"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='3' intercept='-1'/%3E%3CfeFuncG type='linear' slope='3' intercept='-1'/%3E%3CfeFuncB type='linear' slope='3' intercept='-1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
            }}
          />
          <span
            className="relative z-10 font-display text-2xl tracking-tight sm:text-4xl"
            style={{ color: tag.colorAccent }}
          >
            {tag.name.toUpperCase()}
          </span>
        </Link>
      ))}
    </div>
  );
}
