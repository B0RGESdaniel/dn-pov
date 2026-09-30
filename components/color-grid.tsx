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
    <div className="flex flex-col gap-4 pt-16 sm:gap-6 sm:pt-20">
      {colors.map(({ tag, covers }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          className="flex h-28 sm:h-36 md:h-44"
        >
          <div
            className="isolate relative flex w-[40%] flex-col items-center justify-center gap-1 overflow-hidden sm:w-[30%]"
            style={{ backgroundColor: tag.colorBg }}
          >
            <div
              aria-hidden
              className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-50"
            />
            <span
              className="relative z-10 font-display text-2xl tracking-tight sm:text-4xl"
              style={{ color: tag.colorAccent }}
            >
              {tag.name.toUpperCase()}
            </span>
          </div>

          {covers.length > 0 && (
            <div className="flex w-[60%] sm:w-[70%]">
              {covers.map((cover) => (
                <div key={cover.id} className="relative flex-1 bg-surface">
                  <Image
                    src={cover.thumbUrl}
                    alt={tag.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 23vw, 33vw"
                    placeholder={cover.blurDataUrl ? "blur" : undefined}
                    blurDataURL={cover.blurDataUrl ?? undefined}
                  />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/25" />
                </div>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
