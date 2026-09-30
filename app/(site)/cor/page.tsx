import { getColors } from "@/lib/photos-source";
import { ColorGrid } from "@/components/color-grid";

export default async function CorPage() {
  const colors = await getColors();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: `
          linear-gradient(to right, color-mix(in srgb, var(--border) 70%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--border) 70%, transparent) 1px, transparent 1px),
          radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 60%)
        `,
        backgroundSize: "40px 40px, 40px 40px, 100% 100%",
      }}
    >
      <ColorGrid colors={colors} />
    </div>
  );
}
