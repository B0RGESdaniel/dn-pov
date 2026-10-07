"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Photo, Tag, TagCategory } from "@/types/photo";
import {
  deletePhotoAction,
  updatePhoto,
} from "@/app/admin/(dashboard)/fotos/actions";
import { TagMultiSelect } from "@/components/admin/tag-multi-select";

const CATEGORY_LABELS: Record<TagCategory, string> = {
  place: "Local",
  color: "Cor",
};

const CATEGORIES: TagCategory[] = ["place", "color"];

export function PhotoEditForm({
  photo,
  allTags,
}: {
  photo: Photo;
  allTags: Tag[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedTagIds = photo.tags.map((tag) => tag.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePhoto(photo.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Excluir esta foto? O registro some do app — o arquivo continua no R2.",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePhotoAction(photo.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="relative aspect-[4/5] w-full max-w-xs shrink-0 overflow-hidden rounded-md border border-border">
        <Image
          src={photo.thumbUrl}
          alt=""
          fill
          sizes="320px"
          className="object-cover"
          placeholder={photo.blurDataUrl ? "blur" : undefined}
          blurDataURL={photo.blurDataUrl ?? undefined}
        />
      </div>

      <div className="flex-1 space-y-6">
        <form action={handleSubmit} className="space-y-5">
          {CATEGORIES.map((category) => {
            const categoryTags = allTags.filter(
              (tag) => tag.category === category,
            );

            return (
              <fieldset key={category}>
                <legend className="mb-2 text-xs uppercase tracking-wide text-muted">
                  {CATEGORY_LABELS[category]}
                </legend>
                <TagMultiSelect
                  name="tagIds"
                  label={CATEGORY_LABELS[category]}
                  category={category}
                  tags={categoryTags}
                  defaultSelectedIds={selectedTagIds.filter((id) =>
                    categoryTags.some((tag) => tag.id === id),
                  )}
                />
              </fieldset>
            );
          })}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="edited"
              defaultChecked={photo.edited}
            />
            Editada
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted">
            Memória
            <textarea
              name="memory"
              defaultValue={photo.memory ?? ""}
              rows={3}
              placeholder="Texto opcional — preenchido, a foto entra em /memorias"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              Salvar
            </button>
            {saved && <span className="text-sm text-muted">Salvo.</span>}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm text-muted hover:text-red-400 disabled:opacity-60"
          >
            Excluir foto
          </button>
          <p className="mt-1 max-w-sm text-xs text-muted">
            Remove o registro do banco. O arquivo no R2 não é apagado — fica
            como limpeza manual.
          </p>
        </div>
      </div>
    </div>
  );
}
