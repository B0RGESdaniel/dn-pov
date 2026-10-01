"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

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
    className:
      "relative overflow-hidden bg-[#4073d9] text-foreground text-3xl font-bold",
  },
  {
    href: "/cor",
    label: "CORES",
    className:
      "text-black font-display text-5xl tracking-tight uppercase border-2 border-black",
  },
  {
    href: "/memorias",
    label: "MEMÓRIAS",
    className:
      "relative overflow-hidden text-foreground font-handwritten text-4xl normal-case",
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

function CorLabel({ label }: { label: string }) {
  return (
    <span className="flex">
      {label
        .toUpperCase()
        .split("")
        .map((char, index) => (
          <span
            key={index}
            style={{
              color: CorLetterColors[index % CorLetterColors.length],
              textShadow: "3px 3px 0 #000",
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
// têm perto de certas inclinações. Por isso usamos o acelerômetro
// (devicemotion) em vez do giroscópio orientado (deviceorientation).
const GRAVITY_RANGE = 1.4;
const PERSPECTIVE_SMOOTHING = 0.15;

// Perto do centro (aparelho quase na vertical), o próprio ruído do sensor
// faz x/y oscilar em torno de zero — cruzando de positivo pra negativo e
// voltando várias vezes por segundo, o que lê como um "flicker" na sombra.
// Zona-morta: valores pequenos (abaixo do limiar) são tratados como zero
// antes de qualquer cálculo, então o ruído perto do centro não vira
// mudança de sinal visível. É a mesma técnica usada em joysticks/sticks
// analógicos de controle (deadzone) pra evitar drift por ruído do sensor.
const GRAVITY_DEADZONE = 0.2;

function applyDeadzone(value: number, deadzone: number) {
  return Math.abs(value) < deadzone ? 0 : value;
}

function usePointerPerspectiveShadow(maxOffset: number) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shadow, setShadow] = useState(
    `${maxOffset}px ${maxOffset}px 0 ${PERSPECTIVE_SHADOW_COLOR}`,
  );
  const smoothedRef = useRef({ dx: maxOffset, dy: maxOffset });
  const baselineRef = useRef<{ x: number; y: number } | null>(null);

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
    // que a posição do cursor faz no desktop. "Vertical perfeito" (x=y=0
    // cru) não é como ninguém segura o celular pra olhar a tela de
    // verdade — o ângulo natural de leitura já carrega um y diferente de
    // zero, então sem calibração o efeito nunca passa pelo centro. Por
    // isso guardamos a primeira leitura como "zero" (baselineRef) e
    // medimos tudo daí pra frente como desvio relativo a ela — a mesma
    // técnica de calibração usada em controles/apps de tilt (zerar o
    // sensor na orientação em que a pessoa já está segurando o aparelho,
    // em vez de usar a vertical absoluta como referência).
    function handleDeviceMotion(event: DeviceMotionEvent) {
      const gravity = event.accelerationIncludingGravity;
      if (!gravity) return;

      const rawX = gravity.x ?? 0;
      const rawY = gravity.y ?? 0;

      if (!baselineRef.current) {
        baselineRef.current = { x: rawX, y: rawY };
      }

      const x = applyDeadzone(rawX - baselineRef.current.x, GRAVITY_DEADZONE);
      const y = applyDeadzone(rawY - baselineRef.current.y, GRAVITY_DEADZONE);

      const targetDx = clamp(
        (x / GRAVITY_RANGE) * maxOffset,
        -maxOffset,
        maxOffset,
      );
      const targetDy = clamp(
        (-y / GRAVITY_RANGE) * maxOffset,
        -maxOffset,
        maxOffset,
      );

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

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      <motion.div
        className="z-50 flex flex-col items-center space-y-16 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="space-y-10">
          <p className="font-fraunces font-semibold text-2xl text-foreground md:text-4xl">
            It&apos;s all about
          </p>
          <p
            ref={perspectiveRef}
            className="font-display text-5xl uppercase tracking-[0.08em] text-red md:text-7xl"
            style={{ textShadow: perspectiveShadow }}
          >
            perspective
          </p>
        </div>

        <nav className="flex flex-col items-center gap-3">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              style={BUTTON_BACKGROUNDS[destination.href]}
              className={`flex h-16 w-64 items-center justify-center px-8 text-2xl tracking-widest transition-transform hover:scale-105 md:w-72 ${destination.className}`}
            >
              {destination.href === "/memorias" && (
                <span
                  aria-hidden
                  className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-70"
                />
              )}
              {destination.href === "/mapa" && (
                <img
                  src="/earth.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-1/2 w-40 -translate-x-1/2 translate-y-[65%]"
                />
              )}
              <span
                className="relative z-10"
                style={
                  destination.href === "/mapa"
                    ? { textShadow: "2px 2px 0 rgba(0, 0, 0, 0.35)" }
                    : undefined
                }
              >
                {destination.href === "/cor" ? (
                  <CorLabel label={destination.label} />
                ) : (
                  destination.label
                )}
              </span>
            </Link>
          ))}
        </nav>
      </motion.div>
    </div>
  );
}
