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

function mix(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

// Posição e ângulo iniciais de cada polaroid, determinísticos por índice
// (mesma foto sempre nasce no mesmo lugar ao recarregar a página) — um grid
// solto com jitter e rotação alternando lado, espalhado com boa separação
// via razão áurea (índices vizinhos não ficam com ângulos quase iguais).
function scatter(index: number, total: number) {
  const angleFraction = (index * 0.618033988749895) % 1;
  const rotate =
    (index % 2 === 0 ? 1 : -1) * MAX_ROTATE * (0.4 + 0.6 * angleFraction);

  const columns = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(total))));
  const col = index % columns;
  const row = Math.floor(index / columns);
  const jitterX = mix(-6, 6, (index * 0.374) % 1);
  const jitterY = mix(-6, 6, (index * 0.912) % 1);

  const left =
    mix(14, 86, columns === 1 ? 0.5 : col / (columns - 1)) + jitterX;
  const top = 16 + row * 28 + jitterY;

  return { rotate, left, top };
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
      itemStyle={(index) => {
        const { left, top } = scatter(index, photos.length);
        return { left: `${left}%`, top: `${top}%` };
      }}
      onItemTap={(index) => {
        const photo = photos[index];
        setPickedId((current) => (current === photo.id ? null : photo.id));
      }}
    >
      {photos.map((photo, index) => {
        const { rotate } = scatter(index, photos.length);
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
