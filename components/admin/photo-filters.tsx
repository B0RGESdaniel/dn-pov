import Link from "next/link";
import { Tag } from "@/types/photo";
import { TagMultiSelect } from "@/components/admin/tag-multi-select";

// Mesmo contrato de query do /api/photos (place/color por nome, OR dentro da
// categoria, AND entre categorias) — só acrescenta edited/hasMemory por cima.
export interface AdminPhotoFilters {
  place?: string[];
  color?: string[];
  edited?: boolean;
  hasMemory?: boolean;
}

// Único ponto que monta a URL de /admin/fotos — usado tanto pelo form de
// filtros (via GET nativo do form) quanto pelo "Carregar mais" da página,
// pra paginação nunca perder o filtro ativo.
export function buildFotosHref({
  place,
  color,
  edited,
  hasMemory,
  cursor,
}: AdminPhotoFilters & { cursor?: string }): string {
  const search = new URLSearchParams();
  for (const name of place ?? []) search.append("place", name);
  for (const name of color ?? []) search.append("color", name);
  if (edited) search.set("edited", "true");
  if (hasMemory) search.set("hasMemory", "true");
  if (cursor) search.set("cursor", cursor);

  const qs = search.toString();
  return qs ? `/admin/fotos?${qs}` : "/admin/fotos";
}

export function PhotoFiltersForm({
  placeTags,
  colorTags,
  filters,
}: {
  placeTags: Tag[];
  colorTags: Tag[];
  filters: AdminPhotoFilters;
}) {
  const selectedPlaceIds = placeTags
    .filter((tag) => filters.place?.includes(tag.name))
    .map((tag) => tag.id);
  const selectedColorIds = colorTags
    .filter((tag) => filters.color?.includes(tag.name))
    .map((tag) => tag.id);

  return (
    <form
      action="/admin/fotos"
      method="GET"
      className="mb-6 flex flex-wrap items-end gap-4"
    >
      <div className="w-48">
        <label className="mb-1.5 block text-xs text-muted">Lugar</label>
        <TagMultiSelect
          name="place"
          valueField="name"
          label="Local"
          category="place"
          tags={placeTags}
          defaultSelectedIds={selectedPlaceIds}
        />
      </div>

      <div className="w-48">
        <label className="mb-1.5 block text-xs text-muted">Cor</label>
        <TagMultiSelect
          name="color"
          valueField="name"
          label="Cor"
          category="color"
          tags={colorTags}
          defaultSelectedIds={selectedColorIds}
        />
      </div>

      <label className="flex h-9 items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="edited" value="true" defaultChecked={filters.edited} />
        Editada
      </label>

      <label className="flex h-9 items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="hasMemory"
          value="true"
          defaultChecked={filters.hasMemory}
        />
        Possui memória
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-background"
        >
          Salvar
        </button>
        <Link href="/admin/fotos" className="text-sm text-muted hover:text-foreground">
          Limpar
        </Link>
      </div>
    </form>
  );
}
