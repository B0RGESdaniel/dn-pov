"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ColorTagGroup } from "@/lib/db/tags";
import { useColorTransition } from "@/components/color-transition";

interface ColorGridProps {
  colors: ColorTagGroup[];
}

// Mesmo delay em cascata do PhotoMasonry (components/photo-masonry.tsx) ao
// entrar na tela — aqui não precisa de ciclo/módulo porque a lista de cores
// não tem scroll infinito.
const STAGGER_STEP = 0.05;

// Cursor de conta-gotas (color picker) ao passar por cima de um quadrado de
// cor — path real do ícone "pipette" do Lucide (ISC), com contorno branco
// por baixo do preto pra ficar visível em qualquer colorBg. Hotspot na
// ponta do pingo (canto inferior esquerdo do ícone, escalado do viewBox
// 24x24 original pro tamanho renderizado de 22x22).
const PIPETTE_PATHS = [
  "m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12",
  "m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z",
  "m2 22 .414-.414",
];
const COLOR_PICKER_CURSOR_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none'><g stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'>${PIPETTE_PATHS.map((d) => `<path d='${d}'/>`).join("")}</g><g stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${PIPETTE_PATHS.map((d) => `<path d='${d}'/>`).join("")}</g></svg>`;

const COLOR_PICKER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(COLOR_PICKER_CURSOR_SVG)}") 2 20, pointer`;

export function ColorGrid({ colors }: ColorGridProps) {
  if (colors.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p
          className="text-center font-display text-2xl uppercase tracking-widest sm:text-3xl"
          style={{ color: "#2563eb" }}
        >
          nenhuma cor cadastrada ainda
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-20 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:pt-24 md:grid-cols-4">
      {colors.map(({ tag }, index) => (
        <ColorSwatch key={tag.id} tag={tag} index={index} />
      ))}
    </div>
  );
}

function ColorSwatch({
  tag,
  index,
}: {
  tag: ColorTagGroup["tag"];
  index: number;
}) {
  const { trigger } = useColorTransition();
  const [clicked, setClicked] = useState(false);
  const href = `/cor/${encodeURIComponent(tag.name)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: index * STAGGER_STEP,
      }}
    >
      <Link
        href={href}
        onClick={(event) => {
          // Cliques com modificador (nova aba, etc.) seguem o comportamento
          // nativo do Link — só interceptamos o clique "normal" pra tocar a
          // animação antes de navegar de verdade.
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          setClicked(true);
          trigger(
            event.currentTarget.getBoundingClientRect(),
            tag.colorBg,
            href,
          );
        }}
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-sm border-2 border-black shadow-[8px_8px_0_0_#000] transition-all duration-150 hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
        style={{ backgroundColor: tag.colorBg, cursor: COLOR_PICKER_CURSOR }}
      >
        <span
          className={`relative z-10 font-display text-xl tracking-tight transition-opacity duration-150 sm:text-2xl ${
            clicked ? "opacity-0" : "opacity-100"
          }`}
          style={{ color: tag.colorAccent }}
        >
          {tag.name.toUpperCase()}
        </span>
      </Link>
    </motion.div>
  );
}
