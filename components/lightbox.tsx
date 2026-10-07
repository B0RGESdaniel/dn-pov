"use client";

import Image from "next/image";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const SWIPE_THRESHOLD = 50; // px horizontal mínimo pra virar navegação

export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: LightboxProps) {
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

  const nextPhoto = photos.length > 1 ? photos[(index + 1) % photos.length] : null;
  const prevPhoto =
    photos.length > 1 ? photos[(index - 1 + photos.length) % photos.length] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur">
      <div
        className="absolute inset-0 touch-none p-1"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <LightboxPhoto key={photo.id} photo={photo} priority />
      </div>

      {/* Pré-carrega vizinhas fora de tela, pra trocar de foto ser instantâneo. */}
      <div className="absolute h-px w-px overflow-hidden opacity-0" aria-hidden>
        {nextPhoto && nextPhoto.id !== photo.id && (
          <Image src={nextPhoto.url} alt="" fill unoptimized loading="eager" />
        )}
        {prevPhoto && prevPhoto.id !== photo.id && prevPhoto.id !== nextPhoto?.id && (
          <Image src={prevPhoto.url} alt="" fill unoptimized loading="eager" />
        )}
      </div>

      {/* Sobreposto à foto (não ocupa espaço em layout), sempre visível. */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-foreground">
            {index + 1}/{photos.length}
          </span>
          {photo.edited && (
            <span className="rounded-sm bg-accent px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-background">
              editada
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-foreground hover:bg-black/60"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function LightboxPhoto({ photo, priority }: { photo: Photo; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="lightbox-photo relative h-full w-full">
      {photo.blurDataUrl && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-300 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
          style={{
            backgroundImage: `url(${photo.blurDataUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      <Image
        src={photo.url}
        alt={photo.tags.map((tag) => tag.name).join(", ") || "Foto"}
        fill
        unoptimized
        className="object-contain"
        priority={priority}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
