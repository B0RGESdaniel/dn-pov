#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { uploadObject } from "../lib/r2";
import { insertPhoto, upsertTags, linkPhotoTags, NewTagInput } from "../lib/db";

const args = process.argv.slice(2);
const folder = args[0];

function getFlag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

function getListFlag(name: string): string[] {
  const value = getFlag(name);
  return value ? value.split(",") : [];
}

const place = getFlag("--place");
const lat = getFlag("--lat");
const lon = getFlag("--lon");
const subjects = getListFlag("--subjects");
const colors = getListFlag("--color");
const edited = args.includes("--edited");

const tagInputs: NewTagInput[] = [
  ...(place
    ? [
        {
          name: place,
          category: "place" as const,
          lat: lat ? Number(lat) : null,
          lon: lon ? Number(lon) : null,
        },
      ]
    : []),
  ...subjects.map((name) => ({ name, category: "subject" as const })),
  ...colors.map((name) => ({ name, category: "color" as const })),
];

const tagObjects = await upsertTags(tagInputs);
const tagIds = tagObjects.map((tag) => tag.id);

const files = fs.readdirSync(folder);

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

const imageFiles = files.filter((file) =>
  imageExtensions.includes(path.extname(file).toLowerCase()),
);

for (const file of imageFiles) {
  const filePath = path.join(folder, file);

  const image = sharp(filePath);
  const metadata = await image.metadata();

  const thumbBuffer = await image
    .clone()
    .resize(400)
    .webp({ quality: 80 })
    .toBuffer();
  const mediumBuffer = await image
    .clone()
    .resize(1600)
    .webp({ quality: 85 })
    .toBuffer();
  const blurBuffer = await image
    .clone()
    .resize(20)
    .webp({ quality: 20 })
    .toBuffer();

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
    thumbUrl: thumbUrl,
    blurDataUrl: blurDataUrl,
    width: metadata.width,
    height: metadata.height,
    takenAt: null,
    edited,
  });

  await linkPhotoTags({ photoId, tagIds });

  console.log(`Salvo no banco: ${file} (id ${photoId})`);
}
