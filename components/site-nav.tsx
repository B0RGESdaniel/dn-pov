"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Eye } from "lucide-react";
import { useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/mural", label: "mural" },
  { href: "/mapa", label: "mapa" },
  { href: "/cor", label: "cor" },
  { href: "/memorias", label: "memórias" },
];

const outgoingVariants = {
  rest: { transform: "translateY(0%)" },
  active: { transform: "translateY(100%)" },
};

const incomingVariants = {
  rest: { transform: "translateY(-100%)" },
  active: { transform: "translateY(0%)" },
};

const rollingTransition = {
  duration: 0.3,
  ease: [0.338, 0.015, 0.395, 0.959] as const,
};

function useRollingActive(reduceMotion: boolean | null) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const animating = useRef(false);
  const pendingRequest = useRef<boolean | null>(null);

  const updateActive = (next: boolean) => {
    activeRef.current = next;
    setActive(next);
  };

  const requestActive = (next: boolean) => {
    if (reduceMotion) return;

    if (next === activeRef.current) {
      pendingRequest.current = null;
      return;
    }

    if (animating.current) {
      pendingRequest.current = next;
      return;
    }

    animating.current = true;
    updateActive(next);
  };

  const completeAnimation = () => {
    if (!animating.current) return;
    animating.current = false;

    if (
      pendingRequest.current !== null &&
      pendingRequest.current !== activeRef.current
    ) {
      const next = pendingRequest.current;
      pendingRequest.current = null;
      animating.current = true;
      updateActive(next);
    } else {
      pendingRequest.current = null;
    }
  };

  return { active, requestActive, completeAnimation };
}

type NavFont = "mono" | "handwritten" | "fraunces";

const NAV_FONT_CLASSES: Record<NavFont, string> = {
  mono: "font-mono text-xs",
  handwritten: "font-handwritten text-sm",
  fraunces: "font-fraunces text-xs font-semibold",
};

// Transição do fade ao trocar de fonte entre rotas — mascara a troca de
// font-family (que não dá pra interpolar) com um fade rápido em vez do
// salto instantâneo de classe CSS. Só fade-in (sem exit/AnimatePresence):
// esperar um exit terminar pra só então montar o novo deixava o nav vazio
// por um instante, o que lia como um glitch em vez de fluido.
const fontSwapTransition = { duration: 0.2, ease: "easeOut" as const };

function RollingNavLink({
  href,
  label,
  isActive,
  neobrutalist,
  font = "mono",
}: {
  href: string;
  label: string;
  isActive: boolean;
  neobrutalist?: boolean;
  font?: NavFont;
}) {
  const reduceMotion = useReducedMotion();
  const hovered = useRef(false);
  const focused = useRef(false);
  const { active, requestActive, completeAnimation } =
    useRollingActive(reduceMotion);

  return (
    <Link
      href={href}
      onMouseEnter={() => {
        hovered.current = true;
        requestActive(true);
      }}
      onMouseLeave={() => {
        hovered.current = false;
        requestActive(focused.current);
      }}
      onFocus={() => {
        focused.current = true;
        requestActive(true);
      }}
      onBlur={() => {
        focused.current = false;
        requestActive(hovered.current);
      }}
      className={`rounded-sm px-2.5 py-1 uppercase tracking-wider transition-colors duration-500 sm:px-3 sm:py-1.5 sm:tracking-widest ${
        isActive ? "bg-accent text-background" : "text-accent hover:text-accent"
      } ${
        neobrutalist && isActive
          ? "border-2 border-black !transition-all !duration-150 shadow-[3px_3px_0_0_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_0_#000]"
          : ""
      }`}
    >
      <motion.span
        key={font}
        className={`relative block w-max overflow-hidden ${NAV_FONT_CLASSES[font]}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={fontSwapTransition}
      >
        <motion.span
          className="block whitespace-nowrap"
          variants={outgoingVariants}
          initial="rest"
          animate={active ? "active" : "rest"}
          onAnimationComplete={completeAnimation}
          transition={rollingTransition}
        >
          {label}
        </motion.span>
        <motion.span
          className="absolute inset-0 block whitespace-nowrap"
          variants={incomingVariants}
          initial="rest"
          animate={active ? "active" : "rest"}
          transition={rollingTransition}
        >
          {label}
        </motion.span>
      </motion.span>
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  // Efeito neobrutalism (borda + sombra dura) testado só em /cor, por enquanto
  // — não é um tema por rota de verdade, só um toggle local.
  const neobrutalist = pathname === "/cor" || pathname.startsWith("/cor/");

  // Fonte do nav por rota: manuscrita (mesma das legendas das polaroids) em
  // /memorias, serifada (Fraunces) em /mural, monoespaçada no resto.
  const navFont: NavFont =
    pathname === "/memorias" || pathname.startsWith("/memorias/")
      ? "handwritten"
      : pathname === "/mural" || pathname.startsWith("/mural/")
        ? "fraunces"
        : "mono";

  // Com uma cor selecionada (/cor/<nome>), o item "cor" do nav mostra o nome
  // dela em vez do label padrão.
  const corName = pathname.startsWith("/cor/")
    ? decodeURIComponent(pathname.slice("/cor/".length).split("/")[0])
    : null;

  return (
    <nav className="absolute top-0 z-20 flex w-full items-center gap-1 overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:gap-2 sm:px-6 [&::-webkit-scrollbar]:hidden">
      <Link
        href="/"
        className="mr-3 shrink-0 text-accent transition-colors duration-500 sm:mr-4"
        aria-label="Início"
      >
        <Eye className="h-6 w-6 sm:h-7 sm:w-7" />
      </Link>
      {NAV_ITEMS.map((item) => (
        <RollingNavLink
          key={item.href}
          href={item.href}
          label={item.href === "/cor" && corName ? corName : item.label}
          isActive={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          }
          neobrutalist={neobrutalist}
          font={navFont}
        />
      ))}
    </nav>
  );
}
