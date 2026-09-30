"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";
import { ColorAlbum } from "@/lib/db";

interface ColorHeroProps {
  tag: ColorAlbum["tag"];
  children: ReactNode;
}

// Recebe o layoutId do quadrado clicado em components/color-grid.tsx e o
// "resolve" numa faixa cheia no topo da página — o Motion faz o FLIP entre
// os dois automaticamente. O resto do conteúdo (masonry) só aparece depois,
// com um fade leve, pra não competir com o morph do quadrado.
export function ColorHero({ tag, children }: ColorHeroProps) {
  return (
    <div className="pt-16 sm:pt-20">
      <motion.div
        layoutId={`color-swatch-${tag.id}`}
        className="relative flex h-40 items-center justify-center overflow-hidden sm:h-56"
        style={{ backgroundColor: tag.colorBg }}
      >
        <div
          aria-hidden
          className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-50"
        />
        <span
          className="relative z-10 font-display text-3xl tracking-tight sm:text-5xl"
          style={{ color: tag.colorAccent }}
        >
          {tag.name.toUpperCase()}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
