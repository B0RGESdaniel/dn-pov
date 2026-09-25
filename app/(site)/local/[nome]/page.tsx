import { notFound } from "next/navigation";
import { getPhotos, getPlaces } from "@/lib/photos-source";
import { PlaceHero } from "@/components/place-hero";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function LocalPage({ params }: PageProps<"/local/[nome]">) {
  const { nome } = await params;
  const name = decodeURIComponent(nome);

  const places = await getPlaces();
  const index = places.findIndex((place) => place.tag.name === name);
  if (index === -1) notFound();

  const place = places[index];
  const prev = places[(index - 1 + places.length) % places.length];
  const next = places[(index + 1) % places.length];

  const initialPage = await getPhotos({ place: [name] });

  return (
    <div className="flex flex-col">
      <PlaceHero
        name={place.tag.name}
        count={place.count}
        cover={place.cover}
        prevName={prev.tag.name}
        nextName={next.tag.name}
      />

      <div id="fotos" className="relative z-[15] min-h-[calc(100svh+4rem)] bg-background">
        <PhotoMasonry
          key={name}
          initialPhotos={initialPage.photos}
          initialCursor={initialPage.nextCursor}
          filters={{ place: [name] }}
        />
      </div>
    </div>
  );
}
