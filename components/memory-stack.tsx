import Image from "next/image";
import { Photo } from "@/types/photo";

interface MemoryStackProps {
  photos: Photo[];
}

const MAX_ROTATE = 6;
// Índice do card "de cima" da pilha — fixo por enquanto; vira estado no
// próximo passo, quando clique/arrastar entram em jogo.
const CURRENT_INDEX = 0;

function mix(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

function progress(from: number, to: number, value: number) {
  if (from === to) return 1;
  return (value - from) / (to - from);
}

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export function MemoryStack({ photos }: MemoryStackProps) {
  const total = photos.length;

  if (total === 0) {
    return (
      <p className="p-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma memória salva ainda
      </p>
    );
  }

  return (
    <div className="memory-stack-root">
      <ul className="memory-stack">
        {photos.map((photo, index) => {
          const restRotate = mix(-MAX_ROTATE, MAX_ROTATE, Math.sin(index));
          const offset = wrap(0, total, index - CURRENT_INDEX);
          const zIndex = total - offset;
          const opacity = progress(total * 0.25, total * 0.75, zIndex);
          const scale = mix(0.5, 1, clamp(0, 1, progress(0, total - 1, zIndex)));

          return (
            <li
              key={photo.id}
              className="memory-card"
              style={{
                zIndex,
                opacity,
                transform: `translate(-50%, -50%) rotate(${restRotate}deg) scale(${scale})`,
              }}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
