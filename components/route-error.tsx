// Conteúdo compartilhado pelos error.tsx de cada rota — mesmo motivo do
// RouteLoading (components/route-loading.tsx): o arquivo precisa existir por
// segmento, mas o JSX fica num só lugar. `showMessage` só é ligado no admin
// (área autenticada) pra ajudar a debugar erro de conexão com o Turso sem
// abrir o terminal — nas rotas públicas o detalhe técnico não é exibido.
export function RouteError({
  error,
  reset,
  fullPage = true,
  showMessage = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  fullPage?: boolean;
  showMessage?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-4 p-8 text-center ${
        fullPage ? "min-h-screen justify-center" : ""
      }`}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-muted">algo deu errado</p>
      {showMessage && <p className="max-w-md font-mono text-xs text-red-400">{error.message}</p>}
      <button
        onClick={reset}
        className="rounded-full border border-accent/30 px-6 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:border-accent"
      >
        tentar de novo
      </button>
    </div>
  );
}
