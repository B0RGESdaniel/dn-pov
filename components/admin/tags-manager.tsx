"use client";

import { ReactNode, useState, useTransition } from "react";
import { TagCategory } from "@/types/photo";
import { TagWithUsage } from "@/lib/db";
import {
  createTag,
  deleteTagAction,
  updateTag,
} from "@/app/admin/(dashboard)/tags/actions";

const CATEGORY_LABELS: Record<TagCategory, string> = {
  place: "Local",
  subject: "Assunto",
  color: "Cor",
};

const CATEGORIES: TagCategory[] = ["place", "subject", "color"];

export function TagsManager({ tags }: { tags: TagWithUsage[] }) {
  return (
    <div className="space-y-10">
      {CATEGORIES.map((category) => (
        <TagCategorySection
          key={category}
          category={category}
          tags={tags.filter((tag) => tag.category === category)}
        />
      ))}
    </div>
  );
}

function TagCategorySection({
  category,
  tags,
}: {
  category: TagCategory;
  tags: TagWithUsage[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTag(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleDelete(tag: TagWithUsage) {
    const confirmed = window.confirm(
      tag.photoCount > 0
        ? `Excluir "${tag.name}"? ${tag.photoCount} foto(s) vão perder essa tag.`
        : `Excluir "${tag.name}"?`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteTagAction(tag.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">
        {CATEGORY_LABELS[category]}
      </h2>

      <ul className="mb-4 space-y-2">
        {tags.length === 0 && (
          <li className="text-sm text-muted">Nenhuma tag ainda.</li>
        )}

        {tags.map((tag) =>
          editingId === tag.id ? (
            <TagEditRow
              key={tag.id}
              tag={tag}
              category={category}
              onDone={() => setEditingId(null)}
              onError={setError}
            />
          ) : (
            <li
              key={tag.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-3">
                {category !== "subject" && tag.colorBg && (
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: tag.colorBg }}
                  />
                )}
                <span className="text-foreground">{tag.name}</span>
                <span className="text-xs text-muted">
                  {tag.photoCount} foto(s)
                </span>
              </div>

              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setEditingId(tag.id)}
                  className="text-muted hover:text-foreground"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tag)}
                  disabled={isPending}
                  className="text-muted hover:text-red-400 disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      <form action={handleCreate} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="category" value={category} />
        <Field label="Nome" name="name" required />
        {category === "place" && (
          <>
            <Field label="Lat" name="lat" type="number" step="any" />
            <Field label="Lon" name="lon" type="number" step="any" />
          </>
        )}
        {(category === "place" || category === "color") && (
          <>
            <Field label="Cor fundo" name="colorBg" placeholder="#rrggbb" />
            <Field
              label="Cor accent"
              name="colorAccent"
              placeholder="#rrggbb"
            />
          </>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-background disabled:opacity-60"
        >
          Adicionar
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </section>
  );
}

function TagEditRow({
  tag,
  category,
  onDone,
  onError,
}: {
  tag: TagWithUsage;
  category: TagCategory;
  onDone: () => void;
  onError: (error: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    onError(null);
    startTransition(async () => {
      const result = await updateTag(tag.id, formData);
      if (result?.error) {
        onError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <li className="rounded-md border border-border bg-surface px-3 py-2">
      <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
        <Field label="Nome" name="name" defaultValue={tag.name} required />
        {category === "place" && (
          <>
            <Field
              label="Lat"
              name="lat"
              type="number"
              step="any"
              defaultValue={tag.lat ?? ""}
            />
            <Field
              label="Lon"
              name="lon"
              type="number"
              step="any"
              defaultValue={tag.lon ?? ""}
            />
          </>
        )}
        {(category === "place" || category === "color") && (
          <>
            <Field
              label="Cor fundo"
              name="colorBg"
              placeholder="#rrggbb"
              defaultValue={tag.colorBg ?? ""}
            />
            <Field
              label="Cor accent"
              name="colorAccent"
              placeholder="#rrggbb"
              defaultValue={tag.colorAccent ?? ""}
            />
          </>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-background disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-9 rounded-md border border-border px-3 text-sm text-muted"
        >
          Cancelar
        </button>
      </form>
    </li>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  placeholder?: string;
}): ReactNode {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        placeholder={placeholder}
        className="h-9 w-32 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}
