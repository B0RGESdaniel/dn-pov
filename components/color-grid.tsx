"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ColorAlbum } from "@/lib/db";

interface ColorGridProps {
  colors: ColorAlbum[];
}

export function ColorGrid({ colors }: ColorGridProps) {
  if (colors.length === 0) {
    return (
      <p className="p-8 pt-24 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma cor cadastrada ainda
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-20 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:pt-24 md:grid-cols-4">
      {colors.map(({ tag }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          className="relative block aspect-square overflow-hidden rounded-sm border-2 border-black shadow-[8px_8px_0_0_#000] transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_#000]"
        >
          {/* layoutId compartilhado com o hero de components/color-hero.tsx —
              o Motion faz o FLIP entre este quadrado e o hero da página de
              destino automaticamente na troca de rota, sem precisar de
              AnimatePresence (o App Router mantém esta página montada até a
              próxima estar pronta, então o nó com este layoutId nunca some
              antes do novo aparecer). */}
          <motion.div
            layoutId={`color-swatch-${tag.id}`}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: tag.colorBg }}
          >
            <div
              aria-hidden
              className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-50"
            />
            <span
              className="relative z-10 font-display text-xl tracking-tight sm:text-2xl"
              style={{ color: tag.colorAccent }}
            >
              {tag.name.toUpperCase()}
            </span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
