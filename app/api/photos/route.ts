import { NextRequest, NextResponse } from "next/server";

// TODO: implementar
// GET /api/photos?tags=viagem,praia&cursor=...
// Retorna página de fotos filtradas por tag (paginação cursor-based, não offset).
// Filtro por tag via JOIN no SQL (lib/db.ts), não em memória. Cache na edge.
export async function GET(_request: NextRequest): Promise<NextResponse> {
  throw new Error("not implemented");
}
