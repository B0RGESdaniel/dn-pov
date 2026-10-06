import { notFound } from "next/navigation";
import { getPhotos, getPlaces } from "@/lib/photos-source";
import { TagTheme } from "@/components/tag-theme";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function MapaCidadePage({
  params,
}: PageProps<"/mapa/[pais]/[cidade]">) {
  const { pais, cidade } = await params;
  const countryName = decodeURIComponent(pais);
  const cityName = decodeURIComponent(cidade);

  const places = await getPlaces();
  const country = places.find(
    (item) => item.tag.name === countryName && item.tag.parentId === null,
  );
  if (!country) notFound();

  // Cidade buscada só dentro do país da URL — necessário porque cidades
  // homônimas em países diferentes são permitidas (ver lib/schema.sql).
  const city = places.find(
    (item) => item.tag.name === cityName && item.tag.parentId === country.tag.id,
  );
  if (!city) notFound();

  const initialPage = await getPhotos({ place: [cityName] });

  return (
    <>
      <TagTheme colorBg={city.tag.colorBg} colorAccent={city.tag.colorAccent} />
      <div className="pt-16 sm:pt-20">
        <PhotoMasonry
          key={cityName}
          initialPhotos={initialPage.photos}
          initialCursor={initialPage.nextCursor}
          filters={{ place: [cityName] }}
        />
      </div>
    </>
  );
}
