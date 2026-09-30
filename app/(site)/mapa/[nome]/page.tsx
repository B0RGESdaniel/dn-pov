import { notFound } from "next/navigation";
import { getPhotos, getPlaces } from "@/lib/photos-source";
import { TagTheme } from "@/components/tag-theme";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function MapaNomePage({ params }: PageProps<"/mapa/[nome]">) {
  const { nome } = await params;
  const name = decodeURIComponent(nome);

  const places = await getPlaces();
  const place = places.find((item) => item.tag.name === name);
  if (!place) notFound();

  const initialPage = await getPhotos({ place: [name] });

  return (
    <>
      <TagTheme colorBg={place.tag.colorBg} colorAccent={place.tag.colorAccent} />
      <div className="pt-16 sm:pt-20">
        <PhotoMasonry
          key={name}
          initialPhotos={initialPage.photos}
          initialCursor={initialPage.nextCursor}
          filters={{ place: [name] }}
        />
      </div>
    </>
  );
}
