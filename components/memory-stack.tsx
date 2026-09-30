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
const PICKED_SCALE = 1.18;

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
      <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma memória salva ainda
      </p>
    );
  }

  return (
    <DragElements
      className="memory-board"
      itemStyle={() => ({ left: "50%", top: "50%", translate: "-50% -50%" })}
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
            <p className="memory-card-caption font-handwritten">{photo.memory}</p>
          </div>
        );
      })}
    </DragElements>
  );
}
