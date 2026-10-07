import { z } from "zod";

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const updatePhotoSchema = z.object({
  memory: z.preprocess(toStringOrEmpty, z.string().trim().max(2000, "Memória muito longa")),
  edited: z.boolean(),
  tagIds: z.array(z.number().int().positive()),
});

export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
