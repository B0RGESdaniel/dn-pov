"use client";

import createGlobe, { COBEOptions } from "cobe";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";

interface GlobeMapProps {
  places: PlaceAlbum[];
}

const BASE_MARKER_SIZE = 0.045;
const MAX_MARKER_BOOST = 0.05;
const SELECTED_MARKER_BOOST = 0.05;
const AUTO_ROTATE_SPEED = 0.0025;
const DRAG_SENSITIVITY = 0.005;
const FOCUS_EASING = 0.06;

// Converte lat/lon em phi/theta pra centralizar o marcador na câmera do cobe.
function locationToAngles(lat: number, lon: number): [phi: number, theta: number] {
  return [Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
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

  const maxCount = useMemo(
    () => Math.max(1, ...places.map((place) => place.count)),
    [places],
  );

  const markers = useMemo<COBEOptions["markers"]>(
    () =>
      places.map((place) => ({
        location: [place.tag.lat, place.tag.lon] as [number, number],
        size:
          BASE_MARKER_SIZE +
          (place.count / maxCount) * MAX_MARKER_BOOST +
          (place.tag.id === selectedId ? SELECTED_MARKER_BOOST : 0),
      })),
    [places, maxCount, selectedId],
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
      mapBrightness: 1.4,
      baseColor: [0.16, 0.16, 0.16],
      markerColor: [0.894, 0.863, 0.784],
      glowColor: [0.35, 0.32, 0.28],
      markers,
    });

    // cobe v2 não tem callback onRender — a animação é conduzida chamando
    // globe.update() a cada frame.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só cria o globo uma vez; updates via effect abaixo
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

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-baseline gap-3">
        <h1 className="font-display text-lg tracking-tight">Mapa</h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {places.length} {places.length === 1 ? "local" : "locais"}
        </span>
      </div>

      {places.length === 0 ? (
        <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhum local com coordenadas ainda
        </p>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div
            ref={wrapperRef}
            className="relative mx-auto aspect-square w-full max-w-[560px] touch-none"
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
          </div>

          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {places.map((place, index) => (
              <div
                key={place.tag.id}
                className={`flex flex-col rounded-sm border bg-surface p-2 pb-3 shadow-md transition-transform hover:-translate-y-1 ${
                  index % 2 === 0 ? "rotate-[-1.5deg]" : "rotate-[1.5deg]"
                } hover:rotate-0 ${
                  selectedId === place.tag.id ? "border-accent" : "border-border"
                }`}
              >
                <button
                  onClick={() => handleSelect(place)}
                  className="relative aspect-[4/5] w-full overflow-hidden bg-background/40"
                  aria-label={`Centralizar mapa em ${place.tag.name}`}
                >
                  {place.cover && (
                    <Image
                      src={place.cover.thumbUrl}
                      alt={place.tag.name}
                      fill
                      className="object-cover"
                      sizes="200px"
                      placeholder={place.cover.blurDataUrl ? "blur" : undefined}
                      blurDataURL={place.cover.blurDataUrl ?? undefined}
                    />
                  )}
                </button>
                <div className="mt-2 flex items-baseline justify-between gap-2 px-1">
                  <span className="font-display text-sm tracking-tight text-foreground">
                    {place.tag.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    {place.count}
                  </span>
                </div>
                <Link
                  href={`/?place=${encodeURIComponent(place.tag.name)}`}
                  className="mt-1 px-1 font-mono text-[9px] uppercase tracking-widest text-muted hover:text-accent"
                >
                  ver fotos →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
