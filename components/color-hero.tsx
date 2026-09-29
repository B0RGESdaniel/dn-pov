"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import { useSetActiveColor } from "@/components/color-theme-context";

interface ColorHeroProps {
  name: string;
  colorBg: string;
  colorAccent: string;
  count: number;
  cover: {
    thumbUrl: string;
    blurDataUrl: string | null;
  } | null;
  prevName: string;
  nextName: string;
}

// Mesmo esquema de scroll (zoom/blur/fade) do PlaceHero — ver
// components/place-hero.tsx pro link do exemplo original.
const SCROLL_RANGE_VH = 70;

export function ColorHero({
  name,
  colorBg,
  colorAccent,
  count,
  cover,
  prevName,
  nextName,
}: ColorHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setActiveColor = useSetActiveColor();

  // Retema a UI pra essa cor ao montar e a cada troca pelas setas — cobre
  // tanto quem chegou pelo grid (já retemado) quanto quem cai direto na URL.
  useEffect(() => {
    setActiveColor({ colorBg, colorAccent });
  }, [colorBg, colorAccent, setActiveColor]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const blurPx = useTransform(scrollYProgress, [0, 1], [0, 16]);
  const imageFilter = useTransform(blurPx, (value) => `blur(${value}px)`);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `calc(100svh + ${SCROLL_RANGE_VH}vh)` }}
    >
      <div className="sticky top-0 h-[100svh] w-full">
        <motion.div
          style={{ opacity: cardOpacity, backgroundColor: colorBg }}
          className="relative h-full w-full overflow-hidden"
        >
          <AnimatePresence>
            {cover && (
              <motion.div
                key={name}
                style={{ scale: imageScale, filter: imageFilter }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Image
                  src={cover.thumbUrl}
                  alt={name}
                  fill
                  className="object-cover opacity-40"
                  sizes="100vw"
                  placeholder={cover.blurDataUrl ? "blur" : undefined}
                  blurDataURL={cover.blurDataUrl ?? undefined}
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4 text-center"
            style={{ color: colorAccent }}
          >
            <p className="font-mono text-xs uppercase tracking-widest opacity-70 sm:text-sm">
              fotos na cor
            </p>

            <AnimatePresence mode="popLayout">
              <motion.h1
                key={name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="min-w-[8ch] font-display text-5xl tracking-tight sm:text-7xl"
              >
                {name}
              </motion.h1>
            </AnimatePresence>

            <div className="flex items-center gap-5 sm:gap-8">
              <Link
                href={`/cor/${encodeURIComponent(prevName)}`}
                aria-label={`Cor anterior: ${prevName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border font-mono text-base opacity-70 transition-opacity hover:opacity-100 sm:h-11 sm:w-11 sm:text-lg"
                style={{ borderColor: colorAccent }}
              >
                ←
              </Link>

              <Link
                href={`/cor/${encodeURIComponent(nextName)}`}
                aria-label={`Próxima cor: ${nextName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border font-mono text-base opacity-70 transition-opacity hover:opacity-100 sm:h-11 sm:w-11 sm:text-lg"
                style={{ borderColor: colorAccent }}
              >
                →
              </Link>
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">
              {count} {count === 1 ? "foto" : "fotos"}
            </p>
          </div>

          <a
            href="#fotos"
            className="absolute inset-x-0 bottom-4 mx-auto w-max font-mono text-[10px] uppercase tracking-widest opacity-60 transition-opacity hover:opacity-100 sm:bottom-8"
            style={{ color: colorAccent }}
          >
            ver fotos ↓
          </a>
        </motion.div>
      </div>
    </div>
  );
}
