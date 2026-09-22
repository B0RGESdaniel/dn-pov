"use client";

import Image from "next/image";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";
import { Lightbox } from "@/components/lightbox";

interface ActiveFilters {
  place?: string[];
  subject?: string[];
  color?: string[];
}

interface PhotoMuralProps {
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

// Tamanho fixo do lado maior de cada foto — não muda com a quantidade de
// fotos no acervo (sem "zoom out"), só o mural fica fisicamente maior.
const TILE_LONG_EDGE_DESKTOP = 260;
const TILE_LONG_EDGE_MOBILE = 160;
const MOBILE_BREAKPOINT = 640;
const GAP = 14;
const LOAD_THRESHOLD = 800; // px de distância da borda esquerda pra buscar mais
const RENDER_BUFFER = 400; // margem além do viewport visível pra manter montado
const DRAG_CLICK_THRESHOLD = 6; // px de movimento total pra não contar como clique
const INERTIA_DECAY = 0.94;
const INERTIA_STOP_SPEED = 0.5;

interface TileLayout {
  photo: Photo;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Jitter/rotação determinísticos por id — não embaralham a cada render.
// Hash só com operações inteiras (sem Math.sin): funções transcendentais
// como sin/cos não têm garantia de bater bit-a-bit entre engines/plataformas
// diferentes, o que causava mismatch de hidratação (servidor x cliente).
function hashToUnit(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function seededJitter(seed: number, range: number): number {
  return (hashToUnit(seed) - 0.5) * 2 * range;
}

// Masonry por colunas cronológicas: cada coluna preenche de cima pra baixo
// até estourar a altura fixa, aí a próxima foto começa uma nova coluna à
// direita. Cada foto mantém a proporção original (só o lado maior é fixo).
function layoutMural(
  photos: Photo[],
  tileLongEdge: number,
  columnHeight: number,
): { tiles: TileLayout[]; worldWidth: number } {
  const tiles: TileLayout[] = [];
  let columnX = 0;
  let columnY = 0;
  let columnWidth = 0;
  let columnHasTiles = false;

  for (const photo of photos) {
    const naturalWidth = photo.width ?? 1;
    const naturalHeight = photo.height ?? 1;
    const isPortrait = naturalHeight >= naturalWidth;
    const shortEdge = Math.max(
      40,
      Math.round(
        (tileLongEdge * Math.min(naturalWidth, naturalHeight)) /
          Math.max(naturalWidth, naturalHeight),
      ),
    );
    const width = isPortrait ? shortEdge : tileLongEdge;
    const height = isPortrait ? tileLongEdge : shortEdge;

    if (columnHasTiles && columnY + height > columnHeight) {
      columnX += columnWidth + GAP;
      columnY = 0;
      columnWidth = 0;
      columnHasTiles = false;
    }

    tiles.push({
      photo,
      x: columnX + seededJitter(photo.id * 3, 10),
      y: columnY + seededJitter(photo.id * 3 + 1, 10),
      width,
      height,
      rotation: seededJitter(photo.id * 3 + 2, 3),
    });

    columnY += height + GAP;
    columnWidth = Math.max(columnWidth, width);
    columnHasTiles = true;
  }

  return { tiles, worldWidth: columnX + columnWidth };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function PhotoMural({
  initialPhotos,
  initialCursor,
  tags,
  activeFilters,
}: PhotoMuralProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerState = useRef({ down: false, lastX: 0, lastY: 0, lastT: 0, vx: 0, vy: 0 });
  const dragTotalRef = useRef(0);
  const dragMovedRef = useRef(false);
  const inertiaFrameRef = useRef<number | null>(null);

  const tagsByCategory = useMemo(() => {
    const groups: Record<TagCategory, Tag[]> = { place: [], subject: [], color: [] };
    for (const tag of tags) groups[tag.category].push(tag);
    return groups;
  }, [tags]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = containerSize.width > 0 && containerSize.width < MOBILE_BREAKPOINT;
  const tileLongEdge = isMobile ? TILE_LONG_EDGE_MOBILE : TILE_LONG_EDGE_DESKTOP;
  // Colunas um pouco mais altas que o viewport: dá um "respiro" vertical pro
  // drag sem virar um segundo eixo de paginação (só o horizontal carrega mais).
  const columnHeight = containerSize.height > 0 ? containerSize.height * 1.6 : 800;

  const { tiles, worldWidth } = useMemo(
    () => layoutMural(photos, tileLongEdge, columnHeight),
    [photos, tileLongEdge, columnHeight],
  );

  const bounds = useMemo(
    () => ({
      minX: Math.min(0, containerSize.width - worldWidth),
      maxX: 0,
      minY: Math.min(0, containerSize.height - columnHeight),
      maxY: 0,
    }),
    [containerSize, worldWidth, columnHeight],
  );

  // Posição exibida sempre dentro dos limites atuais — não precisa de efeito
  // pra "corrigir" o state quando o mundo cresce (nova página) ou a tela
  // muda de tamanho, só recalcula no render.
  const displayX = clamp(translate.x, bounds.minX, bounds.maxX);
  const displayY = clamp(translate.y, bounds.minY, bounds.maxY);

  const loadMore = useCallback(() => {
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
  }, [activeFilters, cursor, isLoadingMore]);

  // Perto da borda esquerda (mais fotos antigas) e ainda tem o que buscar.
  // Roda num frame separado (não direto no corpo do efeito) pra não
  // encadear um setState síncrono dentro do próprio efeito.
  useEffect(() => {
    if (!cursor || isLoadingMore) return;
    if (displayX - bounds.minX > LOAD_THRESHOLD) return;
    const frame = requestAnimationFrame(() => loadMore());
    return () => cancelAnimationFrame(frame);
  }, [displayX, bounds.minX, cursor, isLoadingMore, loadMore]);

  function stopInertia() {
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    stopInertia();
    dragTotalRef.current = 0;
    dragMovedRef.current = false;
    pointerState.current = {
      down: true,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerState.current.down) return;
    const now = performance.now();
    const dt = Math.max(1, now - pointerState.current.lastT);
    const dx = event.clientX - pointerState.current.lastX;
    const dy = event.clientY - pointerState.current.lastY;

    dragTotalRef.current += Math.abs(dx) + Math.abs(dy);
    if (dragTotalRef.current > DRAG_CLICK_THRESHOLD) dragMovedRef.current = true;

    pointerState.current.vx = dx / dt;
    pointerState.current.vy = dy / dt;
    pointerState.current.lastX = event.clientX;
    pointerState.current.lastY = event.clientY;
    pointerState.current.lastT = now;

    setTranslate((prev) => ({
      x: clamp(prev.x + dx, bounds.minX, bounds.maxX),
      y: clamp(prev.y + dy, bounds.minY, bounds.maxY),
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerState.current.down) return;
    pointerState.current.down = false;
    event.currentTarget.releasePointerCapture(event.pointerId);

    let vx = pointerState.current.vx * 16;
    let vy = pointerState.current.vy * 16;

    function step() {
      vx *= INERTIA_DECAY;
      vy *= INERTIA_DECAY;
      if (Math.abs(vx) < INERTIA_STOP_SPEED && Math.abs(vy) < INERTIA_STOP_SPEED) {
        inertiaFrameRef.current = null;
        return;
      }
      setTranslate((prev) => ({
        x: clamp(prev.x + vx, bounds.minX, bounds.maxX),
        y: clamp(prev.y + vy, bounds.minY, bounds.maxY),
      }));
      inertiaFrameRef.current = requestAnimationFrame(step);
    }
    inertiaFrameRef.current = requestAnimationFrame(step);
  }

  function toggleTag(category: TagCategory, name: string) {
    const current = activeFilters[category] ?? [];
    const next = current.includes(name)
      ? current.filter((value) => value !== name)
      : [...current, name];
    router.push(`/${buildQuery({ ...activeFilters, [category]: next })}`);
  }

  function clearFilters() {
    router.push("/");
  }

  function openLightbox(photoId: number) {
    if (dragMovedRef.current) return;
    const index = photos.findIndex((photo) => photo.id === photoId);
    if (index !== -1) setLightboxIndex(index);
  }

  const activeCount =
    (activeFilters.place?.length ?? 0) +
    (activeFilters.subject?.length ?? 0) +
    (activeFilters.color?.length ?? 0);

  const viewportLeft = -displayX - RENDER_BUFFER;
  const viewportRight = -displayX + containerSize.width + RENDER_BUFFER;

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-6">
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
        <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhuma foto encontrada
        </p>
      ) : (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex-1 cursor-grab touch-none select-none overflow-hidden bg-background active:cursor-grabbing"
        >
          <div
            className="absolute inset-0"
            style={{ transform: `translate3d(${displayX}px, ${displayY}px, 0)` }}
          >
            {tiles.map((tile) => {
              const isVisible = tile.x + tile.width >= viewportLeft && tile.x <= viewportRight;
              return (
                <button
                  key={tile.photo.id}
                  onClick={() => openLightbox(tile.photo.id)}
                  className="absolute overflow-hidden rounded-sm bg-surface shadow-lg"
                  style={{
                    left: tile.x,
                    top: tile.y,
                    width: tile.width,
                    height: tile.height,
                    transform: `rotate(${tile.rotation}deg)`,
                  }}
                  aria-label={tile.photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
                >
                  {isVisible && (
                    <Image
                      src={tile.photo.thumbUrl}
                      alt={tile.photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
                      fill
                      className="object-cover"
                      sizes={`${tile.width}px`}
                      placeholder={tile.photo.blurDataUrl ? "blur" : undefined}
                      blurDataURL={tile.photo.blurDataUrl ?? undefined}
                      draggable={false}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {isLoadingMore && (
            <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest text-muted">
              carregando…
            </span>
          )}
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
