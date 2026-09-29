"use client";

import Image from "next/image";
import Link from "next/link";
import { ColorAlbum } from "@/lib/db";
import { useSetActiveColor } from "@/components/color-theme-context";

interface ColorGridProps {
  colors: ColorAlbum[];
}

export function ColorGrid({ colors }: ColorGridProps) {
  const setActiveColor = useSetActiveColor();

  if (colors.length === 0) {
    return (
      <p className="p-8 pt-24 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma cor cadastrada ainda
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-20 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:pt-24 md:grid-cols-4">
      {colors.map(({ tag, count, cover }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          onClick={() =>
            setActiveColor({ colorBg: tag.colorBg, colorAccent: tag.colorAccent })
          }
          className="group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-sm border border-border"
          style={{ backgroundColor: tag.colorBg }}
        >
          {cover && (
            <Image
              src={cover.thumbUrl}
              alt={tag.name}
              fill
              className="object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-15"
              sizes="(min-width: 768px) 25vw, 50vw"
              placeholder={cover.blurDataUrl ? "blur" : undefined}
              blurDataURL={cover.blurDataUrl ?? undefined}
            />
          )}

          <span
            className="relative z-10 font-display text-xl tracking-tight sm:text-2xl"
            style={{ color: tag.colorAccent }}
          >
            {tag.name}
          </span>

          <span
            className="relative z-10 font-mono text-[10px] uppercase tracking-widest opacity-70"
            style={{ color: tag.colorAccent }}
          >
            {count} {count === 1 ? "foto" : "fotos"}
          </span>
        </Link>
      ))}
    </div>
  );
}
