import { getPlaces } from "@/lib/db";
import { GlobeMap } from "@/components/globe-map";

export default async function MapaPage() {
  const places = await getPlaces();

  return <GlobeMap places={places} />;
}
