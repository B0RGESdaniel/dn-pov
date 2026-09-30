"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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

function RollingNavLink({
  href,
  label,
  isActive,
  neobrutalist,
  handwritten,
}: {
  href: string;
  label: string;
  isActive: boolean;
  neobrutalist?: boolean;
  handwritten?: boolean;
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
      className={`rounded-sm px-3 py-1.5 uppercase tracking-widest transition-colors duration-500 ${
        handwritten ? "font-handwritten text-sm" : "font-mono text-xs"
      } ${
        isActive ? "bg-accent text-background" : "text-accent hover:text-accent"
      } ${
        neobrutalist && isActive
          ? "border-2 border-black !transition-all !duration-150 shadow-[3px_3px_0_0_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_0_#000]"
          : ""
      }`}
    >
      <span className="relative block w-max overflow-hidden">
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
      </span>
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  // Efeito neobrutalism (borda + sombra dura) testado só em /cor, por enquanto
  // — não é um tema por rota de verdade, só um toggle local.
  const neobrutalist = pathname === "/cor" || pathname.startsWith("/cor/");

  // Fonte manuscrita (mesma das legendas das polaroids) só em /memorias.
  const handwritten =
    pathname === "/memorias" || pathname.startsWith("/memorias/");

  // Com uma cor selecionada (/cor/<nome>), o item "cor" do nav mostra o nome
  // dela em vez do label padrão.
  const corName = pathname.startsWith("/cor/")
    ? decodeURIComponent(pathname.slice("/cor/".length).split("/")[0])
    : null;

  return (
    <nav className="absolute top-0 z-20 flex w-full items-center gap-2 px-4 py-3 sm:px-6">
      <Link
        href="/"
        className="mr-4 font-display text-lg tracking-tight text-accent transition-colors duration-500"
      >
        dn-pov
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
          handwritten={handwritten}
        />
      ))}
    </nav>
  );
}
