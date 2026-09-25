import { getAlbums } from "@/lib/photos-source";
import { AlbumGrid } from "@/components/album-grid";

export default async function AlbunsPage() {
  const albums = await getAlbums();

  return <AlbumGrid albums={albums} />;
}
