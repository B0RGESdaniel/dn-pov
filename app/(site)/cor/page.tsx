import { getColors } from "@/lib/photos-source";
import { ColorGrid } from "@/components/color-grid";

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
      <ColorGrid colors={colors} />
    </div>
  );
}
