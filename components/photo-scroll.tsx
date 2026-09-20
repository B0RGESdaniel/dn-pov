"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";
import { Lightbox } from "@/components/lightbox";

interface ActiveFilters {
  place?: string[];
  subject?: string[];
  color?: string[];
}

interface PhotoScrollProps {
  initialPhotos: Photo[];
  initialCursor: string | null;
  tags: Tag[];
  activeFilters: ActiveFilters;
}

const CATEGORY_LABEL: Record<TagCategory, string> = {
  place: "local",
  subject: "assunto",
  color: "cor",
};

const CATEGORY_ORDER: TagCategory[] = ["place", "subject", "color"];

function buildQuery(filters: ActiveFilters): string {
  const params = new URLSearchParams();
  if (filters.place?.length) params.set("place", filters.place.join(","));
  if (filters.subject?.length) params.set("subject", filters.subject.join(","));
  if (filters.color?.length) params.set("color", filters.color.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function PhotoScroll({
  initialPhotos,
  initialCursor,
  tags,
  activeFilters,
}: PhotoScrollProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tagsByCategory = useMemo(() => {
    const groups: Record<TagCategory, Tag[]> = {
      place: [],
      subject: [],
      color: [],
    };
    for (const tag of tags) groups[tag.category].push(tag);
    return groups;
  }, [tags]);

  function toggleTag(category: TagCategory, name: string) {
    const current = activeFilters[category] ?? [];
    const next = current.includes(name)
      ? current.filter((value) => value !== name)
      : [...current, name];

    router.push(
      `/${buildQuery({ ...activeFilters, [category]: next })}`,
    );
  }

  function clearFilters() {
    router.push("/");
  }

  function loadMore() {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const params = new URLSearchParams();
    if (activeFilters.place?.length) params.set("place", activeFilters.place.join(","));
    if (activeFilters.subject?.length) params.set("subject", activeFilters.subject.join(","));
    if (activeFilters.color?.length) params.set("color", activeFilters.color.join(","));
    params.set("cursor", cursor);

    fetch(`/api/photos?${params.toString()}`)
      .then((response) => response.json())
      .then((page: PhotosPage) => {
        setPhotos((prev) => [...prev, ...page.photos]);
        setCursor(page.nextCursor);
      })
      .finally(() => setIsLoadingMore(false));
  }

  function sentinelCallback(node: HTMLDivElement | null) {
    observerRef.current?.disconnect();
    sentinelRef.current = node;
    if (!node) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    observerRef.current.observe(node);
  }

  const activeCount =
    (activeFilters.place?.length ?? 0) +
    (activeFilters.subject?.length ?? 0) +
    (activeFilters.color?.length ?? 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-12 z-10 border-b border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {photos.length} fotos{activeCount ? " · filtrado" : ""}
          </span>
          {activeCount > 0 && (
            <>
              <span className="flex-1" />
              <button
                onClick={clearFilters}
                className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground"
              >
                limpar
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 overflow-x-auto pb-1">
          {CATEGORY_ORDER.map((category) => {
            const options = tagsByCategory[category];
            if (options.length === 0) return null;

            return (
              <div key={category} className="flex flex-none items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                  {CATEGORY_LABEL[category]}
                </span>
                {options.map((tag) => {
                  const active = (activeFilters[category] ?? []).includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(category, tag.name)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "border-accent bg-accent text-background"
                          : "border-border bg-transparent text-foreground/70 hover:border-muted"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </header>

      {photos.length === 0 ? (
        <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhuma foto encontrada
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative aspect-square overflow-hidden rounded-sm bg-surface"
            >
              <Image
                src={photo.thumbUrl}
                alt={photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                placeholder={photo.blurDataUrl ? "blur" : undefined}
                blurDataURL={photo.blurDataUrl ?? undefined}
              />
            </button>
          ))}
        </div>
      )}

      <div ref={sentinelCallback} className="h-10" />

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
