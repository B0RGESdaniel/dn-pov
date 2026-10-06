"use server";

import { revalidatePath } from "next/cache";
import {
  deleteTag as deleteTagFromDb,
  updateTagById,
  upsertTags,
} from "@/lib/db";
import { TagCategory } from "@/types/photo";

export type TagActionResult = { error: string } | { error?: undefined };

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createTag(formData: FormData): Promise<TagActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as TagCategory;

  if (!name) return { error: "Nome é obrigatório" };

  try {
    await upsertTags([
      {
        name,
        category,
        // parentId só existe em "place" (país = null, cidade = id do país).
        parentId: category === "place" ? parseOptionalNumber(formData.get("parentId")) : null,
        lat: parseOptionalNumber(formData.get("lat")),
        lon: parseOptionalNumber(formData.get("lon")),
        colorBg: parseOptionalString(formData.get("colorBg")),
        colorAccent: parseOptionalString(formData.get("colorAccent")),
      },
    ]);
  } catch {
    return { error: "Não foi possível criar a tag" };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updateTag(
  id: number,
  formData: FormData,
): Promise<TagActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório" };

  // Campo ausente (tags de cor não mandam parentId) = mantém o pai atual;
  // presente (mesmo vazio, caso do país) = usa o valor explicitamente.
  const rawParentId = formData.get("parentId");
  const parentId = rawParentId === null ? undefined : parseOptionalNumber(rawParentId);

  try {
    await updateTagById({
      id,
      name,
      parentId,
      lat: parseOptionalNumber(formData.get("lat")),
      lon: parseOptionalNumber(formData.get("lon")),
      colorBg: parseOptionalString(formData.get("colorBg")),
      colorAccent: parseOptionalString(formData.get("colorAccent")),
    });
  } catch {
    return { error: "Já existe uma tag com esse nome nessa categoria" };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deleteTagAction(id: number): Promise<TagActionResult> {
  try {
    await deleteTagFromDb(id);
  } catch (error) {
    // deleteTag lança uma mensagem já pensada pro usuário final (ex: país com
    // cidades vinculadas) — propaga em vez de esconder atrás de um genérico.
    return { error: error instanceof Error ? error.message : "Não foi possível excluir a tag" };
  }

  revalidatePath("/", "layout");
  return {};
}
