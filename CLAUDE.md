# Repositório Pessoal de Fotos

Aplicação web para armazenar e navegar meu acervo pessoal de fotos, com foco em aprendizado (full-stack, banco de dados, storage externo, otimização de imagem) e escalabilidade (o volume de fotos vai crescer continuamente).

O visual (tema escuro, tipografia, grid, álbuns, lightbox) foi migrado de um protótipo feito no Claude Design (`dn-pov.dc.html`) — a UI foi reescrita como componentes React reais, adaptando o que fazia sentido pra arquitetura já definida aqui e simplificando o resto (ver "Divergências do protótipo" no fim deste arquivo).

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Estilo:** Tailwind CSS v4 (tema via `@theme` em `app/globals.css`, sem `tailwind.config.js`)
- **Banco de dados:** Turso (SQLite) — metadados das fotos e tags
- **Storage de imagens:** Cloudflare R2 (S3-compatible, sem custo de egress)
- **Otimização de imagem:** `sharp` (rodado localmente, fora do runtime da aplicação)
- **Deploy:** Vercel

Imagens **nunca** ficam no repositório nem no banco — só URLs e metadados. O banco não guarda binário de imagem.

## Tema visual

- Dark-only (sem alternância clara), inspirado no protótipo: fundo `#141414`, texto `#f2f0ec`, accent `#e4dcc8`, superfícies/bordas em tons de cinza escuro
- Tokens definidos em `app/globals.css` via `@theme` (`--color-background`, `--color-surface`, `--color-border`, `--color-foreground`, `--color-muted`, `--color-accent`)
- Tipografia via `next/font/google`: Archivo (texto/UI), Archivo Black (`font-display`, títulos), JetBrains Mono (`font-mono`, labels/contadores em uppercase)

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
  edited INTEGER NOT NULL DEFAULT 0,   -- original (0) vs. editada (1)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('place', 'subject', 'color')),
  lat REAL,    -- só usado quando category = 'place'
  lon REAL,
  UNIQUE (name, category)
);

CREATE TABLE photo_tags (
  photo_id INTEGER REFERENCES photos(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (photo_id, tag_id)
);
```

Tags são livres dentro de cada categoria (sem lista fixa de assuntos/cores no código) — a única regra é a categoria (`place` | `subject` | `color`), validada por `CHECK` no schema.

## Fluxo de upload (CLI, roda fora da aplicação)

```
node scripts/upload.ts ./fotos --place rio-de-janeiro --lat -22.9 --lon -43.2 --subjects arquitetura,paisagem --color azul --edited
```

Flags, todas opcionais e manuais (sem geocoding/detecção automática):

- `--place <nome>` — cria/atualiza uma tag de local; combine com `--lat`/`--lon` pra popular coordenadas (usadas futuramente na tela de Mapa)
- `--subjects <a,b,c>` — tags de assunto (lista livre)
- `--color <nome>` — tag de cor (lista livre)
- `--edited` — marca as fotos do lote como editadas (padrão: original)

1. Lê as fotos de uma pasta local
2. `sharp` gera 3 variantes por foto: thumbnail, medium (full) e um LQIP em base64 (blur placeholder)
3. Sobe thumbnail + medium pro R2
4. Insere/atualiza registro em `photos` no Turso + associa tags em `photo_tags` (criando tags novas em `tags` se necessário, com sua categoria)

Nunca mexe no código do site nem exige redeploy. Não existe upload via web — decisão explícita pra manter `sharp` fora do runtime da aplicação.

## API interna (`app/api/photos/route.ts`)

- `GET /api/photos?place=rio&subject=arquitetura,paisagem&color=azul&cursor=...` — retorna página de fotos filtradas por tag, paginação cursor-based (não offset), com cache na edge (`Cache-Control` público)
- Cada categoria (`place`/`subject`/`color`) é um parâmetro próprio: múltiplos valores na mesma categoria se combinam por **OR**; categorias diferentes se combinam por **AND**
- Filtro por tag é feito via `EXISTS` no SQL (`lib/db.ts`), não em memória

## Front-end

- `/` — grid responsivo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), infinite scroll consumindo a API paginada, chips de filtro agrupados por categoria refletidos na URL (compartilhável)
- `/albuns` — cards agrupados por local/assunto/cor (contagem + capa reais via SQL), com abas Todos/Local/Assunto/Cor; cada card linka pro `/` já filtrado
- `next/image` com `placeholder="blur"` usando o `blur_data_url` do banco
- Lightbox própria (`components/lightbox.tsx`) ao clicar na foto — modal com navegação por seta/teclado (sem lib externa, sem transição de elemento compartilhado)
- Nav global fixa (`components/site-nav.tsx`) com destaque da rota ativa

## Convenções de código

- TypeScript estrito, sem `any`
- Server Components por padrão; `"use client"` só onde precisa de interatividade (lightbox, filtro de tags, infinite scroll, nav ativa)
- Queries SQL isoladas em `lib/db.ts`, nunca inline nos componentes
- Variáveis de ambiente (`TURSO_*`, `R2_*`) sempre via `.env.local`, nunca commitadas

## Roadmap

1. ~~Estrutura base do projeto Next + Tailwind + conexão com Turso~~
2. ~~Schema do banco + script de upload (sharp + R2 + Turso)~~
3. ~~API de leitura com filtro de tags e paginação~~
4. ~~Tema visual (Tailwind v4 + fontes) migrado do protótipo~~
5. ~~Grid + infinite scroll + blur placeholder (`/`)~~
6. ~~Lightbox~~
7. ~~Álbuns (`/albuns`)~~
8. ~~Mapa (`/mapa`) — globo via lib `cobe`, pins a partir de tags de local com lat/lon; sem fotos fixas~~
9. Canvas arrastável/zoom no feed principal (substituindo o grid simples), se fizer sentido depois de usar o app
10. Cache na edge / revalidação — parcialmente feito (`Cache-Control` na API); revisitar se cache mais agressivo compensar

## Divergências do protótipo (Claude Design)

Decisões tomadas ao migrar `dn-pov.dc.html` pra código real, pra não ficarem implícitas:

- **Upload web fora de escopo**: o protótipo tem uma tela de Upload completa (drag-drop, autocomplete de local, cor "detectada"). Mantivemos upload só via CLI — construir upload web contradiria a decisão de manter `sharp` fora do runtime da aplicação.
- **Feed simplificado**: o protótipo usa um canvas infinito arrastável com zoom e layout masonry calculado em JS (sem paginação). V1 usa o grid simples já documentado; o canvas fica como possível evolução futura (item 9 do roadmap).
- **Mapa ainda não implementado**: o protótipo tem um globo 3D "fake" (continentes aproximados, sem geodata real) com locais fixos. Quando formos implementar, a ideia é usar a lib `cobe` (globo WebGL real) com overlay de fotos estilo polaroid, pins vindos de tags de local com lat/lon reais.
- **Taxonomia livre**: no protótipo, assunto e cor são listas fechadas (3 assuntos, 4 cores fixas). No app real são apenas tags normais com categoria — sem enum fixo no código.
