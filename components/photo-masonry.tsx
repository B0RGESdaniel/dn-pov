"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Photo, PhotoFilters, PhotosPage } from "@/types/photo";
import { Lightbox } from "@/components/lightbox";

interface PhotoMasonryProps {
  initialPhotos: Photo[];
  initialCursor: string | null;
  filters?: PhotoFilters;
  onPhotosChange?: (photos: Photo[]) => void;
}

// Fallback só pro atributo width/height exigido pelo next/image quando a
// foto não tem metadado — o tamanho final renderizado (h-auto w-full) usa a
// proporção real do arquivo assim que ele carrega, então isso só evita um
// leve layout shift, não afeta a proporção mostrada.
const FALLBACK_WIDTH = 4;
const FALLBACK_HEIGHT = 5;

// Margem antes de a sentinela entrar na viewport pra já buscar a próxima
// página (scroll nativo — sem canvas arrastável, sem cálculo de posição).
const LOAD_ROOT_MARGIN = "800px 0px";

// Delay em cascata por foto, em vez de uma animação só pro grid inteiro —
// módulo pra reiniciar o ciclo a cada "leva" de fotos e não acumular um
// atraso enorme conforme o índice cresce no scroll infinito.
const STAGGER_CYCLE = 12;
const STAGGER_STEP = 0.05;

export function PhotoMasonry({
  initialPhotos,
  initialCursor,
  filters,
  onPhotosChange,
}: PhotoMasonryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPhotosChange?.(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reporta quando a lista de fotos muda, não a cada nova identidade do callback
  }, [photos]);

  const loadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const params = new URLSearchParams();
    if (filters?.place?.length) params.set("place", filters.place.join(","));
    if (filters?.color?.length) params.set("color", filters.color.join(","));
    params.set("cursor", cursor);

    fetch(`/api/photos?${params.toString()}`)
      .then((response) => response.json())
      .then((page: PhotosPage) => {
        setPhotos((prev) => [...prev, ...page.photos]);
        setCursor(page.nextCursor);
      })
      .finally(() => setIsLoadingMore(false));
  }, [filters, cursor, isLoadingMore]);

  // Scroll nativo da página — uma sentinela no fim da lista dispara a
  // próxima página quando entra (com folga) na viewport.
  useEffect(() => {
    if (!cursor) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: LOAD_ROOT_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (photos.length === 0) {
    return (
      <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma foto encontrada
      </p>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {photos.map((photo, index) => (
          <motion.button
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: (index % STAGGER_CYCLE) * STAGGER_STEP,
            }}
            className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-sm bg-surface shadow-lg sm:mb-4"
            aria-label={photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
          >
            <Image
              src={photo.thumbUrl}
              alt={photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
              width={photo.width ?? FALLBACK_WIDTH}
              height={photo.height ?? FALLBACK_HEIGHT}
              className="h-auto w-full"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              placeholder={photo.blurDataUrl ? "blur" : undefined}
              blurDataURL={photo.blurDataUrl ?? undefined}
              priority={index < 8}
            />
          </motion.button>
        ))}
      </div>

      <div ref={sentinelRef} className="h-px" />

      {isLoadingMore && (
        <p className="py-6 text-center font-mono text-[9px] uppercase tracking-widest text-muted">
          carregando…
        </p>
      )}

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
