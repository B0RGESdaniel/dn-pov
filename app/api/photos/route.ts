import { NextRequest, NextResponse } from "next/server";
import { getPhotos } from "@/lib/photos-source";

// GET /api/photos?place=rio&subject=arquitetura,paisagem&color=azul&cursor=...
// Cada categoria filtra por OR entre si; categorias diferentes se combinam por AND.
// Paginação cursor-based (não offset). Filtro via JOIN/EXISTS no SQL (lib/db.ts), não em memória.
function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").filter(Boolean);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const place = parseList(searchParams.get("place"));
  const subject = parseList(searchParams.get("subject"));
  const color = parseList(searchParams.get("color"));
  const cursor = searchParams.get("cursor") ?? undefined;

  const page = await getPhotos({ place, subject, color, cursor });

  return NextResponse.json(page, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
