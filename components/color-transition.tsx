"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

interface Origin {
  x: number;
  y: number;
}

type TriggerColorTransition = (origin: Origin, color: string) => void;

const ColorTransitionContext = createContext<TriggerColorTransition | null>(null);

export function useColorTransition() {
  const trigger = useContext(ColorTransitionContext);
  if (!trigger) {
    throw new Error("useColorTransition must be used within ColorTransitionProvider");
  }
  return trigger;
}

// Cortina circular (clip-path) que nasce do ponto clicado num quadrado de
// /cor e cobre a tela na cor daquela tag antes da navegação revelar a
// página de destino. Vive no layout de (site) — só o <children> remonta
// entre rotas, então o overlay sobrevive à troca de página pra poder animar
// a saída depois que o novo conteúdo já estiver montado.
export function ColorTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const pendingReveal = useRef(false);

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [covering, setCovering] = useState(false);
  const [radius, setRadius] = useState(0);

  const trigger = useCallback<TriggerColorTransition>((point, tagColor) => {
    const maxRadius = Math.hypot(
      Math.max(point.x, window.innerWidth - point.x),
      Math.max(point.y, window.innerHeight - point.y),
    );
    setOrigin(point);
    setColor(tagColor);
    setRadius(maxRadius);
    setCovering(true);
    pendingReveal.current = true;
  }, []);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    if (!pendingReveal.current) return;

    // Segura a cobertura por um instante pra não "piscar" caso a navegação
    // seja instantânea, aí recua revelando a página já montada por baixo.
    const timeout = setTimeout(() => {
      setCovering(false);
      pendingReveal.current = false;
    }, 150);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <ColorTransitionContext.Provider value={trigger}>
      {children}
      {origin && color && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          style={{ backgroundColor: color }}
          initial={{ clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }}
          animate={{
            clipPath: covering
              ? `circle(${radius}px at ${origin.x}px ${origin.y}px)`
              : `circle(0px at ${origin.x}px ${origin.y}px)`,
          }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={() => {
            if (!covering) {
              setOrigin(null);
              setColor(null);
            }
          }}
        />
      )}
    </ColorTransitionContext.Provider>
  );
}
