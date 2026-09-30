"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Photo } from "@/types/photo";

interface MemoryStackProps {
  photos: Photo[];
}

const MAX_ROTATE = 10;
const MIN_SPEED = 50;
// A partir dessa profundidade na pilha, os cards param de ficar mais
// apagados/menores — evita que, com poucas fotos, o(s) card(s) do fundo
// fiquem com opacity/scale tão baixos que somem (e fiquem impossíveis de
// clicar pra trazer de volta pra frente).
const MAX_VISIBLE_DEPTH = 4;

function mix(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

interface MemoryCardProps {
  photo: Photo;
  index: number;
  currentIndex: number;
  total: number;
  minDistance: number;
  onBringToFront: (index: number) => void;
  onSwipeNext: () => void;
}

function MemoryCard({
  photo,
  index,
  currentIndex,
  total,
  minDistance,
  onBringToFront,
  onSwipeNext,
}: MemoryCardProps) {
  const isCurrent = index === currentIndex;
  const restRotate = mix(-MAX_ROTATE, MAX_ROTATE, Math.sin(index));
  const x = useMotionValue(0);
  const rotate = useTransform(x, [0, 400], [restRotate, restRotate + 10], {
    clamp: false,
  });

  const offset = wrap(0, total, index - currentIndex);
  const zIndex = total - offset;
  const depthRatio = clamp(0, 1, offset / Math.min(MAX_VISIBLE_DEPTH, Math.max(total - 1, 1)));
  const opacity = mix(1, 0.5, depthRatio);
  const scale = mix(1, 0.8, depthRatio);

  function handleDragEnd() {
    const distance = Math.abs(x.get());
    const speed = Math.abs(x.getVelocity());
    if (distance > minDistance || speed > MIN_SPEED) {
      onSwipeNext();
      animate(x, 0, { type: "spring", stiffness: 600, damping: 50 });
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 50 });
    }
  }

  return (
    <motion.li
      className="memory-card"
      style={{ zIndex, x, rotate }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity, scale }}
      whileTap={isCurrent ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      drag={isCurrent ? "x" : false}
      onDragEnd={handleDragEnd}
      onTap={() => onBringToFront(index)}
    >
      <div className="memory-card-thumb">
        <Image
          src={photo.thumbUrl}
          alt={photo.memory ?? ""}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 340px, 260px"
          placeholder={photo.blurDataUrl ? "blur" : undefined}
          blurDataURL={photo.blurDataUrl ?? undefined}
        />
      </div>
      <p className="memory-card-caption font-handwritten">{photo.memory}</p>
    </motion.li>
  );
}

export function MemoryStack({ photos }: MemoryStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [minDistance, setMinDistance] = useState(120);
  const total = photos.length;

  useEffect(() => {
    if (rootRef.current) {
      // 30% da largura do container, com piso e teto sensatos — o cálculo
      // original (50%) exigia um arrasto longo demais pra ciclar a pilha.
      setMinDistance(clamp(80, 180, rootRef.current.offsetWidth * 0.3));
    }
  }, []);

  if (total === 0) {
    return (
      <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma memória salva ainda
      </p>
    );
  }

  return (
    <div className="memory-stack-root" ref={rootRef}>
      <ul className="memory-stack">
        {photos.map((photo, index) => (
          <MemoryCard
            key={photo.id}
            photo={photo}
            index={index}
            currentIndex={currentIndex}
            total={total}
            minDistance={minDistance}
            onBringToFront={setCurrentIndex}
            onSwipeNext={() =>
              setCurrentIndex(wrap(0, total, currentIndex + 1))
            }
          />
        ))}
      </ul>
    </div>
  );
}
