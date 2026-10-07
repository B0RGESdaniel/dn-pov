import { notFound } from "next/navigation";
import { getPhotos, getPlaceByName } from "@/lib/photos-source";
import { TagTheme } from "@/components/tag-theme";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function MapaPaisPage({ params }: PageProps<"/mapa/[pais]">) {
  const { pais } = await params;
  const name = decodeURIComponent(pais);

  const country = await getPlaceByName(name, null);
  if (!country) notFound();

  const initialPage = await getPhotos({ place: [name] });

  return (
    <>
      <TagTheme colorBg={country.colorBg} colorAccent={country.colorAccent} />
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
