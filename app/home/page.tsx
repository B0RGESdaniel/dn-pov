import { getPhotos } from "@/lib/photos-source";
import { HomeHero } from "@/components/home-hero";

export default async function HomePage() {
  const { photos } = await getPhotos({ limit: 8 });

  return <HomeHero photos={photos} />;
}
