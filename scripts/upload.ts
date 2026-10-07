#!/usr/bin/env node
import crypto from "crypto";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import * as p from "@clack/prompts";
import { uploadObject } from "../lib/r2";
import { getTags, upsertTags, NewTagInput } from "../lib/db/tags";
import { insertPhoto, linkPhotoTags } from "../lib/db/photos";

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

// Usado tanto pra "+ Novo país" quanto "+ Nova cidade" — os dois níveis têm
// os mesmos campos (lat/lon + cor do tema do Mapa).
async function promptLocationDetails(label: string): Promise<{
  lat: number | null;
  lon: number | null;
  colorBg: string | null;
  colorAccent: string | null;
}> {
  const latRaw = await promptOrExit<string>(
    p.text({ message: `Latitude do ${label} (opcional)`, placeholder: "-22.9" }),
  );
  const lonRaw = await promptOrExit<string>(
    p.text({ message: `Longitude do ${label} (opcional)`, placeholder: "-43.2" }),
  );
  const colorBgRaw = await promptOrExit<string>(
    p.text({
      message: `Cor de fundo do ${label} — tema do Mapa (opcional)`,
      placeholder: "#rrggbb",
    }),
  );
  const colorAccentRaw = await promptOrExit<string>(
    p.text({
      message: `Cor accent do ${label} — tema do Mapa (opcional)`,
      placeholder: "#rrggbb",
    }),
  );

  return {
    lat: latRaw.trim() ? Number(latRaw) : null,
    lon: lonRaw.trim() ? Number(lonRaw) : null,
    colorBg: colorBgRaw.trim() || null,
    colorAccent: colorAccentRaw.trim() || null,
  };
}

p.intro("Upload de fotos — dn-pov");

const folder = process.argv[2];
if (!folder) {
  p.cancel("Uso: npm run upload -- <pasta>");
  process.exit(1);
}

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const allFiles = fs.readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile());
const imageFiles = allFiles
  .map((entry) => entry.name)
  .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));
const skippedFiles = allFiles
  .map((entry) => entry.name)
  .filter((file) => !imageExtensions.includes(path.extname(file).toLowerCase()));

if (imageFiles.length === 0) {
  p.cancel(`Nenhuma imagem encontrada em "${folder}".`);
  process.exit(1);
}

p.log.info(`${imageFiles.length} foto(s) encontrada(s) em "${folder}".`);
if (skippedFiles.length > 0) {
  p.log.warn(
    `${skippedFiles.length} arquivo(s) ignorado(s) (extensão não suportada): ${skippedFiles.join(", ")}`,
  );
}

const existingTags = await getTags();
const existingPlaces = existingTags.filter((tag) => tag.category === "place");
const existingColors = existingTags.filter((tag) => tag.category === "color");
const existingCountries = existingPlaces.filter((tag) => tag.parentId === null);

// --- País ---
const countryChoice = await promptOrExit<string>(
  p.select({
    message: "País dessas fotos",
    options: [
      { value: NONE_OPTION, label: "Nenhum" },
      ...existingCountries.map((tag) => ({ value: String(tag.id), label: tag.name })),
      { value: NEW_OPTION, label: "+ Novo país" },
    ],
  }),
);

let countryId: number | null = null;
let countryName: string | null = null;

if (countryChoice === NEW_OPTION) {
  countryName = await promptOrExit<string>(
    p.text({
      message: "Nome do novo país",
      validate: (value) => ((value ?? "").trim() ? undefined : "Obrigatório"),
    }),
  );
  const details = await promptLocationDetails("país");
  const [countryTag] = await upsertTags([
    { name: countryName, category: "place", parentId: null, ...details },
  ]);
  countryId = countryTag.id;
} else if (countryChoice !== NONE_OPTION) {
  const existing = existingCountries.find((tag) => tag.id === Number(countryChoice))!;
  countryId = existing.id;
  countryName = existing.name;
}

// --- Cidade (só pergunta se escolheu um país) ---
let cityId: number | null = null;
let cityName: string | null = null;

if (countryId !== null) {
  const existingCities = existingPlaces.filter((tag) => tag.parentId === countryId);

  const cityChoice = await promptOrExit<string>(
    p.select({
      message: `Cidade em ${countryName}`,
      options: [
        { value: NONE_OPTION, label: "Nenhuma" },
        ...existingCities.map((tag) => ({ value: String(tag.id), label: tag.name })),
        { value: NEW_OPTION, label: "+ Nova cidade" },
      ],
    }),
  );

  if (cityChoice === NEW_OPTION) {
    cityName = await promptOrExit<string>(
      p.text({
        message: "Nome da nova cidade",
        validate: (value) => ((value ?? "").trim() ? undefined : "Obrigatório"),
      }),
    );
    const details = await promptLocationDetails("cidade");
    const [cityTag] = await upsertTags([
      { name: cityName, category: "place", parentId: countryId, ...details },
    ]);
    cityId = cityTag.id;
  } else if (cityChoice !== NONE_OPTION) {
    const existing = existingCities.find((tag) => tag.id === Number(cityChoice))!;
    cityId = existing.id;
    cityName = existing.name;
  }
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

const locationLabel =
  countryId === null ? "nenhum" : cityId === null ? countryName : `${cityName}, ${countryName}`;

const confirmed = await promptOrExit<boolean>(
  p.confirm({
    message:
      `Confirma: ${imageFiles.length} foto(s), local "${locationLabel}", ` +
      `cores [${colorNames.join(", ") || "nenhuma"}], ${edited ? "editadas" : "originais"}` +
      `${memory ? `, memória "${memory}"` : ""}?`,
  }),
);
if (!confirmed) {
  p.cancel("Operação cancelada.");
  process.exit(0);
}

const colorTagInputs: NewTagInput[] = colorNames.map((name) => ({
  name,
  category: "color" as const,
}));
const colorTagObjects = await upsertTags(colorTagInputs);

// País e cidade ficam linkados juntos na foto (quando os dois existem) — "Explorar"
// no país já funciona filtrando só por ele, sem precisar resolver as cidades filhas.
const tagIds = [
  ...(countryId !== null ? [countryId] : []),
  ...(cityId !== null ? [cityId] : []),
  ...colorTagObjects.map((tag) => tag.id),
];

for (const file of imageFiles) {
  const s = p.spinner();
  s.start(`Processando ${file}`);

  const originalPath = path.join(folder, file);
  const isHeic = [".heic", ".heif"].includes(path.extname(file).toLowerCase());

  // sharp/libheif aqui não decodifica HEVC (licenciamento) — converte via sips antes.
  let filePath = originalPath;
  let tempPath: string | null = null;
  if (isHeic) {
    tempPath = path.join(os.tmpdir(), `${path.parse(file).name}-${crypto.randomUUID()}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", originalPath, "--out", tempPath]);
    filePath = tempPath;
  }

  const image = sharp(filePath).rotate(); // aplica a orientação do EXIF antes de redimensionar
  const metadata = await image.metadata();
  const isSideways = metadata.orientation != null && metadata.orientation >= 5;
  const width = isSideways ? metadata.height : metadata.width;
  const height = isSideways ? metadata.width : metadata.height;

  const thumbBuffer = await image.clone().resize(400).webp({ quality: 80 }).toBuffer();
  const mediumBuffer = await image.clone().resize(1600).webp({ quality: 85 }).toBuffer();
  const blurBuffer = await image.clone().resize(20).webp({ quality: 20 }).toBuffer();

  if (tempPath) fs.rmSync(tempPath, { force: true });

  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;
  const uniqueKey = crypto.randomUUID();

  const thumbUrl = await uploadObject({
    key: `photos/${uniqueKey}-thumb.webp`,
    body: thumbBuffer,
    contentType: "image/webp",
  });
  const mediumUrl = await uploadObject({
    key: `photos/${uniqueKey}-medium.webp`,
    body: mediumBuffer,
    contentType: "image/webp",
  });

  const photoId = await insertPhoto({
    url: mediumUrl,
    thumbUrl,
    blurDataUrl,
    width,
    height,
    edited,
    memory,
  });

  await linkPhotoTags({ photoId, tagIds });

  s.stop(`Salvo: ${file} (id ${photoId})`);
}

p.outro(`Pronto! ${imageFiles.length} foto(s) salva(s).`);
