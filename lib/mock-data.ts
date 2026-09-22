import fs from "fs";
import path from "path";
import { Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";
import { Album, PlaceAlbum } from "@/lib/db";

// Fonte de dados 100% local pra testar as páginas sem gastar Turso/R2.
// Lê fotos/info.json (fora do repo, ver .gitignore) e serve as imagens via
// /api/mock-photo/[file], sem inserir nada no banco real nem subir nada.
// Ativado com USE_MOCK_DATA=true no .env.local.

const MOCK_DIR = path.join(process.cwd(), "fotos");

interface MockManifestEntry {
  photo: string;
  place: { name: string; lat: number; lon: number };
  subjects: string[];
  colors: string[];
  edited: boolean;
}

function readManifest(): MockManifestEntry[] {
  const raw = fs.readFileSync(path.join(MOCK_DIR, "info.json"), "utf-8");
  return JSON.parse(raw);
}

function buildMockState(): { photos: Photo[]; tags: Tag[] } {
  const entries = readManifest();
  const tagsByKey = new Map<string, Tag>();
  let nextTagId = 1;

  function getOrCreateTag(
    name: string,
    category: TagCategory,
    lat: number | null = null,
    lon: number | null = null,
  ): Tag {
    const key = `${category}:${name}`;
    const existing = tagsByKey.get(key);
    if (existing) return existing;
    const tag: Tag = { id: nextTagId++, name, category, lat, lon };
    tagsByKey.set(key, tag);
    return tag;
  }

  const photos: Photo[] = entries.map((entry, index) => {
    const tags: Tag[] = [
      getOrCreateTag(entry.place.name, "place", entry.place.lat, entry.place.lon),
      ...entry.subjects.map((name) => getOrCreateTag(name, "subject")),
      ...entry.colors.map((name) => getOrCreateTag(name, "color")),
    ];

    const url = `/api/mock-photo/${encodeURIComponent(entry.photo)}`;

    return {
      id: index + 1,
      url,
      thumbUrl: url,
      blurDataUrl: null,
      width: null,
      height: null,
      takenAt: null,
      edited: entry.edited,
      createdAt: new Date(0).toISOString(),
      tags,
    };
  });

  return { photos, tags: Array.from(tagsByKey.values()) };
}

export function getMockTags(): Tag[] {
  return buildMockState().tags;
}

interface GetMockPhotosProps {
  place?: string[];
  subject?: string[];
  color?: string[];
  cursor?: number;
  limit?: number;
}

export function getMockPhotos({
  place,
  subject,
  color,
  cursor,
  limit = 20,
}: GetMockPhotosProps): PhotosPage {
  const { photos } = buildMockState();

  const filtered = photos.filter((photo) => {
    const check = (names: string[] | undefined, category: TagCategory) =>
      !names || names.length === 0
        ? true
        : photo.tags.some((tag) => tag.category === category && names.includes(tag.name));

    return check(place, "place") && check(subject, "subject") && check(color, "color");
  });

  const sorted = [...filtered].sort((a, b) => b.id - a.id);
  const afterCursor = cursor ? sorted.filter((photo) => photo.id < cursor) : sorted;
  const page = afterCursor.slice(0, limit);
  const nextCursor = afterCursor.length > limit ? String(page[page.length - 1].id) : null;

  return { photos: page, nextCursor };
}

export function getMockAlbums(): Album[] {
  const { photos, tags } = buildMockState();

  return tags
    .map((tag): Album | null => {
      const taggedPhotos = photos.filter((photo) =>
        photo.tags.some((photoTag) => photoTag.id === tag.id),
      );
      if (taggedPhotos.length === 0) return null;

      const cover = taggedPhotos[0];
      return {
        tag,
        count: taggedPhotos.length,
        cover: { id: cover.id, thumbUrl: cover.thumbUrl, blurDataUrl: cover.blurDataUrl },
      };
    })
    .filter((album): album is Album => album !== null)
    .sort(
      (a, b) =>
        a.tag.category.localeCompare(b.tag.category) || a.tag.name.localeCompare(b.tag.name),
    );
}

export function getMockPlaces(): PlaceAlbum[] {
  return getMockAlbums()
    .filter((album) => album.tag.category === "place" && album.tag.lat != null && album.tag.lon != null)
    .map((album) => ({
      ...album,
      tag: album.tag as Tag & { lat: number; lon: number },
    }))
    .sort((a, b) => a.tag.name.localeCompare(b.tag.name));
}
