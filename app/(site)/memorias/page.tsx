import { getMemories } from "@/lib/photos-source";
import { MemoryStack } from "@/components/memory-stack";

export default async function MemoriasPage() {
  const photos = await getMemories();

  return (
    <div className="flex h-[100svh] items-center justify-center px-4 pt-16 sm:pt-20">
      <MemoryStack photos={photos} />
    </div>
  );
}
