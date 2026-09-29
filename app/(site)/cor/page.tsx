import { getColors } from "@/lib/photos-source";
import { ColorGrid } from "@/components/color-grid";

export default async function CorPage() {
  const colors = await getColors();

  return <ColorGrid colors={colors} />;
}
