"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

const DESTINATIONS = [
  {
    href: "/mural",
    label: "MURAL",
    className:
      "bg-accent text-background font-fraunces font-semibold normal-case",
  },
  {
    href: "/mapa",
    label: "MAPA",
    className:
      "relative overflow-hidden bg-[#4073d9] text-foreground text-3xl font-bold",
  },
  {
    href: "/cor",
    label: "CORES",
    className:
      "text-black font-display text-5xl tracking-tight uppercase border-2 border-black",
  },
  {
    href: "/memorias",
    label: "MEMÓRIAS",
    className:
      "relative overflow-hidden text-foreground font-handwritten text-4xl normal-case",
  },
] as const;

// Mesmo fundo de /cor (components/color-page-shell.tsx): cinza claro +
// grid de linhas azuis, só que numa escala menor pra caber no botão.
const CorGridBackground: CSSProperties = {
  backgroundColor: "#e9e9e9",
  backgroundImage:
    "linear-gradient(to right, rgba(37, 99, 235, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.3) 1px, transparent 1px)",
  backgroundSize: "14px 14px",
};

// Mesmo fundo de /memorias (app/(site)/memorias/page.tsx): cor sólida de
// cortiça — o ruído por cima entra à parte, via .noise-texture (precisa
// de um elemento próprio pro mix-blend-overlay funcionar).
const MemoriasBackground: CSSProperties = { backgroundColor: "#ba8345" };

const BUTTON_BACKGROUNDS: Record<string, CSSProperties> = {
  "/cor": CorGridBackground,
  "/memorias": MemoriasBackground,
};

// Letra a letra, cada uma com sua cor + text-shadow duro (sem blur), no
// mesmo espírito neobrutalist dos quadrados de components/color-grid.tsx.
// Mesmos colorAccent das tags reais de /cor (scripts/seed-colors.ts):
// vermelho, verde, azul, amarelo, rosa.
const CorLetterColors = ["#f87171", "#4ade80", "#60a5fa", "#fbbf24", "#FC9CCE"];

function CorLabel({ label }: { label: string }) {
  return (
    <span className="flex">
      {label
        .toUpperCase()
        .split("")
        .map((char, index) => (
          <span
            key={index}
            style={{
              color: CorLetterColors[index % CorLetterColors.length],
              textShadow: "3px 3px 0 #000",
            }}
          >
            {char}
          </span>
        ))}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Sombra estilo stencil (relevo deslocado) que muda de projeção conforme o
// mouse se move pela tela — como se a luz viesse da posição do cursor e a
// sombra do texto fosse empurrada pro lado oposto. Várias camadas do mesmo
// deslocamento (em frações crescentes) simulam a extrusão/profundidade, em
// vez de um único offset chapado.
const PERSPECTIVE_SHADOW_COLOR = "#e4dcc8";
const PERSPECTIVE_LAYERS = 6;

function usePointerPerspectiveShadow(maxOffset: number) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shadow, setShadow] = useState(
    `${maxOffset}px ${maxOffset}px 0 ${PERSPECTIVE_SHADOW_COLOR}`,
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Sombra projetada pro lado oposto do cursor (luz "vem" do mouse).
      const dx = clamp(
        ((centerX - event.clientX) / (window.innerWidth / 2)) * maxOffset,
        -maxOffset,
        maxOffset,
      );
      const dy = clamp(
        ((centerY - event.clientY) / (window.innerHeight / 2)) * maxOffset,
        -maxOffset,
        maxOffset,
      );

      const layers = Array.from({ length: PERSPECTIVE_LAYERS }, (_, i) => {
        const t = (i + 1) / PERSPECTIVE_LAYERS;
        return `${dx * t}px ${dy * t}px 0 ${PERSPECTIVE_SHADOW_COLOR}`;
      }).join(", ");

      setShadow(layers);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [maxOffset]);

  return { ref, shadow };
}

export function HomeHero() {
  const { ref: perspectiveRef, shadow: perspectiveShadow } =
    usePointerPerspectiveShadow(14);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      <motion.div
        className="z-50 flex flex-col items-center space-y-5 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.88, delay: 1.5 }}
      >
        <div className="space-y-1">
          <p className="font-display text-2xl text-foreground md:text-4xl">
            It&apos;s all about
          </p>
          <p
            ref={perspectiveRef}
            className="font-display text-5xl uppercase tracking-[0.08em] text-background md:text-7xl"
            style={{ textShadow: perspectiveShadow }}
          >
            perspective
          </p>
        </div>

        <nav className="flex flex-col items-center gap-3">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              style={BUTTON_BACKGROUNDS[destination.href]}
              className={`flex h-16 w-64 items-center justify-center px-8 text-2xl tracking-widest transition-transform hover:scale-105 md:w-72 ${destination.className}`}
            >
              {destination.href === "/memorias" && (
                <span
                  aria-hidden
                  className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-70"
                />
              )}
              {destination.href === "/mapa" && (
                <img
                  src="/earth.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-1/2 w-40 -translate-x-1/2 translate-y-[65%]"
                />
              )}
              <span
                className="relative z-10"
                style={
                  destination.href === "/mapa"
                    ? { textShadow: "2px 2px 0 rgba(0, 0, 0, 0.35)" }
                    : undefined
                }
              >
                {destination.href === "/cor" ? (
                  <CorLabel label={destination.label} />
                ) : (
                  destination.label
                )}
              </span>
            </Link>
          ))}
        </nav>
      </motion.div>
    </div>
  );
}
