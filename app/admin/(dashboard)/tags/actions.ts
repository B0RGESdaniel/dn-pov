"use server";

import { revalidatePath } from "next/cache";
import {
  deleteTag as deleteTagFromDb,
  updateTagById,
  upsertTags,
} from "@/lib/db";
import { mapDbError } from "@/lib/validation/errors";
import {
  colorTagSchema,
  pickTagContext,
  placeCitySchema,
  placeCountrySchema,
} from "@/lib/validation/tags";

export type TagActionResult =
  | { error?: undefined; fieldErrors?: undefined }
  | { error: string; fieldErrors?: Record<string, string[]> };

function readTagFormRaw(formData: FormData) {
  return {
    name: formData.get("name"),
    lat: formData.get("lat"),
    lon: formData.get("lon"),
    colorBg: formData.get("colorBg"),
    colorAccent: formData.get("colorAccent"),
  };
}

export async function createTag(formData: FormData): Promise<TagActionResult> {
  const context = pickTagContext(formData);
  const raw = readTagFormRaw(formData);

  if (context === "color") {
    const parsed = colorTagSchema.safeParse(raw);
    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten();
      return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
    }

    try {
      await upsertTags([{ ...parsed.data, category: "color", parentId: null }]);
    } catch (error) {
      return { error: mapDbError(error, context) };
    }

    revalidatePath("/", "layout");
    return {};
  }

  if (context === "place-child") {
    const parsed = placeCitySchema.safeParse({ ...raw, parentId: formData.get("parentId") });
    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten();
      return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
    }

    try {
      await upsertTags([{ ...parsed.data, category: "place" }]);
    } catch (error) {
      return { error: mapDbError(error, context) };
    }

    revalidatePath("/", "layout");
    return {};
  }

  const parsed = placeCountrySchema.safeParse(raw);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = parsed.error.flatten();
    return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
  }

  try {
    await upsertTags([{ ...parsed.data, category: "place", parentId: null }]);
  } catch (error) {
    return { error: mapDbError(error, context) };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updateTag(
  id: number,
  formData: FormData,
): Promise<TagActionResult> {
  const context = pickTagContext(formData);
  const raw = readTagFormRaw(formData);

  if (context === "color") {
    const parsed = colorTagSchema.safeParse(raw);
    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten();
      return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
    }

    try {
      // Cor não tem hierarquia — omite parentId pra manter o atual (sempre null).
      await updateTagById({ id, ...parsed.data });
    } catch (error) {
      return { error: mapDbError(error, context) };
    }

    revalidatePath("/", "layout");
    return {};
  }

  if (context === "place-child") {
    const parsed = placeCitySchema.safeParse({ ...raw, parentId: formData.get("parentId") });
    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten();
      return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
    }

    try {
      await updateTagById({ id, ...parsed.data });
    } catch (error) {
      return { error: mapDbError(error, context) };
    }

    revalidatePath("/", "layout");
    return {};
  }

  const parsed = placeCountrySchema.safeParse(raw);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = parsed.error.flatten();
    return { error: formErrors[0] ?? "Dados inválidos", fieldErrors };
  }

  try {
    // País nunca tem pai — explícito, pra garantir que não fique "órfão" de
    // um parentId antigo caso o registro já tivesse um valor estranho.
    await updateTagById({ id, ...parsed.data, parentId: null });
  } catch (error) {
    return { error: mapDbError(error, context) };
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
