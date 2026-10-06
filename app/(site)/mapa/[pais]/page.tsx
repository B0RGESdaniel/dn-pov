import { notFound } from "next/navigation";
import { getPhotos, getPlaces } from "@/lib/photos-source";
import { TagTheme } from "@/components/tag-theme";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function MapaPaisPage({ params }: PageProps<"/mapa/[pais]">) {
  const { pais } = await params;
  const name = decodeURIComponent(pais);

  const places = await getPlaces();
  const country = places.find(
    (item) => item.tag.name === name && item.tag.parentId === null,
  );
  if (!country) notFound();

  const initialPage = await getPhotos({ place: [name] });

  return (
    <>
      <TagTheme colorBg={country.tag.colorBg} colorAccent={country.tag.colorAccent} />
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
