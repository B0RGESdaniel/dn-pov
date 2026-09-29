#!/usr/bin/env node
import { upsertTags, NewTagInput } from "../lib/db";

// Fonte única das duas cores (base escura + clara pro texto) de cada tag de
// cor. Rode com `npm run seed-colors` toda vez que adicionar uma cor nova ou
// ajustar um hex — upsertTags faz COALESCE, então valores atualizados aqui
// sobrescrevem os antigos e tags já existentes não perdem outros campos.
const COLORS: { name: string; colorBg: string; colorAccent: string }[] = [
  { name: "azul", colorBg: "#0f1f3d", colorAccent: "#9db8e8" },
  { name: "verde", colorBg: "#12261a", colorAccent: "#a3d9b1" },
  { name: "vermelho", colorBg: "#331113", colorAccent: "#e8a3a8" },
  { name: "amarelo", colorBg: "#332b0f", colorAccent: "#e8d79d" },
  { name: "marrom", colorBg: "#2b1d14", colorAccent: "#d9b88f" },
  { name: "rosa", colorBg: "#331420", colorAccent: "#f0aecb" },
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
