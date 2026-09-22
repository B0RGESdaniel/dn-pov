"use client";

import Image from "next/image";
import { useCallback, useEffect } from "react";
import { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];

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

      <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-6">
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

        {photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-foreground hover:bg-black/60"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-foreground hover:bg-black/60"
              aria-label="Próxima foto"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}
