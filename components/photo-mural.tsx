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

// Largura fixa de cada foto — não muda com a quantidade de fotos no acervo
// (sem "zoom out"), só o mural fica fisicamente maior. A altura varia com a
// proporção original de cada foto, então toda coluna tem a mesma largura e
// o gap fica idêntico nos dois eixos.
const TILE_WIDTH_DESKTOP = 260;
const TILE_WIDTH_MOBILE = 160;
const MOBILE_BREAKPOINT = 640;
const GAP = 14;
const LOAD_THRESHOLD = 800; // px de distância da borda inferior pra buscar mais
const RENDER_BUFFER = 400; // margem além do viewport visível pra manter montado
const DRAG_CLICK_THRESHOLD = 6; // px de movimento total pra não contar como clique
const INERTIA_DECAY = 0.94;
const INERTIA_STOP_SPEED = 0.5;
// Fotos landscape ocupam 2 colunas adjacentes (em vez de achatar pra caber
// em 1), mantendo a proporção original sem esticar/cortar.
const LANDSCAPE_SPAN = 2;

interface TileLayout {
  photo: Photo;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Masonry de colunas cronológicas com largura fixa: o número de colunas é
// definido pela largura da tela (numColumns), sem limite de altura — o
// mural cresce pra baixo (tempo) conforme mais fotos entram. Fotos landscape
// ocupam 2 colunas adjacentes. Cada foto entra na coluna (ou par) com menos
// altura ocupada até agora — masonry clássico, tipo Pinterest.
function layoutMural(
  photos: Photo[],
  tileWidth: number,
  numColumns: number,
): { tiles: TileLayout[]; worldHeight: number } {
  const tiles: TileLayout[] = [];
  const columnBottoms = new Array(Math.max(1, numColumns)).fill(0);
  // Ponto onde a busca por coluna começa, avançando a cada foto (rodízio).
  // Sem isso, empates de altura sempre favorecem a coluna de índice mais
  // baixo, e alguma coluna do meio pode ficar sem ser escolhida por muito
  // tempo mesmo tendo espaço livre.
  let scanCursor = 0;

  function columnX(index: number): number {
    return index * (tileWidth + GAP);
  }

  for (const photo of photos) {
    const naturalWidth = photo.width ?? 1;
    const naturalHeight = photo.height ?? 1;
    const maxSpan = Math.min(LANDSCAPE_SPAN, columnBottoms.length);
    const span = naturalWidth > naturalHeight ? maxSpan : 1;
    const renderWidth = span * tileWidth + (span - 1) * GAP;
    const height = Math.max(40, Math.round((renderWidth * naturalHeight) / naturalWidth));

    const maxStart = columnBottoms.length - span;
    let bestColumn = 0;
    let bestBottom = Infinity;
    for (let offset = 0; offset <= maxStart; offset++) {
      const start = (scanCursor + offset) % (maxStart + 1);
      const groupBottom = Math.max(...columnBottoms.slice(start, start + span));
      if (groupBottom < bestBottom) {
        bestBottom = groupBottom;
        bestColumn = start;
      }
    }
    scanCursor = (bestColumn + span) % (maxStart + 1);

    tiles.push({ photo, x: columnX(bestColumn), y: bestBottom, width: renderWidth, height });

    const newBottom = bestBottom + height + GAP;
    for (let i = bestColumn; i < bestColumn + span; i++) columnBottoms[i] = newBottom;
  }

  return { tiles, worldHeight: Math.max(0, ...columnBottoms) };
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
  const tileWidth = isMobile ? TILE_WIDTH_MOBILE : TILE_WIDTH_DESKTOP;
  // Número de colunas cabendo na largura visível — o mural não tem "zoom
  // out", então quando a tela é mais estreita que uma coluna ainda mostra 1.
  const numColumns =
    containerSize.width > 0
      ? Math.max(1, Math.floor((containerSize.width + GAP) / (tileWidth + GAP)))
      : 1;

  const { tiles, worldHeight } = useMemo(
    () => layoutMural(photos, tileWidth, numColumns),
    [photos, tileWidth, numColumns],
  );

  const worldWidth = numColumns * tileWidth + (numColumns - 1) * GAP;

  const bounds = useMemo(
    () => ({
      minX: Math.min(0, containerSize.width - worldWidth),
      maxX: 0,
      minY: Math.min(0, containerSize.height - worldHeight),
      maxY: 0,
    }),
    [containerSize, worldWidth, worldHeight],
  );

  // Posição exibida sempre dentro dos limites atuais — não precisa de efeito
  // pra "corrigir" o state quando o mundo cresce (nova página) ou a tela
  // muda de tamanho, só recalcula no render.
  // Quando o masonry é mais estreito que o container (telas largas ou poucas
  // fotos), sobra espaço vazio de um lado — em vez de deixar o mural colado
  // na esquerda, soma um offset fixo pra centralizá-lo. Não interfere no
  // drag: bounds.minX/maxX já travam translate.x em 0 nesse caso.
  const centerOffsetX = Math.max(0, (containerSize.width - worldWidth) / 2);

  const displayX = centerOffsetX + clamp(translate.x, bounds.minX, bounds.maxX);
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

  // Perto da borda inferior (mais fotos antigas) e ainda tem o que buscar.
  // Roda num frame separado (não direto no corpo do efeito) pra não
  // encadear um setState síncrono dentro do próprio efeito.
  useEffect(() => {
    if (!cursor || isLoadingMore) return;
    if (displayY - bounds.minY > LOAD_THRESHOLD) return;
    const frame = requestAnimationFrame(() => loadMore());
    return () => cancelAnimationFrame(frame);
  }, [displayY, bounds.minY, cursor, isLoadingMore, loadMore]);

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

  const viewportTop = -displayY - RENDER_BUFFER;
  const viewportBottom = -displayY + containerSize.height + RENDER_BUFFER;

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
              const isVisible = tile.y + tile.height >= viewportTop && tile.y <= viewportBottom;
              // Acima da dobra na abertura do mural (posição inicial, sem
              // drag) — evita o aviso de LCP pedindo carregamento eager.
              const isAboveFold = tile.y < containerSize.height;
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
                      priority={isAboveFold}
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
