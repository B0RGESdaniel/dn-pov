#!/usr/bin/env node
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import * as p from "@clack/prompts";
import { db } from "../lib/db";
import { r2 } from "../lib/r2";

p.intro("Apagar todas as fotos — dn-pov");

const result = await db.execute("SELECT id, url, thumb_url FROM photos");
const photoCount = result.rows.length;

if (photoCount === 0) {
  p.outro("Nenhuma foto para apagar.");
  process.exit(0);
}

const confirmed = await p.confirm({
  message:
    `Isso vai apagar ${photoCount} foto(s) do banco e seus arquivos no R2 ` +
    `(as tags de local/cor são mantidas). Não pode ser desfeito. Confirma?`,
  initialValue: false,
});
if (p.isCancel(confirmed) || !confirmed) {
  p.cancel("Operação cancelada.");
  process.exit(0);
}

const publicUrlPrefix = `${process.env.R2_PUBLIC_URL}/`;
const keys = result.rows.flatMap((row) =>
  [row.url as string, row.thumb_url as string]
    .filter((url) => url.startsWith(publicUrlPrefix))
    .map((url) => url.slice(publicUrlPrefix.length)),
);

const s = p.spinner();

if (keys.length > 0) {
  s.start(`Apagando ${keys.length} arquivo(s) no R2`);
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }
  s.stop(`${keys.length} arquivo(s) apagado(s) no R2.`);
}

s.start("Apagando fotos do banco");
await db.batch([
  { sql: "DELETE FROM photo_tags", args: [] },
  { sql: "DELETE FROM photos", args: [] },
  // photos usa AUTOINCREMENT — sem isso o SQLite nunca reutiliza os ids antigos
  { sql: "DELETE FROM sqlite_sequence WHERE name = 'photos'", args: [] },
]);
s.stop(`${photoCount} foto(s) apagada(s) do banco.`);

p.outro("Pronto.");
