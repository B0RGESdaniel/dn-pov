import { createClient } from "@libsql/client";
import { NewPhoto, Photo, PhotosPage, Tag } from "@/types/photo";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface LinkPhotoTagsProps {
  photoId: number;
  tagIds: number[];
}

interface GetPhotosProps {
  tags?: string[];
  cursor?: number;
  limit?: number;
}

export async function upsertTags(names: string[]): Promise<Tag[]> {
  for (const name of names) {
    await db.execute({
      sql: `INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
      args: [name],
    });
  }

  const placeholders = names.map(() => "?").join(", ");

  const result = await db.execute({
    sql: `SELECT id, name FROM tags WHERE name in (${placeholders})`,
    args: names,
  });

  return result.rows as unknown as Tag[];
}

export async function insertPhoto(data: NewPhoto): Promise<number> {
  const result = await db.execute({
    sql: `
      INSERT INTO photos (url, thumb_url, blur_data_url, width, height, taken_at) VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.url,
      data.thumbUrl,
      data.blurDataUrl,
      data.width,
      data.height,
      data.takenAt,
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

export async function getPhotos({
  tags,
  cursor,
  limit = 20,
}: GetPhotosProps): Promise<PhotosPage> {
  const hasTagFilter = tags && tags.length > 0;

  const joinClause = hasTagFilter
    ? `JOIN photo_tags pt ON pt.photo_id = photos.id JOIN tags t ON t.id = pt.tag_id`
    : "";

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (cursor) {
    conditions.push("photos.id < ?");
    args.push(cursor);
  }

  if (hasTagFilter) {
    const placeholders = tags!.map(() => "?").join(", ");
    conditions.push(`t.name IN (${placeholders})`);
    args.push(...tags!);
  }

  args.push(limit + 1);

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT DISTINCT photos.* FROM photos
    ${joinClause}
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
          SELECT pt.photo_id, t.id, t.name
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
      .map((row) => ({ id: row.id, name: row.name }) as Tag),
  }));

  return {
    photos: photosWithTags,
    nextCursor: hasNextPage ? String(nextCursor) : null,
  };
}
