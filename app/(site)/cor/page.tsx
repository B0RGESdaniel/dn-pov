import { getColors } from "@/lib/photos-source";
import { ColorGrid } from "@/components/color-grid";
import { TagTheme } from "@/components/tag-theme";

export default async function CorPage() {
  const colors = await getColors();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#e9e9e9",
        backgroundImage: `
          linear-gradient(to right, rgba(37, 99, 235, 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(37, 99, 235, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    >
      {/* Fundo aqui virou cinza claro (ver estilo acima); troca só o accent
          pro mesmo azul do grid, pra manter contraste do nav sobre o claro. */}
      <TagTheme colorAccent="#2563eb" />
      <ColorGrid colors={colors} />
    </div>
  );
}
