"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Tag } from "@/types/photo";
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

export function TagMultiSelect({
  name,
  label,
  tags,
  defaultSelectedIds,
}: {
  name: string;
  label: string;
  tags: Tag[];
  defaultSelectedIds: number[];
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
            <CommandGroup>
              {tags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => toggle(tag.id)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      selected.has(tag.id) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {tag.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {selectedTags.map((tag) => (
        <input key={tag.id} type="hidden" name={name} value={tag.id} />
      ))}
    </Popover>
  );
}
