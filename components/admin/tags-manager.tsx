"use client";

import { ChevronRight } from "lucide-react";
import { ReactNode, useState, useTransition } from "react";
import { TagWithUsage } from "@/lib/db/tags";
import {
  createTag,
  deleteTagAction,
  updateTag,
} from "@/app/admin/(dashboard)/tags/actions";

export function TagsManager({ tags }: { tags: TagWithUsage[] }) {
  return (
    <div className="space-y-10">
      <PlaceTagsSection tags={tags.filter((tag) => tag.category === "place")} />
      <ColorTagsSection tags={tags.filter((tag) => tag.category === "color")} />
    </div>
  );
}

function makeDeleteHandler(
  startTransition: (callback: () => void | Promise<void>) => void,
  setError: (error: string | null) => void,
) {
  return function handleDelete(tag: TagWithUsage) {
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
  };
}

// País -> cidades (parent_id). Expande/colapsa por país; "+ Nova cidade" vive
// dentro do grupo certo, "+ Novo país" é o único nível de topo.
function PlaceTagsSection({ tags }: { tags: TagWithUsage[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [creatingCityFor, setCreatingCityFor] = useState<number | null>(null);
  const [creatingCountry, setCreatingCountry] = useState(false);
  const handleDelete = makeDeleteHandler(startTransition, setError);

  const countries = tags.filter((tag) => tag.parentId === null);
  const citiesByCountry = new Map<number, TagWithUsage[]>();
  for (const tag of tags) {
    if (tag.parentId == null) continue;
    const list = citiesByCountry.get(tag.parentId) ?? [];
    list.push(tag);
    citiesByCountry.set(tag.parentId, list);
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">Local</h2>

      <ul className="mb-4 space-y-2">
        {countries.length === 0 && (
          <li className="text-sm text-muted">Nenhum país ainda.</li>
        )}

        {countries.map((country) => {
          const cities = citiesByCountry.get(country.id) ?? [];
          const isExpanded = expanded.has(country.id);

          return (
            <li key={country.id} className="rounded-md border border-border bg-surface">
              {editingId === country.id ? (
                <div className="p-2">
                  <PlaceTagForm
                    tag={country}
                    level="country"
                    countries={countries}
                    onDone={() => setEditingId(null)}
                    onError={setError}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(country.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <ColorDots tag={country} />
                    <span className="text-foreground">{country.name}</span>
                    <span className="text-xs text-muted">
                      {country.photoCount} foto(s) · {cities.length} cidade(s)
                    </span>
                  </button>

                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setEditingId(country.id)}
                      className="text-muted hover:text-foreground"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(country)}
                      disabled={isPending}
                      className="text-muted hover:text-red-400 disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}

              {isExpanded && (
                <ul className="space-y-2 border-t border-border p-2 pl-6">
                  {cities.length === 0 && creatingCityFor !== country.id && (
                    <li className="text-sm text-muted">Nenhuma cidade ainda.</li>
                  )}

                  {cities.map((city) =>
                    editingId === city.id ? (
                      <li key={city.id}>
                        <PlaceTagForm
                          tag={city}
                          level="city"
                          countries={countries}
                          onDone={() => setEditingId(null)}
                          onError={setError}
                        />
                      </li>
                    ) : (
                      <li
                        key={city.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <ColorDots tag={city} />
                          <span className="text-foreground">{city.name}</span>
                          <span className="text-xs text-muted">{city.photoCount} foto(s)</span>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <button
                            type="button"
                            onClick={() => setEditingId(city.id)}
                            className="text-muted hover:text-foreground"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(city)}
                            disabled={isPending}
                            className="text-muted hover:text-red-400 disabled:opacity-60"
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    ),
                  )}

                  {creatingCityFor === country.id ? (
                    <li>
                      <PlaceTagForm
                        level="city"
                        countries={countries}
                        defaultCountryId={country.id}
                        onDone={() => setCreatingCityFor(null)}
                        onError={setError}
                      />
                    </li>
                  ) : (
                    <li>
                      <button
                        type="button"
                        onClick={() => setCreatingCityFor(country.id)}
                        className="text-sm text-muted hover:text-foreground"
                      >
                        + Nova cidade
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {creatingCountry ? (
        <PlaceTagForm
          level="country"
          countries={countries}
          onDone={() => setCreatingCountry(false)}
          onError={setError}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreatingCountry(true)}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-background"
        >
          + Novo país
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </section>
  );
}

// Formulário único pra país e cidade — só a cidade mostra o seletor de país
// (reatribuir move a cidade, ver updateTagById em lib/db/tags.ts).
function PlaceTagForm({
  tag,
  level,
  countries,
  defaultCountryId,
  onDone,
  onError,
}: {
  tag?: TagWithUsage;
  level: "country" | "city";
  countries: TagWithUsage[];
  defaultCountryId?: number;
  onDone: () => void;
  onError: (error: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [colorBg, setColorBg] = useState(tag?.colorBg ?? "");
  const [colorAccent, setColorAccent] = useState(tag?.colorAccent ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    onError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = tag ? await updateTag(tag.id, formData) : await createTag(formData);
      if (result?.error) {
        onError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
      {!tag && <input type="hidden" name="category" value="place" />}

      {level === "city" ? (
        <label className="flex flex-col gap-1 text-xs text-muted">
          País
          <select
            name="parentId"
            required
            defaultValue={tag?.parentId ?? defaultCountryId}
            className="h-9 w-32 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          {fieldErrors.parentId?.[0] && (
            <span className="text-xs text-red-400">{fieldErrors.parentId[0]}</span>
          )}
        </label>
      ) : (
        // País nunca tem pai — explícito (string vazia = NULL pro parseOptionalNumber).
        <input type="hidden" name="parentId" value="" />
      )}

      <Field label="Nome" name="name" defaultValue={tag?.name} required error={fieldErrors.name?.[0]} />
      <Field
        label="Lat"
        name="lat"
        type="number"
        step="any"
        defaultValue={tag?.lat ?? ""}
        error={fieldErrors.lat?.[0]}
      />
      <Field
        label="Lon"
        name="lon"
        type="number"
        step="any"
        defaultValue={tag?.lon ?? ""}
        error={fieldErrors.lon?.[0]}
      />
      <ColorField
        label="Cor fundo"
        name="colorBg"
        value={colorBg}
        onChange={setColorBg}
        error={fieldErrors.colorBg?.[0]}
      />
      <ColorField
        label="Cor accent"
        name="colorAccent"
        value={colorAccent}
        onChange={setColorAccent}
        error={fieldErrors.colorAccent?.[0]}
      />
      <ContrastPreview bg={colorBg} accent={colorAccent} />

      <button
        type="submit"
        disabled={isPending}
        className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-background disabled:opacity-60"
      >
        {tag ? "Salvar" : "Adicionar"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="h-9 rounded-md border border-border px-3 text-sm text-muted"
      >
        Cancelar
      </button>
    </form>
  );
}

// Tags de cor não têm hierarquia — continua uma lista flat, igual sempre foi.
function ColorTagsSection({ tags }: { tags: TagWithUsage[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [colorBg, setColorBg] = useState("");
  const [colorAccent, setColorAccent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const handleDelete = makeDeleteHandler(startTransition, setError);

  function handleCreate(formData: FormData) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createTag(formData);
      if (result?.error) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      // colorBg/colorAccent são controlados (pro preview de contraste), então
      // precisam de reset manual — os outros campos resetam sozinhos.
      setColorBg("");
      setColorAccent("");
    });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-muted">Cor</h2>

      <ul className="mb-4 space-y-2">
        {tags.length === 0 && <li className="text-sm text-muted">Nenhuma tag ainda.</li>}

        {tags.map((tag) =>
          editingId === tag.id ? (
            <ColorEditRow
              key={tag.id}
              tag={tag}
              onDone={() => setEditingId(null)}
              onError={setError}
            />
          ) : (
            <li
              key={tag.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <ColorDots tag={tag} />
                <span className="text-foreground">{tag.name}</span>
                <span className="text-xs text-muted">{tag.photoCount} foto(s)</span>
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
        <input type="hidden" name="category" value="color" />
        <Field label="Nome" name="name" required error={fieldErrors.name?.[0]} />
        <ColorField
          label="Cor fundo"
          name="colorBg"
          value={colorBg}
          onChange={setColorBg}
          error={fieldErrors.colorBg?.[0]}
        />
        <ColorField
          label="Cor accent"
          name="colorAccent"
          value={colorAccent}
          onChange={setColorAccent}
          error={fieldErrors.colorAccent?.[0]}
        />
        <ContrastPreview bg={colorBg} accent={colorAccent} />
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

function ColorEditRow({
  tag,
  onDone,
  onError,
}: {
  tag: TagWithUsage;
  onDone: () => void;
  onError: (error: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [colorBg, setColorBg] = useState(tag.colorBg ?? "");
  const [colorAccent, setColorAccent] = useState(tag.colorAccent ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    onError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateTag(tag.id, formData);
      if (result?.error) {
        onError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      onDone();
    });
  }

  return (
    <li className="rounded-md border border-border bg-surface px-3 py-2">
      <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
        <Field label="Nome" name="name" defaultValue={tag.name} required error={fieldErrors.name?.[0]} />
        <ColorField
          label="Cor fundo"
          name="colorBg"
          value={colorBg}
          onChange={setColorBg}
          error={fieldErrors.colorBg?.[0]}
        />
        <ColorField
          label="Cor accent"
          name="colorAccent"
          value={colorAccent}
          onChange={setColorAccent}
          error={fieldErrors.colorAccent?.[0]}
        />
        <ContrastPreview bg={colorBg} accent={colorAccent} />
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

function ColorDots({ tag }: { tag: TagWithUsage }): ReactNode {
  if (!tag.colorBg && !tag.colorAccent) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {tag.colorBg && (
        <span
          className="h-4 w-4 rounded-full border border-border"
          style={{ backgroundColor: tag.colorBg }}
          title="Cor fundo"
        />
      )}
      {tag.colorAccent && (
        <span
          className="h-4 w-4 rounded-full border border-border"
          style={{ backgroundColor: tag.colorAccent }}
          title="Cor accent"
        />
      )}
    </span>
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
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  placeholder?: string;
  error?: string;
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
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Input nativo type="color" (devolve hex direto, já é o próprio preview)
// pareado com o campo de texto existente — clicar no quadrado abre o
// seletor do navegador/SO, ou digita o hex direto no texto; os dois ficam
// sincronizados via state controlado no componente pai.
function ColorField({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}): ReactNode {
  // input[type=color] exige um hex de 6 dígitos válido — enquanto o texto
  // não chegar nesse formato (vazio, incompleto, inválido), o seletor cai
  // num cinza neutro sem sobrescrever o que já foi digitado.
  const pickerValue = HEX_COLOR_RE.test(value) ? value : "#000000";

  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <span className="flex items-center gap-1.5">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} (seletor visual)`}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-background p-0.5"
        />
        <input
          name={name}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#rrggbb"
          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
        />
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

// Preview auxiliar pra avaliar contraste visual: quadrado na cor de fundo
// com um "A" grande na cor accent — mesma combinação usada de verdade no
// tema dinâmico de /mapa e /cor (TagTheme). Cai num cinza neutro enquanto o
// hex digitado não for válido, em vez de quebrar o style inline.
function ContrastPreview({
  bg,
  accent,
}: {
  bg: string;
  accent: string;
}): ReactNode {
  const safeBg = HEX_COLOR_RE.test(bg) ? bg : "#2a2a2a";
  const safeAccent = HEX_COLOR_RE.test(accent) ? accent : "#8b867e";

  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      Contraste
      <div
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-lg font-bold"
        style={{ backgroundColor: safeBg, color: safeAccent }}
        aria-hidden
      >
        A
      </div>
    </div>
  );
}
