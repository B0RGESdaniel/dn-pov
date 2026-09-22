"use client";

import Image from "next/image";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";
import { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// px de deslocamento horizontal mínimo pra contar como swipe (em vez de um
// toque/scroll vertical acidental).
const SWIPE_THRESHOLD = 50;

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goNext, goPrev]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || photos.length <= 1) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Ignora se foi mais vertical que horizontal (scroll/toque acidental).
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) goNext();
    else goPrev();
  }

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="flex items-center gap-3 p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {index + 1}/{photos.length}
        </span>
        {photo.edited && (
          <span className="rounded-sm bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-background">
            editada
          </span>
        )}
        <span className="flex-1" />
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-foreground hover:bg-black/60"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <div
        className="relative mx-auto w-full max-w-5xl flex-1 touch-none px-4 pb-6"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <div key={photo.id} className="lightbox-photo absolute inset-0">
          <Image
            src={photo.url}
            alt={photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
            fill
            className="object-contain"
            sizes="100vw"
            placeholder={photo.blurDataUrl ? "blur" : undefined}
            blurDataURL={photo.blurDataUrl ?? undefined}
            priority
          />
        </div>
      </div>
    </div>
  );
}
