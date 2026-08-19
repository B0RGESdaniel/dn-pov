#!/usr/bin/env node

// TODO: implementar
// CLI de upload de fotos, roda fora da aplicação (node scripts/upload.js <pasta> --tags a,b,c):
// 1. Lê as fotos de uma pasta local
// 2. Usa sharp para gerar thumbnail, medium (full) e um LQIP em base64 (blur placeholder)
// 3. Sobe thumbnail + medium pro R2 (lib/r2.ts)
// 4. Insere/atualiza registro em `photos` no Turso e associa tags em `photo_tags`
//    (lib/db.ts), criando tags novas em `tags` se necessário
