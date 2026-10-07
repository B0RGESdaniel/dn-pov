import fs from "fs";
import path from "path";
import { Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";
import { TagGroup, ColorTagGroup, CoverPhoto, PlaceTagGroup } from "@/lib/db";
import { decodePhotoCursor, encodePhotoCursor } from "@/lib/photo-cursor";

// Fonte de dados 100% local pra testar as páginas sem gastar Turso/R2.
// Lê fotos/info.json (fora do repo, ver .gitignore) e serve as imagens via
// /api/mock-photo/[file], sem inserir nada no banco real nem subir nada.
// Ativado com USE_MOCK_DATA=true no .env.local.

const MOCK_DIR = path.join(process.cwd(), "fotos");

interface MockManifestEntry {
  photo: string;
  place: {
    name: string;
    lat: number;
    lon: number;
    colorBg?: string;
    colorAccent?: string;
    // Opcional — se ausente, a cidade fica sem país (igual hoje). Espelha o
    // fluxo de 2 passos (país -> cidade) de scripts/upload.ts.
    country?: {
      name: string;
      lat: number;
      lon: number;
      colorBg?: string;
      colorAccent?: string;
    };
  };
  colors: (string | { name: string; colorBg?: string; colorAccent?: string })[];
  edited: boolean;
  memory?: string;
  width?: number;
  height?: number;
}

function readManifest(): MockManifestEntry[] {
  const raw = fs.readFileSync(path.join(MOCK_DIR, "info.json"), "utf-8");
  return JSON.parse(raw);
}

// Hash determinístico pra simular sort_key sem Math.random() — senão a ordem
// mudaria a cada reload em dev, o que seria confuso pra testar paginação.
function mockSortKey(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildMockState(): { photos: Photo[]; tags: Tag[] } {
  const entries = readManifest();
  const tagsByKey = new Map<string, Tag>();
  let nextTagId = 1;

  // Chave inclui parentId pra permitir cidades homônimas em países diferentes
  // (mesma regra do índice parcial em lib/schema.sql).
  function getOrCreateTag(
    name: string,
    category: TagCategory,
    parentId: number | null,
    lat: number | null = null,
    lon: number | null = null,
    colorBg: string | null = null,
    colorAccent: string | null = null,
  ): Tag {
    const key = `${category}:${parentId ?? "root"}:${name}`;
    const existing = tagsByKey.get(key);
    if (existing) return existing;
    const tag: Tag = { id: nextTagId++, name, category, parentId, lat, lon, colorBg, colorAccent };
    tagsByKey.set(key, tag);
    return tag;
  }

  const photos: Photo[] = entries.map((entry, index) => {
    const countryTag = entry.place.country
      ? getOrCreateTag(
          entry.place.country.name,
          "place",
          null,
          entry.place.country.lat,
          entry.place.country.lon,
          entry.place.country.colorBg ?? null,
          entry.place.country.colorAccent ?? null,
        )
      : null;

    const placeTag = getOrCreateTag(
      entry.place.name,
      "place",
      countryTag?.id ?? null,
      entry.place.lat,
      entry.place.lon,
      entry.place.colorBg ?? null,
      entry.place.colorAccent ?? null,
    );

    const tags: Tag[] = [
      placeTag,
      // Mesma ideia do upload real (scripts/upload.ts): a foto fica linkada
      // na cidade E no país, pra "Explorar" no país funcionar sem resolver filhos.
      ...(countryTag ? [countryTag] : []),
      ...entry.colors.map((color) =>
        typeof color === "string"
          ? getOrCreateTag(color, "color", null)
          : getOrCreateTag(
              color.name,
              "color",
              null,
              null,
              null,
              color.colorBg ?? null,
              color.colorAccent ?? null,
            ),
      ),
    ];

    const url = `/api/mock-photo/${encodeURIComponent(entry.photo)}`;

    return {
      id: index + 1,
      url,
      thumbUrl: url,
      blurDataUrl: null,
      width: entry.width ?? null,
      height: entry.height ?? null,
      edited: entry.edited,
      memory: entry.memory ?? null,
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
  color?: string[];
  cursor?: string;
  limit?: number;
}

export function getMockPhotos({
  place,
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

    return check(place, "place") && check(color, "color");
  });

  // Mesma ordem/cursor de lib/db.ts::getPhotos: (sort_key, id) como par de
  // comparação — ver lib/photo-cursor.ts.
  const sorted = [...filtered].sort((a, b) => {
    const aKey = mockSortKey(a.id);
    const bKey = mockSortKey(b.id);
    if (aKey !== bKey) return aKey < bKey ? 1 : -1;
    return b.id - a.id;
  });

  const afterCursor = cursor
    ? (() => {
        const { sortKey: cursorSortKey, id: cursorId } = decodePhotoCursor(cursor);
        return sorted.filter((photo) => {
          const key = mockSortKey(photo.id);
          return key < cursorSortKey || (key === cursorSortKey && photo.id < cursorId);
        });
      })()
    : sorted;

  const page = afterCursor.slice(0, limit);
  const lastPhoto = page[page.length - 1];
  const nextCursor =
    afterCursor.length > limit && lastPhoto
      ? encodePhotoCursor(mockSortKey(lastPhoto.id), lastPhoto.id)
      : null;

  return { photos: page, nextCursor };
}

export function getMockMemories(): Photo[] {
  const { photos } = buildMockState();

  return photos.filter((photo) => photo.memory != null).sort((a, b) => b.id - a.id);
}

function getMockTagGroups(): (TagGroup & { covers: CoverPhoto[] })[] {
  const { photos, tags } = buildMockState();

  return tags
    .map((tag): (TagGroup & { covers: CoverPhoto[] }) | null => {
      const taggedPhotos = photos.filter((photo) =>
        photo.tags.some((photoTag) => photoTag.id === tag.id),
      );
      if (taggedPhotos.length === 0) return null;

      const covers = taggedPhotos
        .slice(0, 3)
        .map((photo) => ({
          id: photo.id,
          thumbUrl: photo.thumbUrl,
          blurDataUrl: photo.blurDataUrl,
        }));

      return {
        tag,
        count: taggedPhotos.length,
        cover: covers[0] ?? null,
        covers,
      };
    })
    .filter((group): group is TagGroup & { covers: CoverPhoto[] } => group !== null)
    .sort(
      (a, b) =>
        a.tag.category.localeCompare(b.tag.category) || a.tag.name.localeCompare(b.tag.name),
    );
}

export function getMockPlaces(): PlaceTagGroup[] {
  return getMockTagGroups()
    .filter((group) => group.tag.category === "place" && group.tag.lat != null && group.tag.lon != null)
    .map((group) => ({
      ...group,
      tag: group.tag as Tag & { lat: number; lon: number },
    }))
    .sort((a, b) => a.tag.name.localeCompare(b.tag.name));
}

export function getMockColors(): ColorTagGroup[] {
  return getMockTagGroups()
    .filter(
      (group) =>
        group.tag.category === "color" &&
        group.tag.colorBg != null &&
        group.tag.colorAccent != null,
    )
    .map((group) => ({
      tag: group.tag as Tag & { colorBg: string; colorAccent: string },
      count: group.count,
      covers: group.covers,
    }))
    .sort((a, b) => a.tag.name.localeCompare(b.tag.name));
}
