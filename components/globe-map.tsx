"use client";

import createGlobe, { COBEOptions } from "cobe";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface GlobeMapProps {
  places: PlaceAlbum[];
}

const AUTO_ROTATE_SPEED = 0.001;
const DRAG_SENSITIVITY = 0.005;
const FOCUS_EASING = 0.06;
const MARKER_SIZE = 0.02; // mesmo valor do showcase "Polaroids" de cobe.vercel.app

// positionAnchor e a custom property --polaroid-rotate ainda não estão no
// CSSProperties do React/csstype — declaramos só o que precisamos além do
// padrão.
type AnchorStyle = React.CSSProperties & {
  positionAnchor?: string;
  "--polaroid-rotate"?: string;
};

// Converte lat/lon em phi/theta pra centralizar o marcador na câmera do cobe.
function locationToAngles(
  lat: number,
  lon: number,
): [phi: number, theta: number] {
  return [
    Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ];
}

function markerId(placeId: number): string {
  return `place-${placeId}`;
}

// Rotação determinística do polaroid por local (-6 a 6 graus) — hash
// inteiro puro (Math.imul), não Math.sin: essa última não é garantida
// bit-a-bit idêntica entre o Node (SSR) e o browser, o que já causou
// mismatch de hidratação no mural de fotos.
function polaroidRotate(placeId: number): number {
  const hash = Math.imul(placeId, 2654435761) >>> 0;
  return (hash % 13) - 6;
}

export function GlobeMap({ places }: GlobeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  const phiRef = useRef(0);
  const thetaRef = useRef(0.15);
  const targetRef = useRef<{ phi: number; theta: number } | null>(null);
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const widthRef = useRef(560);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // O dot do marcador (size) marca o ponto exato; o cartão polaroid flutua
  // acima dele. O id é o que o cobe usa pra gerar os anchors/variáveis CSS
  // (--cobe-<id>, --cobe-visible-<id>) usados pelo polaroid HTML abaixo.
  const markers = useMemo<COBEOptions["markers"]>(
    () =>
      places.map((place) => ({
        location: [place.tag.lat, place.tag.lon] as [number, number],
        size: MARKER_SIZE,
        id: markerId(place.tag.id),
      })),
    [places],
  );

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;

    const updateWidth = () => {
      widthRef.current = wrapperRef.current?.clientWidth ?? widthRef.current;
    };
    updateWidth();

    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 4.5,
      baseColor: [0.45, 0.6, 0.85],
      markerColor: [0.894, 0.863, 0.784],
      glowColor: [0.35, 0.32, 0.28],
      markerElevation: 0,
      markers,
    });

    // cobe v2 não tem callback onRender — a animação é conduzida chamando
    // globe.update() a cada frame. Essa mesma chamada já recalcula os
    // anchors dos marcadores, então as labels HTML acompanham o giro sozinhas.
    let frameId = requestAnimationFrame(function animate() {
      if (!pointerRef.current.down) {
        if (targetRef.current) {
          phiRef.current +=
            (targetRef.current.phi - phiRef.current) * FOCUS_EASING;
          thetaRef.current +=
            (targetRef.current.theta - thetaRef.current) * FOCUS_EASING;
          if (
            Math.abs(targetRef.current.phi - phiRef.current) < 0.001 &&
            Math.abs(targetRef.current.theta - thetaRef.current) < 0.001
          ) {
            targetRef.current = null;
          }
        } else {
          phiRef.current += AUTO_ROTATE_SPEED;
        }
      }
      globeRef.current?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      });
      frameId = requestAnimationFrame(animate);
    });

    const onResize = () => {
      updateWidth();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      globeRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só cria o globo uma vez; markers atualizam via effect abaixo
  }, []);

  useEffect(() => {
    globeRef.current?.update({ markers });
  }, [markers]);

  // Só gira o globo até o local e marca a seleção — não mexe no carrossel.
  // Usado tanto por quem inicia a seleção fora do carrossel (clique num
  // marcador) quanto pelo próprio evento "select" do carrossel, que já
  // rolou sozinho.
  function focusPlace(place: PlaceAlbum) {
    setSelectedId(place.tag.id);
    const [phi, theta] = locationToAngles(place.tag.lat, place.tag.lon);
    targetRef.current = { phi, theta };
  }

  // Clique num marcador do globo ou num card do carrossel: foca o local e
  // garante que o carrossel também role até o card correspondente.
  function selectPlace(place: PlaceAlbum) {
    focusPlace(place);
    const index = places.findIndex((item) => item.tag.id === place.tag.id);
    if (index !== -1) carouselApi?.scrollTo(index);
  }

  // Sincroniza a partir do carrossel: tanto o estado inicial (local em foco
  // assim que a API do Embla fica disponível) quanto qualquer troca de slide
  // por arrasto/teclado do próprio usuário.
  useEffect(() => {
    if (!carouselApi || places.length === 0) return;

    function handleSelect() {
      const place = places[carouselApi!.selectedScrollSnap()];
      if (place) focusPlace(place);
    }

    handleSelect();
    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, places]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current = { down: true, x: event.clientX, y: event.clientY };
    targetRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current.down = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointerRef.current.down) return;
    const deltaX = event.clientX - pointerRef.current.x;
    const deltaY = event.clientY - pointerRef.current.y;
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
    phiRef.current += deltaX * DRAG_SENSITIVITY;
    thetaRef.current = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, thetaRef.current + deltaY * DRAG_SENSITIVITY),
    );
  }

  const activePlace = places.find((place) => place.tag.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg tracking-tight">Mapa</h1>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {places.length} {places.length === 1 ? "local" : "locais"}
          </span>
        </div>
      </header>

      {places.length === 0 ? (
        <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhum local com coordenadas ainda
        </p>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* TODO (passo 3): carrossel de texto com o nome do lugar entra aqui. */}
          <div className="shrink-0 pt-16" />

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6">
            <div
              ref={wrapperRef}
              className="relative aspect-square w-full max-w-160 touch-none"
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerOut={handlePointerUp}
                onPointerMove={handlePointerMove}
                className="cursor-grab active:cursor-grabbing"
                style={{ width: "100%", height: "100%" }}
              />

              {places.map((place) => {
                const id = markerId(place.tag.id);
                const isSelected = selectedId === place.tag.id;
                const style: AnchorStyle = {
                  positionAnchor: `--cobe-${id}`,
                  opacity: `var(--cobe-visible-${id}, 0)`,
                  filter: `blur(var(--cobe-visible-${id}, 10px))`,
                  "--polaroid-rotate": `${polaroidRotate(place.tag.id)}deg`,
                  pointerEvents: "auto",
                  cursor: "pointer",
                };
                return (
                  <div
                    key={place.tag.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectPlace(place)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        selectPlace(place);
                      }
                    }}
                    className={`globe-marker-polaroid ${isSelected ? "globe-marker-polaroid--selected z-20" : "z-10"}`}
                    style={style}
                  >
                    <div className="globe-marker-polaroid-thumb">
                      {place.cover && (
                        <Image
                          src={place.cover.thumbUrl}
                          alt={place.tag.name}
                          fill
                          className="object-cover"
                          sizes="(min-width: 768px) 64px, 40px"
                          placeholder={
                            place.cover.blurDataUrl ? "blur" : undefined
                          }
                          blurDataURL={place.cover.blurDataUrl ?? undefined}
                        />
                      )}
                    </div>
                    <span className="globe-marker-polaroid-caption">
                      {place.tag.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-4 pb-2 sm:gap-3 sm:px-6">
            <button
              onClick={() => carouselApi?.scrollPrev()}
              aria-label="Local anterior"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:border-muted hover:text-foreground"
            >
              ←
            </button>

            <Carousel
              setApi={setCarouselApi}
              opts={{ align: "center", containScroll: "trimSnaps" }}
              className="min-w-0 flex-1"
            >
              <CarouselContent>
                {/* Spacer nas pontas: sem espaço extra antes/depois dos
                    cards reais, o Embla nunca consegue centralizar o
                    primeiro/último item (não há pra onde rolar além da
                    borda do conteúdo). */}
                <CarouselItem
                  aria-hidden
                  className="basis-[calc(50%-4rem)] pointer-events-none sm:basis-[calc(50%-5rem)]"
                />
                {places.map((place) => {
                  const active = selectedId === place.tag.id;
                  return (
                    <CarouselItem key={place.tag.id} className="basis-32 sm:basis-40">
                      <button
                        onClick={() => selectPlace(place)}
                        className={`relative h-24 w-full overflow-hidden rounded-sm text-left transition-opacity duration-300 sm:h-28 ${
                          active ? "opacity-100 ring-2 ring-accent" : "opacity-40 ring-1 ring-border"
                        }`}
                      >
                        {place.cover && (
                          <Image
                            src={place.cover.thumbUrl}
                            alt={place.tag.name}
                            fill
                            className="object-cover"
                            sizes="160px"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute inset-x-0 bottom-0 truncate px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-white">
                          {place.tag.name}
                        </span>
                      </button>
                    </CarouselItem>
                  );
                })}
                <CarouselItem
                  aria-hidden
                  className="basis-[calc(50%-4rem)] pointer-events-none sm:basis-[calc(50%-5rem)]"
                />
              </CarouselContent>
            </Carousel>

            <button
              onClick={() => carouselApi?.scrollNext()}
              aria-label="Próximo local"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:border-muted hover:text-foreground"
            >
              →
            </button>
          </div>

          {activePlace && (
            <div className="flex shrink-0 justify-center px-4 pb-4 pt-1 sm:px-6">
              <Link
                href={`/local/${encodeURIComponent(activePlace.tag.name)}`}
                className="rounded-full border border-accent bg-accent px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-90"
              >
                Explorar
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
