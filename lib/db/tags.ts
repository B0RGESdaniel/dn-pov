import { Tag, TagCategory } from "@/types/photo";
import { db } from "@/lib/db/client";

export interface NewTagInput {
  name: string;
  category: TagCategory;
  parentId?: number | null; // só em "place": cidade -> país
  lat?: number | null;
  lon?: number | null;
  colorBg?: string | null;
  colorAccent?: string | null;
}

// Exportado pra lib/db/photos.ts reaproveitar ao montar Photo.tags em
// attachTags — única dependência cruzada entre os dois módulos, sempre
// nessa direção (fotos depende de tags, nunca o contrário).
export function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as TagCategory,
    parentId: row.parent_id as number | null,
    lat: row.lat as number | null,
    lon: row.lon as number | null,
    colorBg: row.color_bg as string | null,
    colorAccent: row.color_accent as string | null,
  };
}

// Duas constraints de unicidade coexistem (ver lib/schema.sql): a de 3 colunas
// (name, category, parent_id) cobre cidades (parent_id preenchido); um índice
// parcial separado cobre países (parent_id NULL, que não se "autoconflita" numa
// UNIQUE normal). Por isso não dá pra usar um único ON CONFLICT — resolvemos
// com SELECT antes de decidir entre INSERT e UPDATE.
export async function upsertTags(inputs: NewTagInput[]): Promise<Tag[]> {
  const tags: Tag[] = [];

  for (const input of inputs) {
    const parentId = input.parentId ?? null;
    const whereParent = parentId == null ? "parent_id IS NULL" : "parent_id = ?";
    const whereArgs =
      parentId == null ? [input.name, input.category] : [input.name, input.category, parentId];

    const existing = await db.execute({
      sql: `SELECT id, lat, lon, color_bg, color_accent FROM tags WHERE name = ? AND category = ? AND ${whereParent}`,
      args: whereArgs,
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const id = row.id as number;
      const lat = input.lat ?? (row.lat as number | null);
      const lon = input.lon ?? (row.lon as number | null);
      const colorBg = input.colorBg ?? (row.color_bg as string | null);
      const colorAccent = input.colorAccent ?? (row.color_accent as string | null);

      await db.execute({
        sql: `UPDATE tags SET lat = ?, lon = ?, color_bg = ?, color_accent = ? WHERE id = ?`,
        args: [lat, lon, colorBg, colorAccent, id],
      });

      tags.push({ id, name: input.name, category: input.category, parentId, lat, lon, colorBg, colorAccent });
    } else {
      const result = await db.execute({
        sql: `
          INSERT INTO tags (name, category, parent_id, lat, lon, color_bg, color_accent)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          input.name,
          input.category,
          parentId,
          input.lat ?? null,
          input.lon ?? null,
          input.colorBg ?? null,
          input.colorAccent ?? null,
        ],
      });

      tags.push({
        id: Number(result.lastInsertRowid),
        name: input.name,
        category: input.category,
        parentId,
        lat: input.lat ?? null,
        lon: input.lon ?? null,
        colorBg: input.colorBg ?? null,
        colorAccent: input.colorAccent ?? null,
      });
    }
  }

  return tags;
}

export interface CoverPhoto {
  id: number;
  thumbUrl: string;
  blurDataUrl: string | null;
}

export interface TagGroup {
  tag: Tag;
  count: number;
  cover: CoverPhoto | null;
}

async function attachCovers<T extends { tag: Tag }>(
  base: T[],
  limit = 1,
): Promise<(T & { covers: CoverPhoto[] })[]> {
  if (base.length === 0) return [];

  const tagIds = base.map((item) => item.tag.id);
  const placeholders = tagIds.map(() => "?").join(", ");

  const coversResult = await db.execute({
    sql: `
      SELECT tag_id, id, thumb_url, blur_data_url
      FROM (
        SELECT
          pt.tag_id as tag_id,
          p.id as id,
          p.thumb_url as thumb_url,
          p.blur_data_url as blur_data_url,
          ROW_NUMBER() OVER (PARTITION BY pt.tag_id ORDER BY p.id DESC) as rn
        FROM photo_tags pt
        JOIN photos p ON p.id = pt.photo_id
        WHERE pt.tag_id IN (${placeholders})
      )
      WHERE rn <= ?
      ORDER BY tag_id, rn
    `,
    args: [...tagIds, limit],
  });

  const coversByTag = new Map<number, CoverPhoto[]>();

  for (const row of coversResult.rows) {
    const tagId = row.tag_id as number;
    const list = coversByTag.get(tagId) ?? [];
    list.push({
      id: row.id as number,
      thumbUrl: row.thumb_url as string,
      blurDataUrl: row.blur_data_url as string | null,
    });
    coversByTag.set(tagId, list);
  }

  return base.map((item) => ({
    ...item,
    covers: coversByTag.get(item.tag.id) ?? [],
  }));
}

export interface PlaceTagGroup {
  tag: Tag & { lat: number; lon: number };
  count: number;
  cover: TagGroup["cover"];
}

export async function getPlaces(): Promise<PlaceTagGroup[]> {
  const tagsResult = await db.execute(`
    SELECT t.id, t.name, t.category, t.parent_id, t.lat, t.lon, t.color_bg, t.color_accent, COUNT(pt.photo_id) as count
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

  const placesWithCovers = await attachCovers(placesBase, 1);
  return placesWithCovers.map(({ covers, ...rest }) => ({
    ...rest,
    cover: covers[0] ?? null,
  }));
}

// Busca direta de 1 local (país ou cidade) por nome + pai — usada pra validar
// rota em /mapa/[pais] e /mapa/[pais]/[cidade] sem precisar carregar (e
// calcular capa de) todas as tags de lugar via getPlaces().
export async function getPlaceByName(
  name: string,
  parentId: number | null,
): Promise<Tag | null> {
  const whereParent = parentId == null ? "parent_id IS NULL" : "parent_id = ?";
  const args = parentId == null ? [name] : [name, parentId];

  const result = await db.execute({
    sql: `
      SELECT id, name, category, parent_id, lat, lon, color_bg, color_accent
      FROM tags
      WHERE name = ? AND category = 'place' AND ${whereParent}
    `,
    args,
  });

  if (result.rows.length === 0) return null;
  return rowToTag(result.rows[0] as unknown as Record<string, unknown>);
}

export interface ColorTagGroup {
  tag: Tag & { colorBg: string; colorAccent: string };
  count: number;
  covers: CoverPhoto[];
}

export async function getColors(): Promise<ColorTagGroup[]> {
  const tagsResult = await db.execute(`
    SELECT t.id, t.name, t.category, t.parent_id, t.lat, t.lon, t.color_bg, t.color_accent, COUNT(pt.photo_id) as count
    FROM tags t
    JOIN photo_tags pt ON pt.tag_id = t.id
    WHERE t.category = 'color' AND t.color_bg IS NOT NULL AND t.color_accent IS NOT NULL
    GROUP BY t.id
    ORDER BY t.name
  `);

  const colorsBase = tagsResult.rows.map((row) => ({
    tag: rowToTag(row as unknown as Record<string, unknown>) as Tag & {
      colorBg: string;
      colorAccent: string;
    },
    count: Number(row.count),
  }));

  return attachCovers(colorsBase, 3);
}

export async function getTags(): Promise<Tag[]> {
  const result = await db.execute(
    `SELECT id, name, category, parent_id, lat, lon, color_bg, color_accent FROM tags ORDER BY category, name`,
  );

  return result.rows.map((row) =>
    rowToTag(row as unknown as Record<string, unknown>),
  );
}

export interface TagWithUsage extends Tag {
  photoCount: number;
}

export async function getTagsWithUsage(): Promise<TagWithUsage[]> {
  const result = await db.execute(`
    SELECT t.id, t.name, t.category, t.parent_id, t.lat, t.lon, t.color_bg, t.color_accent,
           COUNT(pt.photo_id) as photo_count
    FROM tags t
    LEFT JOIN photo_tags pt ON pt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.category, t.name
  `);

  return result.rows.map((row) => ({
    ...rowToTag(row as unknown as Record<string, unknown>),
    photoCount: Number(row.photo_count),
  }));
}

export interface UpdateTagInput {
  id: number;
  name: string;
  parentId?: number | null; // omitido = mantém o pai atual; só faz sentido em "place"
  lat?: number | null;
  lon?: number | null;
  colorBg?: string | null;
  colorAccent?: string | null;
}

// Trocar o país de uma cidade precisa re-linkar photo_tags: as fotos dessa
// cidade estão linkadas também na tag do país antigo (ver scripts/upload.ts),
// então o link velho sai e o novo entra — só pras fotos dessa cidade
// específica, nunca pras fotos de outras cidades que continuam no país antigo.
export async function updateTagById(input: UpdateTagInput): Promise<void> {
  const current = await db.execute({
    sql: `SELECT parent_id FROM tags WHERE id = ?`,
    args: [input.id],
  });
  const oldParentId = (current.rows[0]?.parent_id ?? null) as number | null;
  const newParentId = input.parentId === undefined ? oldParentId : input.parentId;

  await db.execute({
    sql: `
      UPDATE tags SET name = ?, parent_id = ?, lat = ?, lon = ?, color_bg = ?, color_accent = ?
      WHERE id = ?
    `,
    args: [
      input.name,
      newParentId,
      input.lat ?? null,
      input.lon ?? null,
      input.colorBg ?? null,
      input.colorAccent ?? null,
      input.id,
    ],
  });

  if (newParentId === oldParentId) return;

  const linkedPhotos = await db.execute({
    sql: `SELECT photo_id FROM photo_tags WHERE tag_id = ?`,
    args: [input.id],
  });
  const photoIds = linkedPhotos.rows.map((row) => row.photo_id as number);
  if (photoIds.length === 0) return;

  const placeholders = photoIds.map(() => "?").join(", ");

  if (oldParentId != null) {
    await db.execute({
      sql: `DELETE FROM photo_tags WHERE tag_id = ? AND photo_id IN (${placeholders})`,
      args: [oldParentId, ...photoIds],
    });
  }
  if (newParentId != null) {
    await db.batch(
      photoIds.map((photoId) => ({
        sql: `INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)`,
        args: [photoId, newParentId],
      })),
    );
  }
}

export async function deleteTag(id: number): Promise<void> {
  const children = await db.execute({
    sql: `SELECT COUNT(*) as c FROM tags WHERE parent_id = ?`,
    args: [id],
  });
  if (Number(children.rows[0].c) > 0) {
    throw new Error("Esse local tem cidades vinculadas — mova ou exclua elas primeiro.");
  }

  await db.batch([
    { sql: `DELETE FROM photo_tags WHERE tag_id = ?`, args: [id] },
    { sql: `DELETE FROM tags WHERE id = ?`, args: [id] },
  ]);
}
