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

interface ColorTransitionContextValue {
  trigger: (rect: DOMRect, color: string, href: string) => void;
  isTransitioning: boolean;
}

const ColorTransitionContext = createContext<ColorTransitionContextValue | null>(null);

export function useColorTransition() {
  const ctx = useContext(ColorTransitionContext);
  if (!ctx) {
    throw new Error("useColorTransition must be used within ColorTransitionProvider");
  }
  return ctx;
}

const GROW_DURATION = 0.7;
const REVEAL_DURATION = 0.35;
// Easing lento-no-início: o quadrado ainda parece "do tamanho normal" no
// começo (dando tempo do nome sumir primeiro) e só depois acelera até
// cobrir a tela.
const GROW_EASE = [0.7, 0, 0.84, 0] as const;
// Pausa curta depois que o quadrado já cobre a tela e a rota já trocou,
// antes do fade — só pra não parecer um corte seco.
const HOLD_BEFORE_REVEAL = 100;

type Phase = "growing" | "revealing";

// Overlay persistente (vive no layout de (site), sobrevive à troca de rota)
// que assume a posição/tamanho exatos do quadrado clicado em ColorGrid e
// cresce via transform (translate + scale, não width/height — GPU, sem
// reflow) até cobrir a tela na cor daquela tag. Quando a página de destino
// já estiver montada (mesmo colorBg de fundo via TagTheme), só um fade de
// opacidade revela o conteúdo — sem encolher de volta, que ficava parecendo
// um resquício da animação depois que a navegação já tinha acontecido.
//
// A navegação de verdade (router.push) só acontece quando o quadrado já
// cobre a tela inteira — se deixássemos o <Link> navegar sozinho, o Next
// troca o conteúdo da rota assim que o fetch terminar (que pode ser mais
// rápido que a animação), e a página de destino aparecia nas bordas ainda
// não cobertas pelo quadrado. Segurando o push até o fim do crescimento, a
// troca acontece inteira por baixo do overlay já opaco.
export function ColorTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);
  const pendingReveal = useRef(false);
  const routeReady = useRef(false);
  const growDone = useRef(false);
  const hrefRef = useRef<string | null>(null);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [phase, setPhase] = useState<Phase | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startReveal = useCallback(() => {
    setTimeout(() => setPhase("revealing"), HOLD_BEFORE_REVEAL);
  }, []);

  const trigger = useCallback<ColorTransitionContextValue["trigger"]>(
    (sourceRect, tagColor, href) => {
      pendingReveal.current = true;
      routeReady.current = false;
      growDone.current = false;
      hrefRef.current = href;

      setRect(sourceRect);
      setColor(tagColor);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setIsTransitioning(true);
      setPhase("growing");
    },
    [],
  );

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    if (!pendingReveal.current) return;

    routeReady.current = true;
    if (growDone.current) startReveal();
  }, [pathname, startReveal]);

  return (
    <ColorTransitionContext.Provider value={{ trigger, isTransitioning }}>
      {children}
      {rect && color && phase && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-30 h-full w-full"
          style={{ backgroundColor: color, transformOrigin: "0 0" }}
          initial={{
            x: rect.left,
            y: rect.top,
            scaleX: rect.width / (viewport.width || rect.width || 1),
            scaleY: rect.height / (viewport.height || rect.height || 1),
            opacity: 1,
          }}
          animate={{
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: phase === "revealing" ? 0 : 1,
          }}
          transition={
            phase === "growing"
              ? { duration: GROW_DURATION, ease: GROW_EASE }
              : { duration: REVEAL_DURATION, ease: "easeInOut" }
          }
          onAnimationComplete={() => {
            if (phase === "growing") {
              growDone.current = true;
              if (hrefRef.current) router.push(hrefRef.current);
              if (routeReady.current) startReveal();
              return;
            }

            setPhase(null);
            setRect(null);
            setColor(null);
            setIsTransitioning(false);
            pendingReveal.current = false;
            routeReady.current = false;
            growDone.current = false;
          }}
        />
      )}
    </ColorTransitionContext.Provider>
  );
}
