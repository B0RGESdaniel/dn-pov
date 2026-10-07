"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deletePhoto as deletePhotoFromDb,
  setPhotoTags,
  updatePhotoMeta,
} from "@/lib/db";
import { mapDbError } from "@/lib/validation/errors";
import { updatePhotoSchema } from "@/lib/validation/photos";

export type PhotoActionResult =
  | { error?: undefined; fieldErrors?: undefined }
  | { error: string; fieldErrors?: Record<string, string[]> };

function parseTagIds(formData: FormData): number[] {
  return formData
    .getAll("tagIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

export async function updatePhoto(
  id: number,
  formData: FormData,
): Promise<PhotoActionResult> {
  const parsed = updatePhotoSchema.safeParse({
    memory: formData.get("memory"),
    edited: formData.get("edited") === "on",
    tagIds: parseTagIds(formData),
  });

  if (!parsed.success) {
    const { formErrors, fieldErrors } = parsed.error.flatten();
    return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
  }

  const { memory, edited, tagIds } = parsed.data;

  try {
    await updatePhotoMeta(id, { memory: memory === "" ? null : memory, edited });
    await setPhotoTags(id, tagIds);
  } catch (error) {
    return { error: mapDbError(error) };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deletePhotoAction(id: number): Promise<PhotoActionResult> {
  try {
    await deletePhotoFromDb(id);
  } catch (error) {
    return { error: mapDbError(error) };
  }

  revalidatePath("/", "layout");
  redirect("/admin/fotos");
}
