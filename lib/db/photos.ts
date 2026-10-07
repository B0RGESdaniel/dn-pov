import { NewPhoto, Photo, PhotosPage, TagCategory } from "@/types/photo";
import { decodePhotoCursor, encodePhotoCursor } from "@/lib/photo-cursor";
import { db } from "@/lib/db/client";
import { rowToTag } from "@/lib/db/tags";

interface LinkPhotoTagsProps {
  photoId: number;
  tagIds: number[];
}

interface GetPhotosProps {
  place?: string[];
  color?: string[];
  edited?: boolean;
  hasMemory?: boolean;
  cursor?: string;
  limit?: number;
}

export async function insertPhoto(data: NewPhoto): Promise<number> {
  const result = await db.execute({
    sql: `
      INSERT INTO photos (url, thumb_url, blur_data_url, width, height, edited, memory, sort_key) VALUES (?, ?, ?, ?, ?, ?, ?, RANDOM())
    `,
    args: [
      data.url,
      data.thumbUrl,
      data.blurDataUrl,
      data.width,
      data.height,
      data.edited ? 1 : 0,
      data.memory,
    ],
  });

  return Number(result.lastInsertRowid);
}

export async function linkPhotoTags({ photoId, tagIds }: LinkPhotoTagsProps) {
  if (tagIds.length === 0) return;
  await db.batch(
    tagIds.map((tagId) => ({
      sql: `INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)`,
      args: [photoId, tagId],
    })),
  );
}

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id: row.id as number,
    url: row.url as string,
    thumbUrl: row.thumb_url as string,
    blurDataUrl: row.blur_data_url as string | null,
    width: row.width as number | null,
    height: row.height as number | null,
    edited: Boolean(row.edited),
    memory: row.memory as string | null,
    createdAt: row.created_at as string,
    tags: [],
  };
}

export async function attachTags(photos: Photo[]): Promise<Photo[]> {
  if (photos.length === 0) return photos;

  const photoIds = photos.map((photo) => photo.id);
  const placeholders = photoIds.map(() => "?").join(", ");

  const tagsResult = await db.execute({
    sql: `
      SELECT pt.photo_id, t.id, t.name, t.category, t.lat, t.lon, t.color_bg, t.color_accent
      FROM photo_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.photo_id IN (${placeholders})
    `,
    args: photoIds,
  });

  return photos.map((photo) => ({
    ...photo,
    tags: tagsResult.rows
      .filter((row) => row.photo_id === photo.id)
      .map((row) => rowToTag(row as unknown as Record<string, unknown>)),
  }));
}

export async function getPhotoById(id: number): Promise<Photo | null> {
  const result = await db.execute({
    sql: `SELECT photos.* FROM photos WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const [photo] = await attachTags([
    rowToPhoto(result.rows[0] as unknown as Record<string, unknown>),
  ]);

  return photo;
}

export interface UpdatePhotoMetaInput {
  memory: string | null;
  edited: boolean;
}

export async function updatePhotoMeta(
  id: number,
  { memory, edited }: UpdatePhotoMetaInput,
): Promise<void> {
  await db.execute({
    sql: `UPDATE photos SET memory = ?, edited = ? WHERE id = ?`,
    args: [memory, edited ? 1 : 0, id],
  });
}

export async function setPhotoTags(
  photoId: number,
  tagIds: number[],
): Promise<void> {
  await db.execute({
    sql: `DELETE FROM photo_tags WHERE photo_id = ?`,
    args: [photoId],
  });

  await linkPhotoTags({ photoId, tagIds });
}

export async function deletePhoto(id: number): Promise<void> {
  await db.batch([
    { sql: `DELETE FROM photo_tags WHERE photo_id = ?`, args: [id] },
    { sql: `DELETE FROM photos WHERE id = ?`, args: [id] },
  ]);
}

export async function getMemories(): Promise<Photo[]> {
  const result = await db.execute(`
    SELECT photos.* FROM photos
    WHERE memory IS NOT NULL
    ORDER BY photos.id DESC
  `);

  const photos = result.rows.map((row) =>
    rowToPhoto(row as unknown as Record<string, unknown>),
  );

  return attachTags(photos);
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
  color,
  edited,
  hasMemory,
  cursor,
  limit = 20,
}: GetPhotosProps): Promise<PhotosPage> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (cursor) {
    const { sortKey: cursorSortKey, id: cursorId } = decodePhotoCursor(cursor);
    conditions.push(`(photos.sort_key, photos.id) < (?, ?)`);
    args.push(cursorSortKey, cursorId);
  }

  const categoryFilters: [TagCategory, string[] | undefined][] = [
    ["place", place],
    ["color", color],
  ];

  for (const [category, names] of categoryFilters) {
    const filter = categoryFilterClause(category, names);
    if (filter) {
      conditions.push(filter.clause);
      args.push(...filter.args);
    }
  }

  if (edited !== undefined) {
    conditions.push(`photos.edited = ?`);
    args.push(edited ? 1 : 0);
  }

  if (hasMemory !== undefined) {
    conditions.push(hasMemory ? `photos.memory IS NOT NULL` : `photos.memory IS NULL`);
  }

  args.push(limit + 1);

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT photos.* FROM photos
    ${whereClause}
    ORDER BY photos.sort_key DESC, photos.id DESC
    LIMIT ?
  `;

  const result = await db.execute({ sql, args });

  const hasNextPage = result.rows.length > limit;
  const pageRows = result.rows.slice(0, limit);

  const photos: Photo[] = pageRows.map((row) =>
    rowToPhoto(row as unknown as Record<string, unknown>),
  );

  const lastRow = pageRows[pageRows.length - 1] as unknown as Record<string, unknown>;
  const nextCursor = hasNextPage
    ? encodePhotoCursor(lastRow.sort_key as number, lastRow.id as number)
    : null;

  const photosWithTags = await attachTags(photos);

  return {
    photos: photosWithTags,
    nextCursor,
  };
}
