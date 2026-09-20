"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Album } from "@/lib/db";
import { TagCategory } from "@/types/photo";

interface AlbumGridProps {
  albums: Album[];
}

const TABS: { label: string; category: TagCategory | null }[] = [
  { label: "Todos", category: null },
  { label: "Local", category: "place" },
  { label: "Assunto", category: "subject" },
  { label: "Cor", category: "color" },
];

const CATEGORY_KIND: Record<TagCategory, string> = {
  place: "Local",
  subject: "Assunto",
  color: "Cor",
};

const CATEGORY_QUERY_KEY: Record<TagCategory, string> = {
  place: "place",
  subject: "subject",
  color: "color",
};

export function AlbumGrid({ albums }: AlbumGridProps) {
  const [tab, setTab] = useState<TagCategory | null>(null);

  const visibleAlbums = useMemo(
    () => (tab ? albums.filter((album) => album.tag.category === tab) : albums),
    [albums, tab],
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-baseline gap-3">
        <h1 className="font-display text-lg tracking-tight">Álbuns</h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {albums.length} álbuns · local, assunto e cor
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => {
          const active = tab === item.category;
          return (
            <button
              key={item.label}
              onClick={() => setTab(item.category)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                active
                  ? "border-accent bg-accent text-background"
                  : "border-border text-foreground/70 hover:border-muted"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {visibleAlbums.length === 0 ? (
        <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhum álbum ainda
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleAlbums.map((album) => (
            <Link
              key={album.tag.id}
              href={`/?${CATEGORY_QUERY_KEY[album.tag.category]}=${encodeURIComponent(album.tag.name)}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-surface"
            >
              {album.cover && (
                <Image
                  src={album.cover.thumbUrl}
                  alt={album.tag.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  placeholder={album.cover.blurDataUrl ? "blur" : undefined}
                  blurDataURL={album.cover.blurDataUrl ?? undefined}
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute inset-x-3 bottom-3 flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/65">
                  {CATEGORY_KIND[album.tag.category]}
                </span>
                <span className="font-display text-lg leading-tight tracking-tight text-white">
                  {album.tag.name}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/55">
                  {album.count} {album.count === 1 ? "foto" : "fotos"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
