import { notFound } from "next/navigation";
import { getPhotoById, getTags } from "@/lib/db";
import { PhotoEditForm } from "@/components/admin/photo-edit-form";

export const dynamic = "force-dynamic";

export default async function AdminPhotoEditPage({
  params,
}: PageProps<"/admin/fotos/[id]">) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isFinite(photoId)) notFound();

  const [photo, allTags] = await Promise.all([
    getPhotoById(photoId),
    getTags(),
  ]);

  if (!photo) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-xl text-foreground">
        Foto #{photo.id}
      </h1>
      <PhotoEditForm photo={photo} allTags={allTags} />
    </div>
  );
}
