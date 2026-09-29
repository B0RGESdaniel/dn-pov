import { getPhotos } from "@/lib/photos-source";
import { PhotoMasonry } from "@/components/photo-masonry";

export default async function MuralPage() {
  const initialPage = await getPhotos({});

  return (
    <div className="pt-16 sm:pt-20">
      <PhotoMasonry
        initialPhotos={initialPage.photos}
        initialCursor={initialPage.nextCursor}
      />
    </div>
  );
}
