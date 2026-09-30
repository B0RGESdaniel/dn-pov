"use client";

import { CSSProperties, useEffect } from "react";
import Link from "next/link";
import { motion, stagger, useAnimate } from "motion/react";

import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { Photo } from "@/types/photo";

interface HomeHeroProps {
  photos: Photo[];
}

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

function photoAlt(photo: Photo): string {
  return photo.tags.map((tag) => tag.name).join(", ") || "Foto";
}

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

// Preserva a proporção real da foto (evita crop forçado do object-cover
// numa caixa de dimensões fixas) — cai pra object-cover só se faltar
// metadado de width/height.
function aspectStyle(photo?: Photo): CSSProperties | undefined {
  if (!photo?.width || !photo?.height) return undefined;
  return { aspectRatio: `${photo.width} / ${photo.height}` };
}

export function HomeHero({ photos }: HomeHeroProps) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      "img",
      { opacity: [0, 1] },
      { duration: 0.5, delay: stagger(0.15) },
    );
  }, [animate]);

  return (
    <div
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background"
      ref={scope}
    >
      <motion.div
        className="z-50 flex flex-col items-center space-y-5 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.88, delay: 1.5 }}
      >
        <div className="space-y-4">
          <p className="font-display text-5xl text-foreground md:text-7xl">
            dn-pov.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            acervo pessoal
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
      {/* mural sp */}
      <Floating sensitivity={-1} className="overflow-hidden">
        <FloatingElement depth={0.5} className="top-[6%] left-[17%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[0]?.thumbUrl}
            alt={photos[0] ? photoAlt(photos[0]) : ""}
            style={aspectStyle(photos[0])}
            className="h-auto w-24 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-40"
          />
        </FloatingElement>

        {/* arnaldo quintela */}
        <FloatingElement
          depth={1}
          className="top-[26%] left-[25%] md:left-[35%] md:top-[16%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[1]?.thumbUrl}
            alt={photos[1] ? photoAlt(photos[1]) : ""}
            style={aspectStyle(photos[1])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-44"
          />
        </FloatingElement>

        {/* escada vaticano */}
        <FloatingElement depth={2} className="top-[2%] left-[53%] md:top-[9%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[2]?.thumbUrl}
            alt={photos[2] ? photoAlt(photos[2]) : ""}
            style={aspectStyle(photos[2])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-56"
          />
        </FloatingElement>

        {/* ponte */}
        <FloatingElement
          depth={1}
          className="top-[30%] left-[78%] md:left-[78%] md:top-[25%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[3]?.thumbUrl}
            alt={photos[3] ? photoAlt(photos[3]) : ""}
            style={aspectStyle(photos[3])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-48"
          />
        </FloatingElement>

        {/* menina */}
        <FloatingElement depth={1} className="top-[42%] left-[9%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[4]?.thumbUrl}
            alt={photos[4] ? photoAlt(photos[4]) : ""}
            style={aspectStyle(photos[4])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-52"
          />
        </FloatingElement>

        {/* nfl */}
        <FloatingElement
          depth={2}
          className="top-[74%] left-[73%] md:top-[57%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[7]?.thumbUrl}
            alt={photos[7] ? photoAlt(photos[7]) : ""}
            style={aspectStyle(photos[7])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-52"
          />
        </FloatingElement>

        {/* torre eiffel */}
        <FloatingElement
          depth={4}
          className="top-[75%] left-[10%] md:left-[15%] md:top-[65%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[5]?.thumbUrl}
            alt={photos[5] ? photoAlt(photos[5]) : ""}
            style={aspectStyle(photos[5])}
            className="h-auto w-36 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-56"
          />
        </FloatingElement>

        {/* porto */}
        <FloatingElement
          depth={1}
          className="top-[62%] left-[50%] md:top-[70%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[6]?.thumbUrl}
            alt={photos[6] ? photoAlt(photos[6]) : ""}
            style={aspectStyle(photos[6])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-48"
          />
        </FloatingElement>
      </Floating>
    </div>
  );
}
