// Tipos de domínio para fotos e tags, refletindo o schema definido em CLAUDE.md
// (tabelas `photos`, `tags`, `photo_tags`).

export type TagCategory = "place" | "subject" | "color";

export type Photo = {
  id: number;
  url: string;
  thumbUrl: string;
  blurDataUrl: string | null;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  edited: boolean;
  createdAt: string;
  tags: Tag[];
};

export type NewPhoto = Omit<Photo, "id" | "createdAt" | "tags">;

export type Tag = {
  id: number;
  name: string;
  category: TagCategory;
  lat: number | null;
  lon: number | null;
};

export type PhotosPage = {
  photos: Photo[];
  nextCursor: string | null;
};
