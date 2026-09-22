"use client";

import createGlobe, { COBEOptions } from "cobe";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";

interface GlobeMapProps {
  places: PlaceAlbum[];
}

const AUTO_ROTATE_SPEED = 0.0025;
const DRAG_SENSITIVITY = 0.005;
const FOCUS_EASING = 0.06;

// positionAnchor ainda não está no CSSProperties do React/csstype (é uma
// propriedade CSS recente) — declaramos só o que precisamos além do padrão.
type AnchorStyle = React.CSSProperties & { positionAnchor?: string };

// Converte lat/lon em phi/theta pra centralizar o marcador na câmera do cobe.
function locationToAngles(lat: number, lon: number): [phi: number, theta: number] {
  return [Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

function markerId(placeId: number): string {
  return `place-${placeId}`;
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

  // Marcadores invisíveis (size 0) — só existem pra dar ao cobe um id por
  // local, que ele usa pra gerar os anchors/variáveis CSS (--cobe-<id>,
  // --cobe-visible-<id>) usados pelas labels HTML abaixo. A label com o
  // nome é o marcador visível, sem dot separado.
  const markers = useMemo<COBEOptions["markers"]>(
    () =>
      places.map((place) => ({
        location: [place.tag.lat, place.tag.lon] as [number, number],
        size: 0,
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
      scale: 1,
      mapSamples: 16000,
      mapBrightness: 4.5,
      baseColor: [0.3, 0.3, 0.32],
      markerColor: [0.894, 0.863, 0.784],
      glowColor: [0.35, 0.32, 0.28],
      markers,
    });

    // cobe v2 não tem callback onRender — a animação é conduzida chamando
    // globe.update() a cada frame. Essa mesma chamada já recalcula os
    // anchors dos marcadores, então as labels HTML acompanham o giro sozinhas.
    let frameId = requestAnimationFrame(function animate() {
      if (!pointerRef.current.down) {
        if (targetRef.current) {
          phiRef.current += (targetRef.current.phi - phiRef.current) * FOCUS_EASING;
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

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current = { down: true, x: event.clientX, y: event.clientY };
    targetRef.current = null;
    setSelectedId(null);
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

  function handleSelect(place: PlaceAlbum) {
    setSelectedId(place.tag.id);
    const [phi, theta] = locationToAngles(place.tag.lat, place.tag.lon);
    targetRef.current = { phi, theta };
  }

  const selectedPlace = places.find((place) => place.tag.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-baseline gap-3">
          <h1 className="font-display text-lg tracking-tight">Mapa</h1>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {places.length} {places.length === 1 ? "local" : "locais"}
          </span>
        </div>

        {places.length > 0 && (
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            {places.map((place) => {
              const active = selectedId === place.tag.id;
              return (
                <button
                  key={place.tag.id}
                  onClick={() => handleSelect(place)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "border-accent bg-accent text-background"
                      : "border-border bg-transparent text-foreground/70 hover:border-muted"
                  }`}
                >
                  {place.tag.name}
                  <span className="ml-1.5 font-mono text-[9px] opacity-70">{place.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {places.length === 0 ? (
        <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhum local com coordenadas ainda
        </p>
      ) : (
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-6">
          <div
            ref={wrapperRef}
            className="relative aspect-square w-full max-w-[640px] touch-none"
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
              };
              return (
                <div
                  key={place.tag.id}
                  className={`globe-marker-label ${isSelected ? "globe-marker-label--selected z-20" : "z-10"}`}
                  style={style}
                >
                  {place.tag.name}
                </div>
              );
            })}
          </div>

          {selectedPlace && (
            <Link
              href={`/?place=${encodeURIComponent(selectedPlace.tag.name)}`}
              className="absolute bottom-6 rounded-full border border-accent bg-background px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent hover:bg-accent hover:text-background"
            >
              ver fotos de {selectedPlace.tag.name} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
