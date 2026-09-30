import Link from "next/link";
import { ColorAlbum } from "@/lib/db";

interface ColorGridProps {
  colors: ColorAlbum[];
}

export function ColorGrid({ colors }: ColorGridProps) {
  if (colors.length === 0) {
    return (
      <p className="p-8 pt-24 text-center font-mono text-xs uppercase tracking-widest text-muted">
        nenhuma cor cadastrada ainda
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-20 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:pt-24 md:grid-cols-4">
      {colors.map(({ tag }) => (
        <Link
          key={tag.id}
          href={`/cor/${encodeURIComponent(tag.name)}`}
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-sm border-2 border-black shadow-[8px_8px_0_0_#000] transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_#000]"
          style={{ backgroundColor: tag.colorBg }}
        >
          <div
            aria-hidden
            className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-50"
          />
          <span
            className="relative z-10 font-display text-xl tracking-tight sm:text-2xl"
            style={{ color: tag.colorAccent }}
          >
            {tag.name.toUpperCase()}
          </span>
        </Link>
      ))}
    </div>
  );
}
