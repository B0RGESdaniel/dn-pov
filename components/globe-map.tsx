"use client";

import createGlobe, { COBEOptions } from "cobe";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlaceAlbum } from "@/lib/db";
import { useZoomTransition } from "@/components/zoom-transition";

interface GlobeMapProps {
  places: PlaceAlbum[];
}

const DRAG_SENSITIVITY = 0.005;
const FOCUS_EASING = 0.06;
const MARKER_SIZE = 0.02; // mesmo valor do showcase "Polaroids" de cobe.vercel.app
// Tamanho máximo do globo em px (equivalente ao antigo max-w-160 em Tailwind).
const GLOBE_MAX_SIZE = 640;

// Cores padrão do globo (mesmas usadas na criação) — volta pra elas quando
// o local em foco não tem colorAccent definido.
const DEFAULT_BASE_COLOR: [number, number, number] = [0.25, 0.45, 0.85];
const DEFAULT_GLOW_COLOR: [number, number, number] = [0.2, 0.35, 0.65];
const COLOR_EASING = 0.05;

// cobe usa RGB 0-1 (não hex, não 0-255).
function hexToRgb01(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
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

// Distância (em vw) entre o slot central (local em foco) e os slots
// anterior/próximo — o trilho inteiro (os 3 textos) se move nessa unidade.
const SLOT_VW = 30;

// Variants de um slot do "trilho" de nomes. offset é a posição relativa ao
// local em foco (-1 anterior, 0 atual, 1 próximo) na renderização atual.
// A continuidade do carrossel vem de reaproveitar a MESMA instância (mesma
// key = tag.id) entre uma renderização e a seguinte: o local que era
// "próximo" (offset 1) e virou o novo foco (offset 0) não é recriado — só
// tem seu `animate` recalculado, e o framer-motion anima o "x"/escala/opacity
// do valor antigo pro novo, dando a sensação de deslizar até o centro.
//
// `enter` é um valor fixo: só é lido no exato render em que o slot é criado,
// então usar o `direction` corrente (fechado no momento da chamada) já basta.
// `exit` precisa ser FUNÇÃO: quando um slot sai da janela de 3, ele não
// renderiza de novo — o framer-motion reaplica os últimos props que ele
// teve. Se `exit` fosse um valor fixo, ficaria com o `direction` "congelado"
// de quando ainda estava visível, errado se o sentido do movimento mudar de
// uma troca pra outra. Por isso é função: o `custom` passado ao
// <AnimatePresence> (não ao slot) é reavaliado na hora da remoção, sempre
// com o sentido atual.
function slotVariants(offset: number, direction: number) {
  const active = offset === 0;
  return {
    enter: { x: `${(offset + direction) * SLOT_VW}vw`, opacity: 0, scale: 0.2 },
    center: {
      x: `${offset * SLOT_VW}vw`,
      opacity: active ? 1 : 0.3,
      scale: active ? 1 : 0.34,
    },
    exit: (exitDirection: number) => ({
      x: `${(offset - exitDirection) * SLOT_VW}vw`,
      opacity: 0,
      scale: 0.2,
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
  const { trigger: triggerZoomTransition } = useZoomTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // stageRef é a área flex-1 que sobra pro globo (abaixo do nome, acima do
  // botão "Explorar"); wrapperRef é o quadrado em si, cujo tamanho em px é
  // calculado a partir do espaço do stage.
  const stageRef = useRef<HTMLDivElement>(null);
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
  // Cores atuais do globo (interpoladas a cada frame) e os alvos pros quais
  // elas devem convergir — mesmo esquema de easing do phi/theta, só que pra
  // cor, já que globe.update() troca a cor na hora (sem transição própria).
  const baseColorRef = useRef<[number, number, number]>(DEFAULT_BASE_COLOR);
  const targetBaseColorRef =
    useRef<[number, number, number]>(DEFAULT_BASE_COLOR);
  const glowColorRef = useRef<[number, number, number]>(DEFAULT_GLOW_COLOR);
  const targetGlowColorRef =
    useRef<[number, number, number]>(DEFAULT_GLOW_COLOR);

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

  // Tamanho do globo = o menor entre largura e altura disponíveis no
  // CONTENT-BOX do stage (clientWidth/clientHeight menos o padding do
  // próprio stage — px-4/sm:px-6 e pb-20/sm:pb-28), capado em
  // GLOBE_MAX_SIZE, aplicado como width/height explícitos (px) no wrapper.
  // Precisa subtrair o padding: clientWidth/clientHeight já incluem padding,
  // mas o flexbox só reserva pro item (wrapper) o espaço do content-box no
  // eixo principal — sem subtrair, pedíamos um width maior do que o
  // disponível e o flex-shrink espremia só a largura (a altura, por ser o
  // eixo cruzado, não encolhe da mesma forma), achatando o globo.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const wrapper = wrapperRef.current;
    if (!stage || !wrapper) return;

    function updateSize() {
      if (!stage || !wrapper) return;
      const stageStyle = getComputedStyle(stage);
      const paddingX =
        parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
      const paddingY =
        parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom);
      const size = Math.min(
        stage.clientWidth - paddingX,
        stage.clientHeight - paddingY,
        GLOBE_MAX_SIZE,
      );
      wrapper.style.width = `${size}px`;
      wrapper.style.height = `${size}px`;
      widthRef.current = size;
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;

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
      baseColor: DEFAULT_BASE_COLOR,
      markerColor: [0.894, 0.863, 0.784],
      glowColor: DEFAULT_GLOW_COLOR,
      markerElevation: 0,
      markers,
    });

    // cobe v2 não tem callback onRender — a animação é conduzida chamando
    // globe.update() a cada frame. Essa mesma chamada já recalcula os
    // anchors dos marcadores, então as labels HTML acompanham o giro sozinhas.
    let frameId = requestAnimationFrame(function animate() {
      if (!pointerRef.current.down && targetRef.current) {
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
      }
      baseColorRef.current = baseColorRef.current.map(
        (channel, i) =>
          channel + (targetBaseColorRef.current[i] - channel) * COLOR_EASING,
      ) as [number, number, number];
      glowColorRef.current = glowColorRef.current.map(
        (channel, i) =>
          channel + (targetGlowColorRef.current[i] - channel) * COLOR_EASING,
      ) as [number, number, number];

      globeRef.current?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
        baseColor: baseColorRef.current,
        glowColor: glowColorRef.current,
      });
      frameId = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(frameId);
      globeRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só cria o globo uma vez; markers atualizam via effect abaixo
  }, []);

  useEffect(() => {
    globeRef.current?.update({ markers });
  }, [markers]);

  // Tema dinâmico por lugar: sobrescreve --background/--accent em :root
  // enquanto o local em foco tiver cor definida, com crossfade via CSS
  // (transition em app/globals.css). Escrever em documentElement (não só no
  // escopo da página) é proposital — o nav global também deve re-temar, já
  // que ele não tem fundo próprio (é transparente sobre o body). Sem cor
  // definida, cai de volta pro tema padrão do site.
  useEffect(() => {
    const place = places.find((item) => item.tag.id === selectedId) ?? null;
    const root = document.documentElement;

    if (place?.tag.colorBg)
      root.style.setProperty("--background", place.tag.colorBg);
    else root.style.removeProperty("--background");

    if (place?.tag.colorAccent)
      root.style.setProperty("--accent", place.tag.colorAccent);
    else root.style.removeProperty("--accent");

    targetBaseColorRef.current = place?.tag.colorBg
      ? hexToRgb01(place.tag.colorBg)
      : DEFAULT_BASE_COLOR;
    targetGlowColorRef.current = place?.tag.colorAccent
      ? hexToRgb01(place.tag.colorAccent)
      : DEFAULT_GLOW_COLOR;

    return () => {
      root.style.removeProperty("--background");
      root.style.removeProperty("--accent");
    };
  }, [selectedId, places]);

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
    const currentIndex = places.findIndex(
      (place) => place.tag.id === selectedId,
    );
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

  const activePlace =
    places.find((place) => place.tag.id === selectedId) ?? null;
  const activeIndex = places.findIndex((place) => place.tag.id === selectedId);
  const baseIndex = activeIndex === -1 ? 0 : activeIndex;

  // Janela de 3 slots do trilho (-1 anterior, 0 atual, 1 próximo). Com 1 ou 2
  // locais no total, offsets diferentes podem cair no mesmo local — dedup por
  // id pra não repetir key no AnimatePresence. Prioriza o offset 0 (centro)
  // quando há duplicata: com só 1 local, os três offsets caem no mesmo
  // local, e manter o -1 (em vez do 0) deixava o nome deslocado pra
  // esquerda e com opacidade reduzida (estilo dos slots não-centrais).
  const slotOffsetByPlaceId = new Map<number, number>();
  for (const offset of [0, -1, 1]) {
    const place = places[(baseIndex + offset + places.length) % places.length];
    if (!slotOffsetByPlaceId.has(place.tag.id)) {
      slotOffsetByPlaceId.set(place.tag.id, offset);
    }
  }
  const trackSlots =
    places.length === 0
      ? []
      : [-1, 0, 1]
          .map((offset) => ({
            offset,
            place: places[(baseIndex + offset + places.length) % places.length],
          }))
          .filter(({ offset, place }) => slotOffsetByPlaceId.get(place.tag.id) === offset);

  return (
    <div className="flex h-[100svh] flex-col">
      {places.length === 0 ? (
        <p className="flex-1 p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          nenhum local com coordenadas ainda
        </p>
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 pt-24 sm:pt-32">
            <div className="relative h-20 overflow-hidden sm:h-28 md:h-32">
              <AnimatePresence
                custom={slideDirectionRef.current}
                initial={false}
              >
                {trackSlots.map(({ offset, place }) => (
                  <motion.button
                    key={place.tag.id}
                    custom={slideDirectionRef.current}
                    variants={slotVariants(offset, slideDirectionRef.current)}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                    onClick={() => focusPlace(place)}
                    className={`absolute inset-0 flex items-center justify-center whitespace-nowrap px-4 text-center font-display tracking-tight transition-colors duration-500 text-4xl sm:text-6xl md:text-7xl ${
                      offset === 0
                        ? "z-10 text-accent"
                        : "text-accent/30 hover:text-accent/60"
                    }`}
                  >
                    {place.tag.name}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div
            ref={stageRef}
            className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-20 sm:px-6 sm:pb-28"
          >
            <button
              onClick={() => focusPlaceByOffset(-1)}
              aria-label="Local anterior"
              className="absolute left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 text-accent transition-colors duration-500 hover:border-accent sm:left-6 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div ref={wrapperRef} className="relative touch-none">
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
              className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 text-accent transition-colors duration-500 hover:border-accent sm:right-6 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {activePlace && (
              <div className="absolute bottom-8 z-10 flex justify-center sm:bottom-12">
                <Link
                  href={`/mapa/${encodeURIComponent(activePlace.tag.name)}`}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    triggerZoomTransition(
                      `/mapa/${encodeURIComponent(activePlace.tag.name)}`,
                    );
                  }}
                  className="rounded-full border border-accent bg-transparent px-8 py-3 font-mono text-sm uppercase tracking-widest text-accent transition-colors duration-300 hover:bg-accent hover:text-background"
                >
                  Explorar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
