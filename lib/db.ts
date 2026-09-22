import { createClient } from "@libsql/client";
import { NewPhoto, Photo, PhotosPage, Tag, TagCategory } from "@/types/photo";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface LinkPhotoTagsProps {
  photoId: number;
  tagIds: number[];
}

interface GetPhotosProps {
  place?: string[];
  subject?: string[];
  color?: string[];
  cursor?: number;
  limit?: number;
}

export interface NewTagInput {
  name: string;
  category: TagCategory;
  lat?: number | null;
  lon?: number | null;
}

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as TagCategory,
    lat: row.lat as number | null,
    lon: row.lon as number | null,
  };
}

export async function upsertTags(inputs: NewTagInput[]): Promise<Tag[]> {
  const tags: Tag[] = [];

  for (const input of inputs) {
    await db.execute({
      sql: `
        INSERT INTO tags (name, category, lat, lon) VALUES (?, ?, ?, ?)
        ON CONFLICT(name, category) DO UPDATE SET
          lat = COALESCE(excluded.lat, tags.lat),
          lon = COALESCE(excluded.lon, tags.lon)
      `,
      args: [input.name, input.category, input.lat ?? null, input.lon ?? null],
    });

    const result = await db.execute({
      sql: `SELECT id, name, category, lat, lon FROM tags WHERE name = ? AND category = ?`,
      args: [input.name, input.category],
    });

    tags.push(rowToTag(result.rows[0] as unknown as Record<string, unknown>));
  }

  return tags;
}

export interface Album {
  tag: Tag;
  count: number;
  cover: {
    id: number;
    thumbUrl: string;
    blurDataUrl: string | null;
  } | null;
}

async function attachCovers<T extends { tag: Tag }>(
  base: T[],
): Promise<(T & { cover: Album["cover"] })[]> {
  if (base.length === 0) return [];

  const tagIds = base.map((item) => item.tag.id);
  const placeholders = tagIds.map(() => "?").join(", ");

  const coversResult = await db.execute({
    sql: `
      SELECT pt.tag_id, p.id, p.thumb_url, p.blur_data_url
      FROM photo_tags pt
      JOIN photos p ON p.id = pt.photo_id
      WHERE pt.tag_id IN (${placeholders})
      ORDER BY p.id DESC
    `,
    args: tagIds,
  });

  const coverByTag = new Map<
    number,
    { id: number; thumbUrl: string; blurDataUrl: string | null }
  >();

  for (const row of coversResult.rows) {
    const tagId = row.tag_id as number;
    if (coverByTag.has(tagId)) continue;
    coverByTag.set(tagId, {
      id: row.id as number,
      thumbUrl: row.thumb_url as string,
      blurDataUrl: row.blur_data_url as string | null,
    });
  }

  return base.map((item) => ({
    ...item,
    cover: coverByTag.get(item.tag.id) ?? null,
  }));
}

export async function getAlbums(): Promise<Album[]> {
  const tagsResult = await db.execute(`
    SELECT t.id, t.name, t.category, t.lat, t.lon, COUNT(pt.photo_id) as count
    FROM tags t
    JOIN photo_tags pt ON pt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.category, t.name
  `);

  const albumsBase = tagsResult.rows.map((row) => ({
    tag: rowToTag(row as unknown as Record<string, unknown>),
    count: Number(row.count),
  }));

  return attachCovers(albumsBase);
}

export interface PlaceAlbum {
  tag: Tag & { lat: number; lon: number };
  count: number;
  cover: Album["cover"];
}

export async function getPlaces(): Promise<PlaceAlbum[]> {
  const tagsResult = await db.execute(`
    SELECT t.id, t.name, t.category, t.lat, t.lon, COUNT(pt.photo_id) as count
    FROM tags t
    JOIN photo_tags pt ON pt.tag_id = t.id
    WHERE t.category = 'place' AND t.lat IS NOT NULL AND t.lon IS NOT NULL
    GROUP BY t.id
    ORDER BY t.name
  `);

  const placesBase = tagsResult.rows.map((row) => ({
    tag: rowToTag(row as unknown as Record<string, unknown>) as Tag & {
      lat: number;
      lon: number;
    },
    count: Number(row.count),
  }));

  return attachCovers(placesBase);
}

export async function getTags(): Promise<Tag[]> {
  const result = await db.execute(
    `SELECT id, name, category, lat, lon FROM tags ORDER BY category, name`,
  );

  return result.rows.map((row) =>
    rowToTag(row as unknown as Record<string, unknown>),
  );
}

export async function insertPhoto(data: NewPhoto): Promise<number> {
  const result = await db.execute({
    sql: `
      INSERT INTO photos (url, thumb_url, blur_data_url, width, height, taken_at, edited) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.url,
      data.thumbUrl,
      data.blurDataUrl,
      data.width,
      data.height,
      data.takenAt,
      data.edited ? 1 : 0,
    ],
  });

  return Number(result.lastInsertRowid);
}

export async function linkPhotoTags({ photoId, tagIds }: LinkPhotoTagsProps) {
  for (const tagId of tagIds) {
    await db.execute({
      sql: `INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)`,
      args: [photoId, tagId],
    });
  }
}

function categoryFilterClause(
  category: TagCategory,
  names: string[] | undefined,
): { clause: string; args: (string | number)[] } | null {
  if (!names || names.length === 0) return null;

  const placeholders = names.map(() => "?").join(", ");

  return {
    clause: `EXISTS (
      SELECT 1 FROM photo_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.photo_id = photos.id AND t.category = ? AND t.name IN (${placeholders})
    )`,
    args: [category, ...names],
  };
}

export async function getPhotos({
  place,
  subject,
  color,
  cursor,
  limit = 20,
}: GetPhotosProps): Promise<PhotosPage> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (cursor) {
    conditions.push("photos.id < ?");
    args.push(cursor);
  }

  const categoryFilters: [TagCategory, string[] | undefined][] = [
    ["place", place],
    ["subject", subject],
    ["color", color],
  ];

  for (const [category, names] of categoryFilters) {
    const filter = categoryFilterClause(category, names);
    if (filter) {
      conditions.push(filter.clause);
      args.push(...filter.args);
    }
  }

  args.push(limit + 1);

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT photos.* FROM photos
    ${whereClause}
    ORDER BY photos.id DESC
    LIMIT ?
  `;

  const result = await db.execute({ sql, args });

  const hasNextPage = result.rows.length > limit;

  const photos: Photo[] = result.rows.slice(0, limit).map((row) => ({
    id: row.id as number,
    url: row.url as string,
    thumbUrl: row.thumb_url as string,
    blurDataUrl: row.blur_data_url as string | null,
    width: row.width as number | null,
    height: row.height as number | null,
    takenAt: row.taken_at as string | null,
    edited: Boolean(row.edited),
    createdAt: row.created_at as string,
    tags: [],
  }));

  const nextCursor = hasNextPage ? photos[photos.length - 1].id : null;

  const photoIds = photos.map((p) => p.id);
  const tagPlaceholders = photoIds.map(() => "?").join(", ");

  const tagsResult =
    photoIds.length > 0
      ? await db.execute({
          sql: `
          SELECT pt.photo_id, t.id, t.name, t.category, t.lat, t.lon
          FROM photo_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.photo_id IN (${tagPlaceholders})
        `,
          args: photoIds,
        })
      : { rows: [] };

  const photosWithTags: Photo[] = photos.map((photo) => ({
    ...photo,
    tags: tagsResult.rows
      .filter((row) => row.photo_id === photo.id)
      .map((row) => rowToTag(row as unknown as Record<string, unknown>)),
  }));

  return {
    photos: photosWithTags,
    nextCursor: hasNextPage ? String(nextCursor) : null,
  };
}
