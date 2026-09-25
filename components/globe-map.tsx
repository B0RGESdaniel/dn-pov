"use client";

import createGlobe, { COBEOptions } from "cobe";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";

interface GlobeMapProps {
  places: PlaceAlbum[];
}

const AUTO_ROTATE_SPEED = 0.001;
const DRAG_SENSITIVITY = 0.005;
const FOCUS_EASING = 0.06;
const SCALE_EASING = 0.08;
const NORMAL_SCALE = 1;
const REGION_ZOOM_SCALE = 2.4;
const MARKER_SIZE = 0.02; // mesmo valor do showcase "Polaroids" de cobe.vercel.app

type Region =
  | "europa"
  | "asia"
  | "africa"
  | "oceania"
  | "america-sul"
  | "america-norte"
  | "brasil";

const REGION_ORDER: Region[] = [
  "europa",
  "asia",
  "africa",
  "oceania",
  "america-sul",
  "america-norte",
  "brasil",
];

const REGION_LABEL: Record<Region, string> = {
  europa: "Europa",
  asia: "Ásia",
  africa: "África",
  oceania: "Oceania",
  "america-sul": "América do Sul",
  "america-norte": "América do Norte",
  brasil: "Brasil",
};

// Classificação geográfica aproximada por bounding box — o schema só guarda
// lat/lon livre por tag de local, sem região. Brasil é checado antes da
// América do Sul genérica porque o pedido trata os dois como grupos
// distintos; Ásia fica como fallback final (cobre o resto do globo: Rússia,
// Oriente Médio, sul/leste asiático) em vez de uma bounding box própria,
// que seria irregular demais pra valer a pena.
function regionForPlace(lat: number, lon: number): Region {
  if (lat >= -34 && lat <= 6 && lon >= -74 && lon <= -32) return "brasil";
  if (lat >= 34 && lat <= 72 && lon >= -25 && lon <= 45) return "europa";
  if (lat >= -35 && lat <= 38 && lon >= -18 && lon <= 52) return "africa";
  if (lat >= -50 && lat <= 25 && lon >= 110 && lon <= 180) return "oceania";
  if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) return "america-sul";
  if (lat >= 5 && lat <= 84 && lon >= -170 && lon <= -50) return "america-norte";
  return "asia";
}

function regionCentroid(regionPlaces: PlaceAlbum[]): [lat: number, lon: number] {
  const lat =
    regionPlaces.reduce((sum, place) => sum + place.tag.lat, 0) /
    regionPlaces.length;
  const lon =
    regionPlaces.reduce((sum, place) => sum + place.tag.lon, 0) /
    regionPlaces.length;
  return [lat, lon];
}

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
  const scaleRef = useRef(NORMAL_SCALE);
  const targetScaleRef = useRef(NORMAL_SCALE);
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const widthRef = useRef(560);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zoomedRegion, setZoomedRegion] = useState<Region | null>(null);

  const regionGroups = useMemo(() => {
    const groups = new Map<Region, PlaceAlbum[]>();
    for (const place of places) {
      const region = regionForPlace(place.tag.lat, place.tag.lon);
      const list = groups.get(region);
      if (list) list.push(place);
      else groups.set(region, [place]);
    }
    return REGION_ORDER.filter((region) => groups.has(region)).map(
      (region) => ({ region, places: groups.get(region)! }),
    );
  }, [places]);

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
      scale: scaleRef.current,
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
      scaleRef.current +=
        (targetScaleRef.current - scaleRef.current) * SCALE_EASING;
      globeRef.current?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        scale: scaleRef.current,
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

  function handleZoomRegion(region: Region, regionPlaces: PlaceAlbum[]) {
    const [lat, lon] = regionCentroid(regionPlaces);
    const [phi, theta] = locationToAngles(lat, lon);
    targetRef.current = { phi, theta };
    targetScaleRef.current = REGION_ZOOM_SCALE;
    setZoomedRegion(region);
    setSelectedId(null);
  }

  function handleResetZoom() {
    targetScaleRef.current = NORMAL_SCALE;
    setZoomedRegion(null);
  }

  const selectedPlace =
    places.find((place) => place.tag.id === selectedId) ?? null;

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
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <aside className="order-2 flex max-h-[40vh] flex-col gap-4 overflow-y-auto border-border px-4 py-4 sm:px-6 md:order-1 md:max-h-none md:w-64 md:shrink-0 md:border-r">
            <button
              onClick={handleResetZoom}
              disabled={!zoomedRegion}
              className={`w-full rounded-sm border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest ${
                zoomedRegion
                  ? "border-accent text-accent hover:bg-accent hover:text-background"
                  : "border-border text-muted opacity-50"
              }`}
            >
              ↺ escala normal
            </button>

            {regionGroups.map(({ region, places: regionPlaces }) => (
              <div key={region} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    {REGION_LABEL[region]}
                  </span>
                  <button
                    onClick={() => handleZoomRegion(region, regionPlaces)}
                    className={`font-mono text-[9px] uppercase tracking-widest ${
                      zoomedRegion === region
                        ? "text-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    + zoom
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {regionPlaces.map((place) => {
                    const active = selectedId === place.tag.id;
                    return (
                      <button
                        key={place.tag.id}
                        onClick={() => handleSelect(place)}
                        className={`flex items-center justify-between gap-2 rounded-sm border px-3 py-1.5 text-left text-sm font-medium ${
                          active
                            ? "border-accent bg-accent text-background"
                            : "border-border bg-transparent text-foreground/70 hover:border-muted"
                        }`}
                      >
                        <span className="truncate">{place.tag.name}</span>
                        <span className="shrink-0 font-mono text-[9px] opacity-70">
                          {place.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <div className="relative order-1 flex flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-6 md:order-2">
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
                  "--polaroid-rotate": `${polaroidRotate(place.tag.id)}deg`,
                };
                return (
                  <div
                    key={place.tag.id}
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

            {selectedPlace && (
              <Link
                href={`/mural?place=${encodeURIComponent(selectedPlace.tag.name)}`}
                className="absolute bottom-6 rounded-full border border-accent bg-background px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent hover:bg-accent hover:text-background"
              >
                ver fotos de {selectedPlace.tag.name} →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
