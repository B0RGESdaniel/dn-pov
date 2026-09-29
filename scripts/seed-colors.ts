#!/usr/bin/env node
import { upsertTags, NewTagInput } from "../lib/db";

// Fonte única das duas cores (base escura + clara pro texto) de cada tag de
// cor. Rode com `npm run seed-colors` toda vez que adicionar uma cor nova ou
// ajustar um hex — upsertTags faz COALESCE, então valores atualizados aqui
// sobrescrevem os antigos e tags já existentes não perdem outros campos.
const COLORS: { name: string; colorBg: string; colorAccent: string }[] = [
  { name: "azul", colorBg: "#1e3a8a", colorAccent: "#60a5fa" },
  { name: "verde", colorBg: "#14532d", colorAccent: "#4ade80" },
  { name: "vermelho", colorBg: "#7f1d1d", colorAccent: "#f87171" },
  { name: "amarelo", colorBg: "#78350f", colorAccent: "#fbbf24" },
  { name: "marrom", colorBg: "#431407", colorAccent: "#fb923c" },
  { name: "rosa", colorBg: "#831843", colorAccent: "#FC9CCE" },
];

const tagInputs: NewTagInput[] = COLORS.map((color) => ({
  name: color.name,
  category: "color" as const,
  colorBg: color.colorBg,
  colorAccent: color.colorAccent,
}));

const tags = await upsertTags(tagInputs);

for (const tag of tags) {
  console.log(`OK: ${tag.name} (bg ${tag.colorBg}, accent ${tag.colorAccent})`);
}
