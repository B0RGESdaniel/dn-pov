"use client";

import { useEffect } from "react";

interface TagThemeProps {
  colorBg: string | null;
  colorAccent: string | null;
}

// Retema a UI pras cores de um local/cor em foco (mesma técnica de CSS vars
// de components/globe-map.tsx), sem exigir uma hero ou contexto entre rotas
// — só aplica enquanto a página que a monta estiver na tela, e volta pro
// tema padrão ao desmontar. No-op quando o local/cor não tem cor definida.
export function TagTheme({ colorBg, colorAccent }: TagThemeProps) {
  useEffect(() => {
    if (!colorBg || !colorAccent) return;

    const root = document.documentElement;
    root.style.setProperty("--background", colorBg);
    root.style.setProperty("--accent", colorAccent);

    return () => {
      root.style.removeProperty("--background");
      root.style.removeProperty("--accent");
    };
  }, [colorBg, colorAccent]);

  return null;
}
