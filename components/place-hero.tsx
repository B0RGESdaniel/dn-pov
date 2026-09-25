"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "motion/react";

interface PlaceHeroProps {
  name: string;
  count: number;
  cover: {
    thumbUrl: string;
    blurDataUrl: string | null;
  } | null;
  prevName: string;
  nextName: string;
}

// Distância extra de scroll (em vh), além da altura do hero, reservada pro
// zoom/blur/fade completar antes do masonry (próxima seção do documento)
// entrar em cena — mesmo padrão do exemplo "Scroll Zoom Hero" do motion.dev:
// https://examples.motion.dev/react/scroll-zoom-hero
const SCROLL_RANGE_VH = 70;

export function PlaceHero({ name, count, cover, prevName, nextName }: PlaceHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // scrollYProgress vai de 0 (topo do container, hero recém entrou) a 1
  // (fim do container, masonry prestes a assumir o scroll) — puramente
  // amarrado ao scroll nativo, sem estado: rolar pra cima reverte tudo.
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
      style={{ height: `calc(100svh - 3rem + ${SCROLL_RANGE_VH}vh)` }}
    >
      <div className="sticky top-12 h-[calc(100svh-3rem)] w-full">
        <motion.div
          style={{ opacity: cardOpacity }}
          className="relative h-full w-full overflow-hidden bg-surface"
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
                  className="object-cover"
                  sizes="100vw"
                  placeholder={cover.blurDataUrl ? "blur" : undefined}
                  blurDataURL={cover.blurDataUrl ?? undefined}
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4 text-center text-white">
            <p className="font-mono text-xs uppercase tracking-widest text-white/70 sm:text-sm">
              my perspective of
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
                href={`/local/${encodeURIComponent(prevName)}`}
                aria-label={`Local anterior: ${prevName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 font-mono text-base text-white/70 transition-colors hover:border-white hover:text-white sm:h-11 sm:w-11 sm:text-lg"
              >
                ←
              </Link>

              <Link
                href={`/local/${encodeURIComponent(nextName)}`}
                aria-label={`Próximo local: ${nextName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 font-mono text-base text-white/70 transition-colors hover:border-white hover:text-white sm:h-11 sm:w-11 sm:text-lg"
              >
                →
              </Link>
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
              {count} {count === 1 ? "foto" : "fotos"}
            </p>
          </div>

          <a
            href="#fotos"
            className="absolute inset-x-0 bottom-4 mx-auto w-max font-mono text-[10px] uppercase tracking-widest text-white/60 transition-colors hover:text-white sm:bottom-8"
          >
            ver fotos ↓
          </a>
        </motion.div>
      </div>
    </div>
  );
}
