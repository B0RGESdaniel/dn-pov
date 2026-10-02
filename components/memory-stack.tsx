"use client";

import { useState } from "react";
import Image from "next/image";
import { Photo } from "@/types/photo";
import { DragElements } from "@/components/ui/drag-elements";

interface MemoryStackProps {
  photos: Photo[];
}

const MAX_ROTATE = 14;
// Quanto a foto aumenta ao ser "pega" (clicada) — como se tivesse sido
// tirada do quadro pra ler a memória com mais calma.
const PICKED_SCALE = 1.4;

// Entrada em cascata: cada polaroid nasce grande e deslocada pra cima —
// como se estivesse na mão, perto da câmera — e ao ser "solta" encolhe pro
// tamanho normal enquanto cai até a posição final no fundo da pilha. A mola
// no transition dá aquele "baque" de pouso ao chegar no tamanho final.
//
// photos vem ordenado do mais recente pro mais antigo (DESC), mas a pilha
// deve "nascer" na ordem cronológica: a memória mais antiga cai primeiro
// (vai pro fundo) e a mais recente cai por último (fica por cima) — daí o
// delay usar o índice invertido. reverseInitialZOrder acompanha essa mesma
// inversão pro z-index inicial não ficar incoerente com a ordem de pouso
// (quem pousa por último tem que nascer por cima, não embaixo). Cap no
// stagger pra pilhas grandes não demorarem uma eternidade pra aparecer toda.
const ENTRANCE_FALL_DISTANCE = 220;
const ENTRANCE_HELD_SCALE = 1.5;
const ENTRANCE_STAGGER_STEP = 0.1;
const ENTRANCE_STAGGER_CAP = 10;

// Ângulo de repouso de cada polaroid, determinístico por índice (mesma foto
// sempre nasce com o mesmo ângulo) — alterna lado e varia a magnitude de
// forma bem espalhada (razão áurea), pra dar aquele ar de pilha jogada, sem
// ângulos quase iguais entre fotos vizinhas.
function fanRotation(index: number) {
  const fraction = (index * 0.618033988749895) % 1;
  return (index % 2 === 0 ? 1 : -1) * MAX_ROTATE * (0.4 + 0.6 * fraction);
}

export function MemoryStack({ photos }: MemoryStackProps) {
  const [pickedId, setPickedId] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p
          className="text-center font-display text-2xl uppercase tracking-widest sm:text-3xl"
          style={{ color: "var(--foreground)" }}
        >
          nenhuma memória salva ainda
        </p>
      </div>
    );
  }

  return (
    <DragElements
      className="memory-board"
      reverseInitialZOrder
      itemStyle={() => ({ left: "50%", top: "50%", translate: "-50% -50%" })}
      itemInitial={() => ({
        opacity: 0,
        y: -ENTRANCE_FALL_DISTANCE,
        scale: ENTRANCE_HELD_SCALE,
      })}
      itemAnimate={() => ({ opacity: 1, y: 0, scale: 1 })}
      itemTransition={(index) => ({
        type: "spring",
        stiffness: 300,
        damping: 22,
        mass: 0.7,
        delay:
          Math.min(photos.length - 1 - index, ENTRANCE_STAGGER_CAP) *
          ENTRANCE_STAGGER_STEP,
      })}
      onItemTap={(index) => {
        const photo = photos[index];
        setPickedId((current) => (current === photo.id ? null : photo.id));
      }}
    >
      {photos.map((photo, index) => {
        const rotate = fanRotation(index);
        const picked = pickedId === photo.id;

        return (
          <div
            key={photo.id}
            className={`memory-card${picked ? " memory-card--picked" : ""}`}
            style={{
              transform: `rotate(${picked ? 0 : rotate}deg) scale(${picked ? PICKED_SCALE : 1})`,
            }}
          >
            <div className="memory-card-thumb">
              <Image
                src={photo.thumbUrl}
                alt={photo.memory ?? ""}
                fill
                draggable={false}
                className="object-cover"
                sizes="(min-width: 768px) 260px, 200px"
                placeholder={photo.blurDataUrl ? "blur" : undefined}
                blurDataURL={photo.blurDataUrl ?? undefined}
              />
            </div>
            <p className="memory-card-caption font-handwritten">
              {photo.memory}
            </p>
          </div>
        );
      })}
    </DragElements>
  );
}
