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
    <div className="flex flex-col pt-16 sm:pt-20">
      {colors.map(({ tag, count, cover }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          onClick={() =>
            setActiveColor({ colorBg: tag.colorBg, colorAccent: tag.colorAccent })
          }
          className="flex h-28 sm:h-36 md:h-44"
        >
          <div
            className="flex w-[70%] flex-col items-center justify-center gap-1"
            style={{ backgroundColor: tag.colorBg }}
          >
            <span
              className="font-display text-2xl tracking-tight sm:text-4xl"
              style={{ color: tag.colorAccent }}
            >
              {tag.name}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-widest opacity-70"
              style={{ color: tag.colorAccent }}
            >
              {count} {count === 1 ? "foto" : "fotos"}
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
