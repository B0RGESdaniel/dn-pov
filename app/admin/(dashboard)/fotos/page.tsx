import Image from "next/image";
import Link from "next/link";
import { getPhotos } from "@/lib/db/photos";
import { getTags } from "@/lib/db/tags";
import { PhotoFiltersForm, buildFotosHref } from "@/components/admin/photo-filters";

// Admin sempre lê o banco ao vivo — nada de prerender em build time aqui.
export const dynamic = "force-dynamic";

function toStringArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

export default async function AdminFotosPage({
  searchParams,
}: PageProps<"/admin/fotos">) {
  const {
    cursor,
    place: rawPlace,
    color: rawColor,
    edited: rawEdited,
    hasMemory: rawHasMemory,
  } = await searchParams;

  const place = toStringArray(rawPlace);
  const color = toStringArray(rawColor);
  const edited = rawEdited === "true" ? true : undefined;
  const hasMemory = rawHasMemory === "true" ? true : undefined;
  const hasFilter = Boolean(place?.length || color?.length || edited || hasMemory);

  const [{ photos, nextCursor }, tags] = await Promise.all([
    getPhotos({
      cursor: typeof cursor === "string" ? cursor : undefined,
      place,
      color,
      edited,
      hasMemory,
    }),
    getTags(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-xl text-foreground">Fotos</h1>

      <PhotoFiltersForm
        placeTags={tags.filter((tag) => tag.category === "place")}
        colorTags={tags.filter((tag) => tag.category === "color")}
        filters={{ place, color, edited, hasMemory }}
      />

      {photos.length === 0 && (
        <p className="text-sm text-muted">
          {hasFilter ? "Nenhuma foto encontrada." : "Nenhuma foto ainda."}
        </p>
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
          href={buildFotosHref({ place, color, edited, hasMemory, cursor: nextCursor })}
          className="mt-6 inline-block text-sm text-muted hover:text-foreground"
        >
          Carregar mais
        </Link>
      )}
    </div>
  );
}
