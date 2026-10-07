"use client";

import Image from "next/image";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

// Breakpoints do grid (mesmos valores de columns-2/sm:columns-3/lg:columns-4
// que este componente usava antes). CSS columns puro foi abandonado porque o
// algoritmo de balanceamento do navegador pode preencher só parte das
// colunas declaradas (deixando espaço vazio à direita) dependendo da
// quantidade/distribuição das fotos — distribuímos as colunas manualmente
// aqui pra garantir que todas sejam sempre usadas.
const COLUMN_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1024, columns: 4 },
  { minWidth: 640, columns: 3 },
  { minWidth: 0, columns: 2 },
];

function columnsForWidth(width: number): number {
  return COLUMN_BREAKPOINTS.find((bp) => width >= bp.minWidth)!.columns;
}

// Mede a largura real do próprio container do grid (via ResizeObserver) em
// vez de window.innerWidth. Window-based quebrava ao abrir a página de um
// local/cor pela transição de zoom (components/zoom-transition.tsx): o app
// inteiro é montado de novo sob um wrapper que anima scale/opacity, e medir
// a janela nesse meio-tempo é frágil. ResizeObserver reage ao tamanho real
// do elemento, imune a qualquer timing de montagem ou transição em volta.
function useColumnCount(containerRef: RefObject<HTMLDivElement | null>): number {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) setColumns(columnsForWidth(width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return columns;
}

export function PhotoMasonry({
  initialPhotos,
  initialCursor,
  filters,
  onPhotosChange,
}: PhotoMasonryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount(gridRef);

  // Empacotamento guloso: cada foto entra na coluna com menor altura
  // acumulada até agora, estimada pela proporção altura/largura (todas as
  // colunas têm a mesma largura, então a proporção já diz quem fica mais
  // "cheia"). Dá um masonry de verdade, não só um round-robin.
  const columns = useMemo(() => {
    const result: { photo: Photo; index: number }[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    const heights = new Array(columnCount).fill(0);

    photos.forEach((photo, index) => {
      const aspectRatio =
        (photo.height ?? FALLBACK_HEIGHT) / (photo.width ?? FALLBACK_WIDTH);
      let shortest = 0;
      for (let i = 1; i < columnCount; i++) {
        if (heights[i] < heights[shortest]) shortest = i;
      }
      result[shortest].push({ photo, index });
      heights[shortest] += aspectRatio;
    });

    return result;
  }, [photos, columnCount]);

  useEffect(() => {
    onPhotosChange?.(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reporta quando a lista de fotos muda, não a cada nova identidade do callback
  }, [photos]);

  const loadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError(false);

    const params = new URLSearchParams();
    if (filters?.place?.length) params.set("place", filters.place.join(","));
    if (filters?.color?.length) params.set("color", filters.color.join(","));
    params.set("cursor", cursor);

    fetch(`/api/photos?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        return response.json();
      })
      .then((page: PhotosPage) => {
        setPhotos((prev) => [...prev, ...page.photos]);
        setCursor(page.nextCursor);
      })
      .catch(() => setLoadError(true))
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
      <div ref={gridRef} className="flex gap-3 sm:gap-4">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-1 flex-col gap-3 sm:gap-4">
            {column.map(({ photo, index }) => (
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
                className="block w-full overflow-hidden rounded-sm bg-surface shadow-lg"
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
        ))}
      </div>

      <div ref={sentinelRef} className="h-px" />

      {isLoadingMore && (
        <p className="py-6 text-center font-mono text-[9px] uppercase tracking-widest text-muted">
          carregando…
        </p>
      )}

      {loadError && !isLoadingMore && (
        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-center font-mono text-[9px] uppercase tracking-widest text-muted">
            erro ao carregar mais fotos
          </p>
          <button
            type="button"
            onClick={loadMore}
            className="font-mono text-[9px] uppercase tracking-widest text-accent underline"
          >
            tentar de novo
          </button>
        </div>
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
