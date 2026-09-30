import { getMemories } from "@/lib/photos-source";
import { MemoryStack } from "@/components/memory-stack";
import { TagTheme } from "@/components/tag-theme";

export default async function MemoriasPage() {
  const photos = await getMemories();

  return (
    <div
      className="relative flex h-[100svh] overflow-hidden px-4 pt-16 sm:pt-20"
      style={{ backgroundColor: "#ba8345" }}
    >
      {/* Nav mais claro (--foreground) pra ter contraste sobre o fundo
          cortiça — sem essa troca, o accent padrão (creme) some no marrom. */}
      <TagTheme colorAccent="var(--foreground)" />
      {/* Fundo estilo cortiça de quadro de avisos: cor sólida + ruído bem
          marcado por cima (mesma textura de components/color-grid.tsx). */}
      <div
        aria-hidden
        className="noise-texture pointer-events-none absolute inset-0 mix-blend-overlay opacity-70"
      />
      <MemoryStack photos={photos} />
    </div>
  );
}
