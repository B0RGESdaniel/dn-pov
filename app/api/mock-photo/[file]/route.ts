import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Serve os arquivos de fotos/ (fora do repo, ver .gitignore) direto do disco.
// Só existe pra sustentar o modo USE_MOCK_DATA=true (lib/mock-data.ts) — não
// envolve R2 nem o banco, é puramente local/dev.
const MOCK_DIR = path.join(process.cwd(), "fotos");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const safeName = path.basename(file);
  const filePath = path.join(MOCK_DIR, safeName);

  if (!filePath.startsWith(MOCK_DIR) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(safeName).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
