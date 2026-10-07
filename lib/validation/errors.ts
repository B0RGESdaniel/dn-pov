import { LibsqlError } from "@libsql/client";

// Contexto de onde o erro aconteceu — decide a mensagem certa quando é uma
// violação de UNIQUE, já que o mesmo tipo de erro do SQLite significa coisas
// diferentes dependendo de qual constraint foi violada (ver lib/schema.sql:
// UNIQUE(name, category, parent_id) cobre cidades; o índice parcial
// idx_tags_unique_root cobre país e cor, que não têm parent_id).
export type DbErrorContext = "place-root" | "place-child" | "color" | "generic";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof LibsqlError &&
    (error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      error.message.includes("UNIQUE constraint failed"))
  );
}

// Traduz um erro vindo de lib/db.ts pra uma mensagem que faz sentido pro
// usuário final do admin, sem expor código/mensagem interna do SQLite.
export function mapDbError(error: unknown, context: DbErrorContext = "generic"): string {
  if (isUniqueViolation(error)) {
    switch (context) {
      case "place-root":
        return "Já existe um país com esse nome.";
      case "place-child":
        return "Já existe uma cidade com esse nome nesse país.";
      case "color":
        return "Já existe uma tag de cor com esse nome.";
      default:
        return "Já existe um registro com esse nome.";
    }
  }

  // Erro de regra de negócio já pensado pro usuário final (ex: deleteTag
  // recusando excluir um país com cidades vinculadas) — propaga direto.
  if (error instanceof Error && !(error instanceof LibsqlError)) {
    return error.message;
  }

  return "Não foi possível salvar — tente novamente.";
}
