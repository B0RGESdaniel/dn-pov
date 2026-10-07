interface TagThemeProps {
  colorBg?: string | null;
  colorAccent?: string | null;
}

const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{6}|var\(--[a-z-]+\))$/;

function safeColor(value?: string | null) {
  return value && SAFE_COLOR_RE.test(value) ? value : null;
}

// Retema a UI pras cores de um local/cor em foco (mesma técnica de CSS vars
// de components/globe-map.tsx), sem exigir uma hero ou contexto entre rotas.
// Server Component (sem "use client"/useEffect) — a página já sabe a cor no
// request, então sai como <style> inline já no HTML, sem flash do tema
// padrão antes do primeiro paint. Some junto com a página ao navegar
// (client-side), revertendo pro tema padrão sem precisar de cleanup manual.
export function TagTheme({ colorBg, colorAccent }: TagThemeProps) {
  const bg = safeColor(colorBg);
  const accent = safeColor(colorAccent);
  if (!bg && !accent) return null;

  const declarations = [
    bg && `--background:${bg}`,
    accent && `--accent:${accent}`,
  ]
    .filter(Boolean)
    .join(";");

  return <style>{`:root{${declarations}}`}</style>;
}
