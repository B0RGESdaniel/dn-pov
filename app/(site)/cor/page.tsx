import { getColors } from "@/lib/photos-source";
import { ColorGrid } from "@/components/color-grid";
import { ColorPageShell } from "@/components/color-page-shell";
import { TagTheme } from "@/components/tag-theme";

export default async function CorPage() {
  const colors = await getColors();

  return (
    <ColorPageShell>
      {/* Fundo aqui virou cinza claro (ver ColorPageShell); troca só o accent
          pro mesmo azul do grid, pra manter contraste do nav sobre o claro. */}
      <TagTheme colorAccent="#2563eb" />
      <ColorGrid colors={colors} />
    </ColorPageShell>
  );
}
