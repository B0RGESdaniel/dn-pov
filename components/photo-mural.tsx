"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";
import { Lightbox } from "@/components/lightbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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

// Fallback só pro atributo width/height exigido pelo next/image quando a
// foto não tem metadado — o tamanho final renderizado (h-auto w-full) usa a
// proporção real do arquivo assim que ele carrega, então isso só evita um
// leve layout shift, não afeta a proporção mostrada.
const FALLBACK_WIDTH = 4;
const FALLBACK_HEIGHT = 5;

// Margem antes de a sentinela entrar na viewport pra já buscar a próxima
// página (scroll nativo — sem canvas arrastável, sem cálculo de posição).
const LOAD_ROOT_MARGIN = "800px 0px";

function buildQuery(filters: ActiveFilters): string {
  const params = new URLSearchParams();
  if (filters.place?.length) params.set("place", filters.place.join(","));
  if (filters.subject?.length) params.set("subject", filters.subject.join(","));
  if (filters.color?.length) params.set("color", filters.color.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Seleção fica pendente enquanto o drawer está aberto — só vira navegação
  // (e remonta o mural, via key={filterKey} em app/page.tsx) quando o drawer
  // fecha. Sem isso, cada toque num chip já navegaria e fecharia o drawer
  // sozinho, impedindo marcar local + assunto + cor numa sessão só.
  const [pendingFilters, setPendingFilters] = useState<ActiveFilters>(activeFilters);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const tagsByCategory = useMemo(() => {
    const groups: Record<TagCategory, Tag[]> = { place: [], subject: [], color: [] };
    for (const tag of tags) groups[tag.category].push(tag);
    return groups;
  }, [tags]);

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

  function togglePendingTag(category: TagCategory, name: string) {
    setPendingFilters((current) => {
      const list = current[category] ?? [];
      const next = list.includes(name)
        ? list.filter((value) => value !== name)
        : [...list, name];
      return { ...current, [category]: next };
    });
  }

  function handleFiltersOpenChange(open: boolean) {
    setFiltersOpen(open);
    if (open) {
      // Reabre sempre a partir do que está aplicado agora (descarta qualquer
      // resquício de uma sessão anterior fechada sem commit).
      setPendingFilters(activeFilters);
      return;
    }
    // Fechar (botão, swipe, tap fora, esc) sempre confirma a seleção
    // pendente — só navega se ela realmente mudou, pra não remontar o mural
    // à toa quando o usuário só abriu e fechou o drawer sem mexer em nada.
    const nextQuery = buildQuery(pendingFilters);
    if (nextQuery !== buildQuery(activeFilters)) {
      router.push(`/${nextQuery}`);
    }
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  const activeCount =
    (activeFilters.place?.length ?? 0) +
    (activeFilters.subject?.length ?? 0) +
    (activeFilters.color?.length ?? 0);

  const pendingActiveCount =
    (pendingFilters.place?.length ?? 0) +
    (pendingFilters.subject?.length ?? 0) +
    (pendingFilters.color?.length ?? 0);

  return (
    <div className="flex flex-col">
      <header className="sticky top-12 z-10 border-b border-border bg-background px-4 py-3 sm:px-6">
        <Drawer open={filtersOpen} onOpenChange={handleFiltersOpenChange} autoFocus>
          <DrawerTrigger asChild>
            <button className="flex w-full items-center justify-between gap-2 rounded-sm border border-border px-3 py-2.5 text-left text-sm text-foreground/80 hover:border-muted">
              <span className="flex shrink-0 items-center gap-2">
                <span aria-hidden className="leading-none">☰</span>
                Filtros
              </span>
              <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                {photos.length} fotos
                {activeCount > 0
                  ? ` · ${activeCount} ${activeCount === 1 ? "ativo" : "ativos"}`
                  : ""}
              </span>
            </button>
          </DrawerTrigger>

          <DrawerContent className="border-border bg-background">
            <DrawerHeader className="flex-row items-baseline justify-between gap-3 border-b border-border pb-3 text-left">
              <div className="flex items-baseline gap-3">
                <DrawerTitle className="font-display text-base tracking-tight">
                  Filtros
                </DrawerTitle>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                  local · assunto · cor
                </span>
              </div>
              {pendingActiveCount > 0 && (
                <button
                  onClick={() => setPendingFilters({})}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-foreground"
                >
                  limpar
                </button>
              )}
            </DrawerHeader>

            <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
              {CATEGORY_ORDER.map((category) => {
                const options = tagsByCategory[category];
                if (options.length === 0) return null;

                return (
                  <div key={category} className="flex flex-col gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      {CATEGORY_LABEL[category]}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {options.map((tag) => {
                        const active = (pendingFilters[category] ?? []).includes(
                          tag.name,
                        );
                        return (
                          <button
                            key={tag.id}
                            onClick={() => togglePendingTag(category, tag.name)}
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
                  </div>
                );
              })}
            </div>

            <DrawerFooter className="border-t border-border pt-3">
              <DrawerClose asChild>
                <button className="w-full rounded-sm bg-accent py-3 text-center font-mono text-[10px] uppercase tracking-widest text-background">
                  ver fotos →
                </button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </header>

      {photos.length === 0 ? (
        <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhuma foto encontrada
        </p>
      ) : (
        <div className="px-4 py-4 sm:px-6">
          <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(index)}
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
              </button>
            ))}
          </div>

          <div ref={sentinelRef} className="h-px" />

          {isLoadingMore && (
            <p className="py-6 text-center font-mono text-[9px] uppercase tracking-widest text-muted">
              carregando…
            </p>
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
