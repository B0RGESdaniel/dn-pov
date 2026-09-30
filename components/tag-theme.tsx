"use client";

import { useEffect } from "react";

interface TagThemeProps {
  colorBg?: string | null;
  colorAccent?: string | null;
}

// Retema a UI pras cores de um local/cor em foco (mesma técnica de CSS vars
// de components/globe-map.tsx), sem exigir uma hero ou contexto entre rotas
// — só aplica enquanto a página que a monta estiver na tela, e volta pro
// tema padrão ao desmontar. `colorBg` e `colorAccent` são independentes
// (ex.: /memorias só sobrescreve o accent, pra dar contraste no nav sobre o
// fundo cortiça, sem mexer no --background do resto do app).
export function TagTheme({ colorBg, colorAccent }: TagThemeProps) {
  useEffect(() => {
    if (!colorBg && !colorAccent) return;

    const root = document.documentElement;
    if (colorBg) root.style.setProperty("--background", colorBg);
    if (colorAccent) root.style.setProperty("--accent", colorAccent);

    return () => {
      if (colorBg) root.style.removeProperty("--background");
      if (colorAccent) root.style.removeProperty("--accent");
    };
  }, [colorBg, colorAccent]);

  return null;
}
