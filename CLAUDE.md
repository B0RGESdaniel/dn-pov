# Repositório Pessoal de Fotos

Aplicação web para armazenar e navegar meu acervo pessoal de fotos, com foco em aprendizado (full-stack, banco de dados, storage externo, otimização de imagem) e escalabilidade (o volume de fotos vai crescer continuamente).

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Estilo:** Tailwind CSS
- **Banco de dados:** Turso (SQLite) — metadados das fotos e tags
- **Storage de imagens:** Cloudflare R2 (S3-compatible, sem custo de egress)
- **Otimização de imagem:** `sharp` (rodado localmente, fora do runtime da aplicação)
- **Deploy:** Vercel

Imagens **nunca** ficam no repositório nem no banco — só URLs e metadados. O banco não guarda binário de imagem.

## Modelo de dados

```sql
CREATE TABLE photos (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,          -- versão full/medium no R2
  thumb_url TEXT NOT NULL,    -- versão thumbnail no R2
  blur_data_url TEXT,         -- LQIP em base64 para placeholder
  width INTEGER,
  height INTEGER,
  taken_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE photo_tags (
  photo_id INTEGER REFERENCES photos(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (photo_id, tag_id)
);
```

## Fluxo de upload (CLI, roda fora da aplicação)

```
node scripts/upload.js ./fotos --tags viagem,japao
```

1. Lê as fotos de uma pasta local
2. `sharp` gera 3 variantes por foto: thumbnail, medium (full) e um LQIP em base64 (blur placeholder)
3. Sobe thumbnail + medium pro R2
4. Insere/atualiza registro em `photos` no Turso + associa tags em `photo_tags` (criando tags novas em `tags` se necessário)

Nunca mexe no código do site nem exige redeploy.

## API interna (`app/api/photos/route.ts`)

- `GET /api/photos?tags=viagem,praia&cursor=...` — retorna página de fotos filtradas por tag, paginação cursor-based (não offset), com cache na edge
- Filtro por tag é feito via JOIN no SQL, não em memória

## Front-end

- Grid responsivo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`)
- Infinite scroll consumindo a API paginada
- `next/image` com `placeholder="blur"` usando o `blur_data_url` do banco
- Lightbox ao clicar na foto (`yet-another-react-lightbox` ou implementação própria)
- Filtro de tags via query string, refletido na URL (compartilhável)

## Convenções de código

- TypeScript estrito, sem `any`
- Server Components por padrão; `"use client"` só onde precisa de interatividade (lightbox, filtro de tags, infinite scroll)
- Queries SQL isoladas em `lib/db.ts`, nunca inline nos componentes
- Variáveis de ambiente (`TURSO_*`, `R2_*`) sempre via `.env.local`, nunca commitadas

## Roadmap (ordem sugerida)

1. Estrutura base do projeto Next + Tailwind + conexão com Turso
2. Schema do banco + script de upload (sharp + R2 + Turso)
3. API de leitura com filtro de tags e paginação
4. Grid + infinite scroll + blur placeholder
5. Lightbox
6. Cache na edge / revalidação
