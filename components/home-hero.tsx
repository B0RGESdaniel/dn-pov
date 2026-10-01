"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

// Estilo exclusivo de cada botão — só aparece no hover (ver render abaixo).
// Sem hover, todos os botões ficam num outline neutro e igual entre si.
const DESTINATIONS = [
  {
    href: "/mural",
    label: "MURAL",
    className:
      "bg-accent text-background font-fraunces font-semibold normal-case",
  },
  {
    href: "/mapa",
    label: "MAPA",
    className: "bg-[#4073d9] text-foreground text-3xl font-bold",
  },
  {
    href: "/cor",
    label: "CORES",
    className: "text-black font-display text-5xl tracking-tight uppercase",
  },
  {
    href: "/memorias",
    label: "MEMÓRIAS",
    className: "text-foreground font-handwritten text-4xl normal-case",
  },
] as const;

// Mesmo fundo de /cor (components/color-page-shell.tsx): cinza claro +
// grid de linhas azuis, só que numa escala menor pra caber no botão.
const CorGridBackground: CSSProperties = {
  backgroundColor: "#e9e9e9",
  backgroundImage:
    "linear-gradient(to right, rgba(37, 99, 235, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.3) 1px, transparent 1px)",
  backgroundSize: "14px 14px",
};

// Mesmo fundo de /memorias (app/(site)/memorias/page.tsx): cor sólida de
// cortiça — o ruído por cima entra à parte, via .noise-texture (precisa
// de um elemento próprio pro mix-blend-overlay funcionar).
const MemoriasBackground: CSSProperties = { backgroundColor: "#ba8345" };

const BUTTON_BACKGROUNDS: Record<string, CSSProperties> = {
  "/cor": CorGridBackground,
  "/memorias": MemoriasBackground,
};

// Letra a letra, cada uma com sua cor + text-shadow duro (sem blur), no
// mesmo espírito neobrutalist dos quadrados de components/color-grid.tsx.
// Mesmos colorAccent das tags reais de /cor (scripts/seed-colors.ts):
// vermelho, verde, azul, amarelo, rosa.
const CorLetterColors = ["#f87171", "#4ade80", "#60a5fa", "#fbbf24", "#FC9CCE"];

function CorLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="flex">
      {label
        .toUpperCase()
        .split("")
        .map((char, index) => (
          <span
            key={index}
            style={{
              color: active
                ? CorLetterColors[index % CorLetterColors.length]
                : "currentColor",
              textShadow: active ? "3px 3px 0 #000" : "0 0 0 transparent",
              transition: "color 700ms ease-out, text-shadow 700ms ease-out",
            }}
          >
            {char}
          </span>
        ))}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Sombra estilo stencil (relevo deslocado) que muda de projeção conforme o
// mouse se move pela tela — como se a luz viesse da posição do cursor e a
// sombra do texto fosse empurrada pro lado oposto. Várias camadas do mesmo
// deslocamento (em frações crescentes) simulam a extrusão/profundidade, em
// vez de um único offset chapado.
const PERSPECTIVE_SHADOW_COLOR = "#0022FF";
const PERSPECTIVE_LAYERS = 6;

function buildPerspectiveShadow(dx: number, dy: number) {
  return Array.from({ length: PERSPECTIVE_LAYERS }, (_, i) => {
    const t = (i + 1) / PERSPECTIVE_LAYERS;
    return `${dx * t}px ${dy * t}px 0 ${PERSPECTIVE_SHADOW_COLOR}`;
  }).join(", ");
}

// API não padronizada do iOS 13+: DeviceMotionEvent só entrega dados
// depois de uma permissão pedida a partir de um gesto do usuário.
interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

// accelerationIncludingGravity.x/.y é a projeção do vetor gravidade nos
// eixos do aparelho — varia de forma contínua conforme ele gira, sem o
// "salto" que os ângulos de Euler do deviceorientation (alpha/beta/gamma)
// têm perto de certas inclinações (gamma troca de sinal de repente — é
// esse salto que causava o glitch). Por isso usamos o acelerômetro
// (devicemotion) em vez do giroscópio orientado (deviceorientation) pra
// essa sombra: ~6.5 m/s² já é "bem inclinado pro lado" na prática.
const GRAVITY_RANGE = 3.5;
const PERSPECTIVE_SMOOTHING = 0.15;

function usePointerPerspectiveShadow(maxOffset: number) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shadow, setShadow] = useState(
    `${maxOffset}px ${maxOffset}px 0 ${PERSPECTIVE_SHADOW_COLOR}`,
  );
  const smoothedRef = useRef({ dx: maxOffset, dy: maxOffset });

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Sombra projetada pro lado oposto do cursor (luz "vem" do mouse).
      const dx = clamp(
        ((centerX - event.clientX) / (window.innerWidth / 2)) * maxOffset,
        -maxOffset,
        maxOffset,
      );
      const dy = clamp(
        ((centerY - event.clientY) / (window.innerHeight / 2)) * maxOffset,
        -maxOffset,
        maxOffset,
      );

      setShadow(buildPerspectiveShadow(dx, dy));
    }

    // Sem mouse (celular), o equivalente é inclinar o aparelho: a
    // componente x/y da gravidade nos eixos do aparelho faz o mesmo papel
    // que a posição do cursor faz no desktop.
    function handleDeviceMotion(event: DeviceMotionEvent) {
      const gravity = event.accelerationIncludingGravity;
      if (!gravity) return;

      const x = gravity.x ?? 0;
      const y = gravity.y ?? 0;

      const targetDx = clamp((x / GRAVITY_RANGE) * maxOffset, -maxOffset, maxOffset);
      const targetDy = clamp((-y / GRAVITY_RANGE) * maxOffset, -maxOffset, maxOffset);

      const smoothed = smoothedRef.current;
      smoothed.dx += (targetDx - smoothed.dx) * PERSPECTIVE_SMOOTHING;
      smoothed.dy += (targetDy - smoothed.dy) * PERSPECTIVE_SMOOTHING;

      setShadow(buildPerspectiveShadow(smoothed.dx, smoothed.dy));
    }

    window.addEventListener("pointermove", handlePointerMove);

    let motionEnabled = false;
    function enableDeviceMotion() {
      if (motionEnabled) return;
      motionEnabled = true;
      window.addEventListener("devicemotion", handleDeviceMotion);
    }

    const DeviceMotionEventWithPermission =
      typeof window !== "undefined"
        ? (window.DeviceMotionEvent as unknown as DeviceMotionEventWithPermission)
        : undefined;

    const hasRequestPermission =
      typeof DeviceMotionEventWithPermission?.requestPermission === "function";

    // Só o iOS 13+ exige permissão explícita (e só pode ser pedida a partir
    // de um gesto do usuário). Em todo o resto (Android, desktop) o evento
    // já funciona direto — não faz sentido esperar um clique pra ligar.
    if (!hasRequestPermission) {
      enableDeviceMotion();
    }

    // No iOS, aproveitamos o primeiro clique na página pra pedir a
    // permissão — o Safari exige que requestPermission() seja chamado
    // dentro de um gesto do tipo "click" (touchstart não conta, dá
    // NotAllowedError mesmo acontecendo dentro do toque).
    function handleFirstClick() {
      DeviceMotionEventWithPermission?.requestPermission?.()
        .then((result) => {
          if (result === "granted") enableDeviceMotion();
        })
        .catch(() => {});

      window.removeEventListener("click", handleFirstClick);
    }

    window.addEventListener("click", handleFirstClick, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("devicemotion", handleDeviceMotion);
      window.removeEventListener("click", handleFirstClick);
    };
  }, [maxOffset]);

  return { ref, shadow };
}

export function HomeHero() {
  const { ref: perspectiveRef, shadow: perspectiveShadow } =
    usePointerPerspectiveShadow(14);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      <motion.div
        className="z-50 flex flex-col items-center space-y-10 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.88, delay: 1.5 }}
      >
        <div className="space-y-10">
          <p className="font-display text-2xl text-foreground md:text-4xl">
            It&apos;s all about
          </p>
          <p
            ref={perspectiveRef}
            className="font-display text-5xl uppercase tracking-[0.08em] text-foreground md:text-7xl"
            style={{ textShadow: perspectiveShadow }}
          >
            perspective
          </p>
        </div>

        <nav className="flex flex-col items-center gap-3">
          {DESTINATIONS.map((destination) => {
            const isActive = hoveredHref === destination.href;

            return (
              <Link
                key={destination.href}
                href={destination.href}
                onMouseEnter={() => setHoveredHref(destination.href)}
                onMouseLeave={() =>
                  setHoveredHref((current) =>
                    current === destination.href ? null : current,
                  )
                }
                onTouchStart={() => setHoveredHref(destination.href)}
                onTouchEnd={() =>
                  setHoveredHref((current) =>
                    current === destination.href ? null : current,
                  )
                }
                onTouchCancel={() =>
                  setHoveredHref((current) =>
                    current === destination.href ? null : current,
                  )
                }
                style={isActive ? BUTTON_BACKGROUNDS[destination.href] : undefined}
                className={`relative flex h-16 w-64 items-center justify-center overflow-hidden px-8 text-2xl tracking-widest transition-all duration-700 ease-out md:w-72 ${
                  isActive
                    ? destination.className
                    : "bg-transparent text-foreground"
                }`}
              >
                {destination.href === "/memorias" && (
                  <span
                    aria-hidden
                    className={`noise-texture pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-700 ease-out ${
                      isActive ? "opacity-70" : "opacity-0"
                    }`}
                  />
                )}
                {destination.href === "/mapa" && (
                  <img
                    src="/earth.svg"
                    alt=""
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-0 left-1/2 w-40 -translate-x-1/2 translate-y-[65%] transition-opacity duration-700 ease-out ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}
                <span
                  className="relative z-10"
                  style={
                    destination.href === "/mapa"
                      ? {
                          textShadow: isActive
                            ? "2px 2px 0 rgba(0, 0, 0, 0.35)"
                            : "0 0 0 transparent",
                          transition: "text-shadow 700ms ease-out",
                        }
                      : undefined
                  }
                >
                  {destination.href === "/cor" ? (
                    <CorLabel label={destination.label} active={isActive} />
                  ) : (
                    destination.label
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </motion.div>
    </div>
  );
}
