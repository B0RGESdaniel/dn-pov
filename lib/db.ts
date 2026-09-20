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

    tags.push(result.rows[0] as unknown as Tag);
  }

  return tags;
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
      .map(
        (row) =>
          ({
            id: row.id,
            name: row.name,
            category: row.category,
            lat: row.lat,
            lon: row.lon,
          }) as unknown as Tag,
      ),
  }));

  return {
    photos: photosWithTags,
    nextCursor: hasNextPage ? String(nextCursor) : null,
  };
}
