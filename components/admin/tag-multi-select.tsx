"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Tag, TagCategory } from "@/types/photo";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

function ColorSwatch({ color }: { color: string | null }) {
  return (
    <span
      className="size-3 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: color ?? "transparent" }}
    />
  );
}

export function TagMultiSelect({
  name,
  label,
  category,
  tags,
  defaultSelectedIds,
  valueField = "id",
}: {
  name: string;
  label: string;
  category: TagCategory;
  tags: Tag[];
  defaultSelectedIds: number[];
  // "id" (padrão) é o que a edição de foto grava em photo_tags; "name" é o
  // que o filtro de /admin/fotos usa, pra bater com o place/color (string[])
  // que getPhotos já aceita — mesmo contrato do /api/photos público.
  valueField?: "id" | "name";
}) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(defaultSelectedIds),
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTags = tags.filter((tag) => selected.has(tag.id));

  // Em "local" as tags são divididas em país (parentId null) e cidade —
  // separadas em duas seções pra não misturar os dois níveis da hierarquia.
  // Em "cor" não há agrupamento, só o swatch de colorBg ao lado do nome.
  const groups =
    category === "place"
      ? [
          { heading: "Países", items: tags.filter((tag) => tag.parentId === null) },
          { heading: "Cidades", items: tags.filter((tag) => tag.parentId !== null) },
        ]
      : [{ heading: label, items: tags }];

  return (
    <Popover>
      <PopoverTrigger
        disabled={tags.length === 0}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-accent"
      >
        <span className={cn("truncate", selectedTags.length === 0 && "text-muted")}>
          {tags.length === 0
            ? "Nenhuma tag cadastrada."
            : selectedTags.length === 0
              ? `Selecionar ${label.toLowerCase()}...`
              : selectedTags.map((tag) => tag.name).join(", ")}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            {groups.map(
              (group) =>
                group.items.length > 0 && (
                  <CommandGroup key={group.heading} heading={group.heading}>
                    {group.items.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => toggle(tag.id)}
                      >
                        <Check
                          className={cn(
                            "size-4 shrink-0",
                            selected.has(tag.id) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {category === "color" && <ColorSwatch color={tag.colorBg} />}
                        <span className="truncate">{tag.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ),
            )}
          </CommandList>
        </Command>
      </PopoverContent>
      {selectedTags.map((tag) => (
        <input
          key={tag.id}
          type="hidden"
          name={name}
          value={valueField === "name" ? tag.name : tag.id}
        />
      ))}
    </Popover>
  );
}
