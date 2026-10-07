import { z } from "zod";
import { DbErrorContext } from "@/lib/validation/errors";

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const nameSchema = z.preprocess(
  toStringOrEmpty,
  z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
);

function optionalCoordinate(min: number, max: number, label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} inválido` })
      .min(min, `${label} deve estar entre ${min} e ${max}`)
      .max(max, `${label} deve estar entre ${min} e ${max}`)
      .optional(),
  );
}

const optionalHexColor = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use o formato #rrggbb")
    .optional(),
);

const requiredParentId = z
  .preprocess(emptyToUndefined, z.coerce.number({ error: "País é obrigatório" }))
  .refine((value): value is number => Number.isFinite(value), {
    message: "País é obrigatório",
  });

// País: nunca tem pai.
export const placeCountrySchema = z.object({
  name: nameSchema,
  lat: optionalCoordinate(-90, 90, "Lat"),
  lon: optionalCoordinate(-180, 180, "Lon"),
  colorBg: optionalHexColor,
  colorAccent: optionalHexColor,
});

// Cidade: igual ao país, mas com país (parentId) obrigatório.
export const placeCitySchema = placeCountrySchema.extend({
  parentId: requiredParentId,
});

// Cor: sem hierarquia, mesmos campos de nome/cor do país.
export const colorTagSchema = z.object({
  name: nameSchema,
  colorBg: optionalHexColor,
  colorAccent: optionalHexColor,
});

export type PlaceCountryInput = z.infer<typeof placeCountrySchema>;
export type PlaceCityInput = z.infer<typeof placeCitySchema>;
export type ColorTagInput = z.infer<typeof colorTagSchema>;

// Os forms de país e cor nunca mandam `parentId` no FormData (país manda
// hidden="" só na criação — ver tags-manager.tsx); cidade sempre manda,
// vazio ou com o id do país. Esse é o único sinal confiável pra decidir o
// schema certo tanto na criação quanto na edição, já que `category` só é
// enviado no form de criação (na edição a categoria da tag não muda).
export function pickTagContext(formData: FormData): DbErrorContext {
  if (!formData.has("parentId")) return "color";
  const raw = formData.get("parentId");
  const isCity = typeof raw === "string" && raw.trim() !== "";
  return isCity ? "place-child" : "place-root";
}
