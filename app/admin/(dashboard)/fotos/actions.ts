"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deletePhoto as deletePhotoFromDb,
  setPhotoTags,
  updatePhotoMeta,
} from "@/lib/db";

export type PhotoActionResult = { error: string } | { error?: undefined };

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
  const memoryRaw = String(formData.get("memory") ?? "").trim();
  const memory = memoryRaw === "" ? null : memoryRaw;
  const edited = formData.get("edited") === "on";

  try {
    await updatePhotoMeta(id, { memory, edited });
    await setPhotoTags(id, parseTagIds(formData));
  } catch {
    return { error: "Não foi possível salvar a foto" };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deletePhotoAction(id: number): Promise<PhotoActionResult> {
  try {
    await deletePhotoFromDb(id);
  } catch {
    return { error: "Não foi possível excluir a foto" };
  }

  revalidatePath("/", "layout");
  redirect("/admin/fotos");
}
