"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface ActiveColor {
  colorBg: string;
  colorAccent: string;
}

interface ColorThemeContextValue {
  setActiveColor: (color: ActiveColor) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

// Vive no layout de /cor (não no grid nem no hero), então sobrevive à
// navegação client-side entre /cor e /cor/[nome] — o tema não reseta nesse
// meio, só quando você sai da seção de cor inteira (layout desmonta).
export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [active, setActiveColor] = useState<ActiveColor | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (active) {
      root.style.setProperty("--background", active.colorBg);
      root.style.setProperty("--accent", active.colorAccent);
    }

    return () => {
      root.style.removeProperty("--background");
      root.style.removeProperty("--accent");
    };
  }, [active]);

  return (
    <ColorThemeContext.Provider value={{ setActiveColor }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useSetActiveColor() {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) {
    throw new Error("useSetActiveColor deve ser usado dentro de ColorThemeProvider");
  }
  return ctx.setActiveColor;
}
