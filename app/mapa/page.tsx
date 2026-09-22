import { getPlaces } from "@/lib/photos-source";
import { GlobeMap } from "@/components/globe-map";

export default async function MapaPage() {
  const places = await getPlaces();

  return <GlobeMap places={places} />;
}
