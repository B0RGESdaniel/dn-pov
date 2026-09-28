"use client";

import createGlobe, { COBEOptions } from "cobe";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";

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

// Variants do slide horizontal do nome em foco e dos nomes anterior/próximo
// nos cantos — mesma direção (via slideDirectionRef), distância proporcional
// ao tamanho de cada texto.
function slideVariants(distance: number) {
  return {
    enter: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? distance : -distance,
    }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -distance : distance,
    }),
  };
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
  // Sentido do slide horizontal do nome em destaque (1 = da direita pra
  // esquerda, -1 = o inverso) — recalculado a cada troca de local, não
  // precisa ser state porque só é lido no render que a própria troca dispara.
  const slideDirectionRef = useRef(1);

  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  // Gira o globo até o local e marca a seleção. Usado pelo clique num
  // marcador, pelas setas ←/→ e pelos nomes anterior/próximo nos cantos.
  function focusPlace(place: PlaceAlbum) {
    const newIndex = places.findIndex((item) => item.tag.id === place.tag.id);
    const oldIndex = places.findIndex((item) => item.tag.id === selectedId);
    if (newIndex !== -1 && oldIndex !== -1 && newIndex !== oldIndex) {
      // Sentido do caminho mais curto no círculo de locais — assim um clique
      // direto num marcador (não só nas setas) também desliza pro lado certo.
      const forward = (newIndex - oldIndex + places.length) % places.length;
      const backward = (oldIndex - newIndex + places.length) % places.length;
      slideDirectionRef.current = forward <= backward ? 1 : -1;
    }
    setSelectedId(place.tag.id);
    const [phi, theta] = locationToAngles(place.tag.lat, place.tag.lon);
    targetRef.current = { phi, theta };
  }

  // Avança/retrocede (com wrap-around) a partir do local em foco — usado
  // pelas setas do nome em destaque, já que não há mais um carrossel visual
  // de onde tirar o índice atual.
  function focusPlaceByOffset(offset: number) {
    if (places.length === 0) return;
    const currentIndex = places.findIndex((place) => place.tag.id === selectedId);
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (baseIndex + offset + places.length) % places.length;
    focusPlace(places[nextIndex]);
  }

  // Seleciona o primeiro local assim que a lista chega — antes disso não há
  // local em foco.
  useEffect(() => {
    if (places.length === 0 || selectedId !== null) return;
    focusPlace(places[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só roda na chegada da lista, focusPlace não precisa disparar de novo
  }, [places]);

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
  const activeIndex = places.findIndex((place) => place.tag.id === selectedId);
  const baseIndex = activeIndex === -1 ? 0 : activeIndex;
  const prevPlace = places.length > 0 ? places[(baseIndex - 1 + places.length) % places.length] : null;
  const nextPlace = places.length > 0 ? places[(baseIndex + 1) % places.length] : null;

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
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute left-4 top-16 z-10 max-w-[38vw] overflow-hidden sm:left-6 sm:top-20">
            <AnimatePresence mode="popLayout" custom={slideDirectionRef.current} initial={false}>
              {prevPlace && (
                <motion.button
                  key={prevPlace.tag.id}
                  custom={slideDirectionRef.current}
                  variants={slideVariants(24)}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => focusPlace(prevPlace)}
                  className="pointer-events-auto block truncate text-left font-display text-lg tracking-tight text-foreground/30 hover:text-foreground/60 sm:text-2xl md:text-3xl"
                >
                  {prevPlace.tag.name}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute right-4 top-16 z-10 max-w-[38vw] overflow-hidden sm:right-6 sm:top-20">
            <AnimatePresence mode="popLayout" custom={slideDirectionRef.current} initial={false}>
              {nextPlace && (
                <motion.button
                  key={nextPlace.tag.id}
                  custom={slideDirectionRef.current}
                  variants={slideVariants(24)}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => focusPlace(nextPlace)}
                  className="pointer-events-auto block truncate text-right font-display text-lg tracking-tight text-foreground/30 hover:text-foreground/60 sm:text-2xl md:text-3xl"
                >
                  {nextPlace.tag.name}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 justify-center overflow-hidden px-20 pb-2 pt-16 sm:px-28 sm:pt-20">
            <AnimatePresence mode="popLayout" custom={slideDirectionRef.current} initial={false}>
              {activePlace && (
                <motion.h1
                  key={activePlace.tag.id}
                  custom={slideDirectionRef.current}
                  variants={slideVariants(60)}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="min-w-[4ch] text-center font-display text-4xl tracking-tight sm:text-6xl md:text-7xl"
                >
                  {activePlace.tag.name}
                </motion.h1>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6">
            <button
              onClick={() => focusPlaceByOffset(-1)}
              aria-label="Local anterior"
              className="absolute left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:border-muted hover:text-foreground sm:left-6 sm:h-11 sm:w-11"
            >
              ←
            </button>

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
                    onClick={() => focusPlace(place)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        focusPlace(place);
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

            <button
              onClick={() => focusPlaceByOffset(1)}
              aria-label="Próximo local"
              className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:border-muted hover:text-foreground sm:right-6 sm:h-11 sm:w-11"
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
