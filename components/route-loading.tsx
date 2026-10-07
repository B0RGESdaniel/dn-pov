// Conteúdo compartilhado pelos loading.tsx de cada rota — o arquivo em si
// precisa existir em cada segmento (convenção do Next App Router, não dá pra
// "herdar" de uma rota irmã), mas o JSX/estilo fica centralizado aqui.
export function RouteLoading({ fullPage = true }: { fullPage?: boolean }) {
  return (
    <p
      className={`p-8 text-center font-mono text-xs uppercase tracking-widest text-muted ${
        fullPage ? "flex min-h-screen items-center justify-center" : ""
      }`}
    >
      carregando…
    </p>
  );
}
