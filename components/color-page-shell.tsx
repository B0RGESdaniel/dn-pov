"use client";

import { ReactNode } from "react";
import { useColorTransition } from "@/components/color-transition";

const GRID_LINES = `
  linear-gradient(to right, rgba(37, 99, 235, 0.3) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(37, 99, 235, 0.3) 1px, transparent 1px)
`;

interface ColorPageShellProps {
  children: ReactNode;
}

// Fundo de /cor: cinza claro fixo + linhas de grid azuis que desaparecem
// (opacity) assim que um quadrado é clicado, antes da mancha orgânica
// (components/color-transition.tsx) começar a crescer por cima.
export function ColorPageShell({ children }: ColorPageShellProps) {
  const { isTransitioning } = useColorTransition();

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#e9e9e9" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: GRID_LINES,
          backgroundSize: "40px 40px",
          opacity: isTransitioning ? 0 : 1,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
