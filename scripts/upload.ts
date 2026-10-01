#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";
import * as p from "@clack/prompts";
import { uploadObject } from "../lib/r2";
import { getTags, insertPhoto, upsertTags, linkPhotoTags, NewTagInput } from "../lib/db";

const NEW_OPTION = "__new__";
const NONE_OPTION = "__none__";

async function promptOrExit<T>(promise: Promise<T | symbol>): Promise<T> {
  const value = await promise;
  if (p.isCancel(value)) {
    p.cancel("Operação cancelada.");
    process.exit(0);
  }
  return value as T;
}

p.intro("Upload de fotos — dn-pov");

const folder = process.argv[2];
if (!folder) {
  p.cancel("Uso: npm run upload -- <pasta>");
  process.exit(1);
}

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const imageFiles = fs
  .readdirSync(folder)
  .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

if (imageFiles.length === 0) {
  p.cancel(`Nenhuma imagem encontrada em "${folder}".`);
  process.exit(1);
}

p.log.info(`${imageFiles.length} foto(s) encontrada(s) em "${folder}".`);

const existingTags = await getTags();
const existingPlaces = existingTags.filter((tag) => tag.category === "place");
const existingColors = existingTags.filter((tag) => tag.category === "color");

// --- Local ---
const placeChoice = await promptOrExit<string>(
  p.select({
    message: "Local dessas fotos",
    options: [
      { value: NONE_OPTION, label: "Nenhum" },
      ...existingPlaces.map((tag) => ({ value: tag.name, label: tag.name })),
      { value: NEW_OPTION, label: "+ Novo local" },
    ],
  }),
);

let place: string | null = null;
let lat: number | null = null;
let lon: number | null = null;
let placeColorBg: string | null = null;
let placeColorAccent: string | null = null;

if (placeChoice === NEW_OPTION) {
  place = await promptOrExit<string>(
    p.text({
      message: "Nome do novo local",
      validate: (value) => ((value ?? "").trim() ? undefined : "Obrigatório"),
    }),
  );

  const latRaw = await promptOrExit<string>(
    p.text({ message: "Latitude (opcional)", placeholder: "-22.9" }),
  );
  const lonRaw = await promptOrExit<string>(
    p.text({ message: "Longitude (opcional)", placeholder: "-43.2" }),
  );
  lat = latRaw.trim() ? Number(latRaw) : null;
  lon = lonRaw.trim() ? Number(lonRaw) : null;

  const colorBgRaw = await promptOrExit<string>(
    p.text({
      message: "Cor de fundo do local — tema do Mapa (opcional)",
      placeholder: "#rrggbb",
    }),
  );
  const colorAccentRaw = await promptOrExit<string>(
    p.text({
      message: "Cor accent do local — tema do Mapa (opcional)",
      placeholder: "#rrggbb",
    }),
  );
  placeColorBg = colorBgRaw.trim() || null;
  placeColorAccent = colorAccentRaw.trim() || null;
} else if (placeChoice !== NONE_OPTION) {
  place = placeChoice;
}

// --- Cores ---
const selectedColors = existingColors.length
  ? await promptOrExit<string[]>(
      p.multiselect({
        message: "Tags de cor já existentes (espaço marca, enter confirma)",
        options: existingColors.map((tag) => ({ value: tag.name, label: tag.name })),
        required: false,
      }),
    )
  : [];

const newColorsRaw = await promptOrExit<string>(
  p.text({
    message: "Novas tags de cor, separadas por vírgula (opcional)",
    placeholder: "azul, verde",
  }),
);
const newColorNames = newColorsRaw
  .split(",")
  .map((name: string) => name.trim())
  .filter(Boolean);

const colorNames = [...new Set([...selectedColors, ...newColorNames])];

// --- Editada / memória ---
const edited = await promptOrExit<boolean>(
  p.confirm({ message: "Essas fotos são editadas?", initialValue: false }),
);

const memoryRaw = await promptOrExit<string>(
  p.text({
    message: "Memória (opcional — preenchida, as fotos entram em /memorias)",
  }),
);
const memory = memoryRaw.trim() || null;

const confirmed = await promptOrExit<boolean>(
  p.confirm({
    message:
      `Confirma: ${imageFiles.length} foto(s), local "${place ?? "nenhum"}", ` +
      `cores [${colorNames.join(", ") || "nenhuma"}], ${edited ? "editadas" : "originais"}` +
      `${memory ? `, memória "${memory}"` : ""}?`,
  }),
);
if (!confirmed) {
  p.cancel("Operação cancelada.");
  process.exit(0);
}

const tagInputs: NewTagInput[] = [
  ...(place
    ? [
        {
          name: place,
          category: "place" as const,
          lat,
          lon,
          colorBg: placeColorBg,
          colorAccent: placeColorAccent,
        },
      ]
    : []),
  ...colorNames.map((name) => ({ name, category: "color" as const })),
];

const tagObjects = await upsertTags(tagInputs);
const tagIds = tagObjects.map((tag) => tag.id);

for (const file of imageFiles) {
  const s = p.spinner();
  s.start(`Processando ${file}`);

  const filePath = path.join(folder, file);
  const image = sharp(filePath);
  const metadata = await image.metadata();

  const thumbBuffer = await image.clone().resize(400).webp({ quality: 80 }).toBuffer();
  const mediumBuffer = await image.clone().resize(1600).webp({ quality: 85 }).toBuffer();
  const blurBuffer = await image.clone().resize(20).webp({ quality: 20 }).toBuffer();

  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;
  const baseKey = path.parse(file).name;

  const thumbUrl = await uploadObject({
    key: `photos/${baseKey}-thumb.webp`,
    body: thumbBuffer,
    contentType: "image/webp",
  });
  const mediumUrl = await uploadObject({
    key: `photos/${baseKey}-medium.webp`,
    body: mediumBuffer,
    contentType: "image/webp",
  });

  const photoId = await insertPhoto({
    url: mediumUrl,
    thumbUrl,
    blurDataUrl,
    width: metadata.width,
    height: metadata.height,
    takenAt: null,
    edited,
    memory,
  });

  await linkPhotoTags({ photoId, tagIds });

  s.stop(`Salvo: ${file} (id ${photoId})`);
}

p.outro(`Pronto! ${imageFiles.length} foto(s) salva(s).`);
