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
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

interface ZoomTransitionContextValue {
  trigger: (href: string) => void;
}

const ZoomTransitionContext = createContext<ZoomTransitionContextValue | null>(null);

export function useZoomTransition() {
  const ctx = useContext(ZoomTransitionContext);
  if (!ctx) {
    throw new Error("useZoomTransition must be used within ZoomTransitionProvider");
  }
  return ctx;
}

const ZOOM_SCALE = 4.5;
const ZOOM_OUT_DURATION = 0.85;
const REVEAL_DURATION = 0.7;

type Phase = "zooming" | "revealing" | null;

// Zoom uniforme de TODO o conteúdo (nav + página), centrado na tela —
// alternativa ao blob de ColorTransitionProvider pra rotas onde não faz
// sentido crescer a partir do ponto clicado. Mesmo esquema de estado (zoom ->
// troca de rota por baixo -> reveal), só que animando scale/opacity do
// próprio conteúdo em vez de um path SVG:
//
// 1. `trigger` dá zoom no conteúdo atual até ZOOM_SCALE, sumindo (opacity 0).
// 2. Quando o zoom termina, navega de verdade — a troca de rota acontece com
//    o conteúdo já invisível, então a página nova nunca aparece "crua".
// 3. Assim que a rota muda, revela a página nova encolhendo de volta pro
//    tamanho normal enquanto reaparece — dá a sensação de continuar
//    "mergulhando" até o destino, não só um corte.
export function ZoomTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);
  const pendingReveal = useRef(false);
  const routeReady = useRef(false);
  const zoomDone = useRef(false);
  const hrefRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>(null);

  const startReveal = useCallback(() => setPhase("revealing"), []);

  const trigger = useCallback<ZoomTransitionContextValue["trigger"]>((href) => {
    pendingReveal.current = true;
    routeReady.current = false;
    zoomDone.current = false;
    hrefRef.current = href;
    setPhase("zooming");
  }, []);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    if (!pendingReveal.current) return;

    routeReady.current = true;
    if (zoomDone.current) startReveal();
  }, [pathname, startReveal]);

  return (
    <ZoomTransitionContext.Provider value={{ trigger }}>
      <motion.div
        // `animate` só existe enquanto uma transição está em curso — fora
        // disso o motion.div não deve gerenciar `transform` (nem em scale(1)
        // "neutro"), porque isso criaria um containing block permanente pra
        // qualquer elemento `position: fixed` descendente em qualquer página
        // (ex.: a lightbox), quebrando o fullscreen dele mesmo sem nenhuma
        // transição de zoom rolando.
        style={{ transformOrigin: "50% 50%", pointerEvents: phase ? "none" : "auto" }}
        animate={
          phase === "zooming"
            ? { scale: ZOOM_SCALE, opacity: 0 }
            : phase === "revealing"
              ? { scale: 1, opacity: 1 }
              : undefined
        }
        transition={{
          duration: phase === "zooming" ? ZOOM_OUT_DURATION : REVEAL_DURATION,
          ease: phase === "zooming" ? [0.6, 0, 0.85, 0] : [0.16, 1, 0.3, 1],
        }}
        onAnimationComplete={() => {
          if (phase === "zooming") {
            zoomDone.current = true;
            if (hrefRef.current) router.push(hrefRef.current);
            if (routeReady.current) startReveal();
          } else if (phase === "revealing") {
            setPhase(null);
            pendingReveal.current = false;
            routeReady.current = false;
            zoomDone.current = false;
          }
        }}
      >
        {children}
      </motion.div>
    </ZoomTransitionContext.Provider>
  );
}
