import { notFound } from "next/navigation";
import { getColors, getPhotos } from "@/lib/photos-source";
import { ColorHero } from "@/components/color-hero";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function CorNomePage({ params }: PageProps<"/cor/[nome]">) {
  const { nome } = await params;
  const name = decodeURIComponent(nome);

  const colors = await getColors();
  const index = colors.findIndex((color) => color.tag.name === name);
  if (index === -1) notFound();

  const color = colors[index];
  const prev = colors[(index - 1 + colors.length) % colors.length];
  const next = colors[(index + 1) % colors.length];

  const initialPage = await getPhotos({ color: [name] });

  return (
    <div className="flex flex-col">
      <ColorHero
        name={color.tag.name}
        colorBg={color.tag.colorBg}
        colorAccent={color.tag.colorAccent}
        count={color.count}
        cover={color.cover}
        prevName={prev.tag.name}
        nextName={next.tag.name}
      />

      <div id="fotos" className="relative z-[15] min-h-[calc(100svh+4rem)] bg-background">
        <PhotoMasonry
          key={name}
          initialPhotos={initialPage.photos}
          initialCursor={initialPage.nextCursor}
          filters={{ color: [name] }}
        />
      </div>
    </div>
  );
}
