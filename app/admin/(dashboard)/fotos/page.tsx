import Image from "next/image";
import Link from "next/link";
import { getPhotos } from "@/lib/db/photos";

// Admin sempre lê o banco ao vivo — nada de prerender em build time aqui.
export const dynamic = "force-dynamic";

export default async function AdminFotosPage({
  searchParams,
}: PageProps<"/admin/fotos">) {
  const { cursor } = await searchParams;
  const { photos, nextCursor } = await getPhotos({
    cursor: typeof cursor === "string" ? cursor : undefined,
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-xl text-foreground">Fotos</h1>

      {photos.length === 0 && (
        <p className="text-sm text-muted">Nenhuma foto ainda.</p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/admin/fotos/${photo.id}`}
            className="relative aspect-square overflow-hidden rounded-md border border-border"
          >
            <Image
              src={photo.thumbUrl}
              alt=""
              fill
              sizes="200px"
              className="object-cover"
              placeholder={photo.blurDataUrl ? "blur" : undefined}
              blurDataURL={photo.blurDataUrl ?? undefined}
            />
          </Link>
        ))}
      </div>

      {nextCursor && (
        <Link
          href={`/admin/fotos?cursor=${encodeURIComponent(nextCursor)}`}
          className="mt-6 inline-block text-sm text-muted hover:text-foreground"
        >
          Carregar mais
        </Link>
      )}
    </div>
  );
}
