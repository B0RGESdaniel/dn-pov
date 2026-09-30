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
import { animate, motion } from "motion/react";

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

const GROW_DURATION = 1.4;
const REVEAL_DURATION = 0.45;
// Easing lento-no-início: a mancha ainda tá pequena no começo (dando tempo
// do nome sumir primeiro) e só depois acelera até cobrir a tela. Menos
// "achatado" que um easeIn clássico pra o intervalo até a mancha aparecer
// não ficar longo demais depois do texto já ter sumido.
const GROW_EASE = [0.3, 0, 0.7, 0] as const;
// Pausa curta depois que a mancha já cobre a tela e a rota já trocou, antes
// do fade — só pra não parecer um corte seco.
const HOLD_BEFORE_REVEAL = 100;

// Quantidade de pontos ao redor do círculo e o quanto cada um foge do raio
// "perfeito" — mesma ideia de qualquer gerador de blob orgânico (pontos
// espaçados igualmente, raio de cada um levemente aleatório, conectados por
// uma curva suave). Esse desvio por ângulo é sorteado UMA vez por clique, não
// recalculado a cada frame — só o raio cresce, então o custo por frame é só
// recompor ~10 pontos e uma string de path, nada de ruído recalculado.
const BLOB_POINTS = 10;
const BLOB_AMPLITUDE = 0.28;

interface Point {
  x: number;
  y: number;
}

// Curva fechada suave por Catmull-Rom -> Bézier (tensão uniforme, fator 1/6)
// — a mesma fórmula usada por geradores de blob SVG pra passar uma curva
// suave por um conjunto de pontos.
function smoothClosedPath(points: Point[]) {
  let d = `M ${points[0].x},${points[0].y} `;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} `;
  }
  return `${d}Z`;
}

function blobPath(cx: number, cy: number, radius: number, bumps: number[]) {
  const points = bumps.map((bump, i) => {
    const angle = (i / bumps.length) * Math.PI * 2;
    const r = radius * bump;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  return smoothClosedPath(points);
}

type Phase = "growing" | "revealing";

// Mancha de tinta (SVG path orgânico, ver blobPath acima) que nasce do
// quadrado clicado em ColorGrid e cresce até cobrir a tela na cor daquela
// tag, antes da navegação revelar a página de destino. O `d` do path é
// atualizado direto no DOM via ref a cada frame (não por state do React) —
// uma animação de path a 60fps não precisa, e não deveria, re-renderizar a
// árvore React inteira a cada frame.
//
// Vive no layout de (site), que não desmonta ao trocar de rota, então o
// componente sobrevive à navegação pra poder animar a saída.
//
// A navegação de verdade (router.push) só acontece quando a mancha já cobre
// a tela inteira — se deixássemos o <Link> navegar sozinho, o Next troca o
// conteúdo da rota assim que o fetch terminar (que pode ser mais rápido que
// a animação), e a página de destino aparecia nas bordas ainda não
// cobertas. Segurando o push até o fim do crescimento, a troca acontece
// inteira por baixo do overlay já opaco. O crescimento sempre termina antes
// de poder revelar — a troca de rota só marca `routeReady`; quem decide
// iniciar o fade é o fim do crescimento (ou o efeito de pathname, se a rota
// já tiver trocado nesse meio-tempo).
export function ColorTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);
  const pendingReveal = useRef(false);
  const routeReady = useRef(false);
  const growDone = useRef(false);
  const hrefRef = useRef<string | null>(null);
  const originRef = useRef<Point>({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);
  const bumpsRef = useRef<number[]>([]);
  const pathRef = useRef<SVGPathElement | null>(null);

  const [color, setColor] = useState<string | null>(null);
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

      const cx = sourceRect.left + sourceRect.width / 2;
      const cy = sourceRect.top + sourceRect.height / 2;
      const width = window.innerWidth;
      const height = window.innerHeight;

      originRef.current = { x: cx, y: cy };
      const cornerDistance = Math.hypot(
        Math.max(cx, width - cx),
        Math.max(cy, height - cy),
      );
      // Cada braço do blob pode ficar até BLOB_AMPLITUDE menor que o raio
      // "perfeito" (ver bumpsRef abaixo) — sem essa margem, um braço curto
      // apontando pro canto mais distante deixa um pedaço da tela
      // descoberto (o "glitch" antes de trocar de página).
      maxRadiusRef.current = cornerDistance / (1 - BLOB_AMPLITUDE);
      bumpsRef.current = Array.from(
        { length: BLOB_POINTS },
        () => 1 + (Math.random() * 2 - 1) * BLOB_AMPLITUDE,
      );

      setColor(tagColor);
      setIsTransitioning(true);
      setPhase("growing");

      animate(0, maxRadiusRef.current, {
        duration: GROW_DURATION,
        ease: GROW_EASE,
        onUpdate: (radius) => {
          pathRef.current?.setAttribute(
            "d",
            blobPath(originRef.current.x, originRef.current.y, radius, bumpsRef.current),
          );
        },
        onComplete: () => {
          growDone.current = true;
          if (hrefRef.current) router.push(hrefRef.current);
          if (routeReady.current) startReveal();
        },
      });
    },
    [router, startReveal],
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
      {color && phase && (
        <motion.svg
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          width="100%"
          height="100%"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "revealing" ? 0 : 1 }}
          transition={{ duration: REVEAL_DURATION, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (phase !== "revealing") return;

            setPhase(null);
            setColor(null);
            setIsTransitioning(false);
            pendingReveal.current = false;
            routeReady.current = false;
            growDone.current = false;
          }}
        >
          <path ref={pathRef} fill={color} />
        </motion.svg>
      )}
    </ColorTransitionContext.Provider>
  );
}
