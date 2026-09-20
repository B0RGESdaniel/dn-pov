import { getAlbums } from "@/lib/db";
import { AlbumGrid } from "@/components/album-grid";

export default async function AlbunsPage() {
  const albums = await getAlbums();

  return <AlbumGrid albums={albums} />;
}
