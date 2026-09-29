import Image from "next/image";
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
    <div className="flex flex-col pt-16 sm:pt-20">
      {colors.map(({ tag, cover }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          className="flex h-28 sm:h-36 md:h-44"
        >
          <div
            className="isolate relative flex w-[70%] flex-col items-center justify-center gap-1 overflow-hidden"
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
              className="relative z-10 font-display text-4xl tracking-tight sm:text-6xl"
              style={{ color: tag.colorAccent }}
            >
              {tag.name.toUpperCase()}
            </span>
          </div>

          <div className="relative w-[30%] bg-surface">
            {cover && (
              <Image
                src={cover.thumbUrl}
                alt={tag.name}
                fill
                className="object-cover"
                sizes="30vw"
                placeholder={cover.blurDataUrl ? "blur" : undefined}
                blurDataURL={cover.blurDataUrl ?? undefined}
              />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
