import { notFound } from "next/navigation";
import { getColors, getPhotos } from "@/lib/photos-source";
import { TagTheme } from "@/components/tag-theme";
import { ColorHero } from "@/components/color-hero";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function CorNomePage({ params }: PageProps<"/cor/[nome]">) {
  const { nome } = await params;
  const name = decodeURIComponent(nome);

  const colors = await getColors();
  const color = colors.find((item) => item.tag.name === name);
  if (!color) notFound();

  const initialPage = await getPhotos({ color: [name] });

  return (
    <>
      <TagTheme colorBg={color.tag.colorBg} colorAccent={color.tag.colorAccent} />
      <ColorHero tag={color.tag}>
        <PhotoMasonry
          key={name}
          initialPhotos={initialPage.photos}
          initialCursor={initialPage.nextCursor}
          filters={{ color: [name] }}
        />
      </ColorHero>
    </>
  );
}
