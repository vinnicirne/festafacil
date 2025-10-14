# Deploy na Vercel + Banco no Supabase

Este projeto é um app Vite React. A UI continua funcional com dados locais; quando as variáveis `VITE_SUPABASE_*` forem definidas, utilitários de banco ficam prontos para uso.

## 1) Supabase

1. Crie um projeto no Supabase (Organização/Projeto novos).
2. Em Database » SQL Editor, crie a tabela de fornecedores (exemplo):

```sql
create table if not exists providers (
  id text primary key,
  name text not null,
  category text not null,
  priceFrom numeric not null,
  rating numeric not null default 0,
  ratingCount integer not null default 0,
  mainImage text not null,
  radiusKm integer not null,
  hasCNPJ boolean not null default false,
  includesMonitor boolean not null default false,
  cepAreas text[] not null default '{}'
);
```

3. Segurança: para leitura pública simples, habilite RLS e crie política de leitura, ou mantenha RLS desabilitado apenas para testes.

```sql
-- Exemplo (com RLS habilitado) permitindo SELECT público
alter table providers enable row level security;
create policy "public read" on providers for select using (true);
```

4. Em Project Settings » API, copie `Project URL` e `anon public key`.
5. Defina no painel da Vercel como variáveis de ambiente (ver seção Vercel) ou crie `.env.local` com:

```
VITE_SUPABASE_URL=... 
VITE_SUPABASE_ANON_KEY=...
```

### Setup automático (Windows PowerShell)

Para automatizar a criação da tabela, políticas, CEP prefixes e seed, execute o script:

1. Obtenha sua Connection String (URI) em Project Settings » Database (ex.: `postgres://...`).
2. Abra um PowerShell na raiz do projeto e rode:

```
./scripts/setup_supabase.ps1 -PgUri "postgres://USUARIO:SENHA@HOST:PORT/postgres?sslmode=require" -SupabaseUrl "https://SEU-PROJECT-REF.supabase.co" -AnonKey "SEU_ANON_PUBLIC"
```

O script fará:
- Criar/ajustar a tabela `public.providers` com RLS e política de leitura pública.
- Executar `supabase/cep_prefixes_setup.sql` (coluna `cepPrefixes5`, trigger e índice GIN).
- Executar `supabase/seed_providers.sql` (insere/atualiza 5 fornecedores de exemplo).
- Atualizar `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Após concluir, reinicie o dev server (`npm run dev`).

### Paginação por CEP (server-side)

Para habilitar paginação e count diretamente no Supabase quando o filtro "Apenas CEP" estiver ativo, execute o script SQL abaixo no Supabase Studio (SQL Editor) com permissões adequadas:

Arquivo: `supabase/cep_prefixes_setup.sql`
- Cria a coluna `cepPrefixes5` (text[]) em `providers`.
- Preenche a coluna a partir de `cepAreas` existentes.
- Cria função + trigger para manter `cepPrefixes5` sincronizada em inserts/updates.
- Cria índice GIN para acelerar `contains`.

Após executar, a busca passa a usar o filtro de prefixo (`contains('cepPrefixes5', [q5])`) e a paginação/count serão feitas no banco.

## 2) Vercel

1. Faça login na Vercel e importe este repositório.
2. Build & Output Settings (auto):
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Variáveis de ambiente (Project » Settings » Environment Variables):
   - Todas as chaves do `.env.example` que desejar ajustar, em especial:
     - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
     - Parametrizações de UX como `VITE_NAVBAR_SEARCH_DEBOUNCE_MS`, etc.
4. Deploy. A Vercel detecta Vite automaticamente.

## 3) Uso do Supabase no código

- Cliente: `src/utils/supabase.ts` exporta `getSupabase()` (retorna `null` se env não estiver configurado) e `fetchProvidersFromDb()` de exemplo.
- A UI atual usa dados locais (`src/data/providers.ts`). Quando quiser migrar:
  - Troque o uso do array local por chamadas ao Supabase (ex.: `fetchProvidersFromDb`) de forma assíncrona.
  - Mantenha fallback local se o cliente estiver `null` para ambiente sem backend.

## 4) Dicas

- Para ambientes: use `.env.local` (dev) e variáveis no painel da Vercel (prod). Não commitar `.env.local`.
- CORS: Supabase já libera o domínio do projeto; adicione o domínio da Vercel se necessário em Project Settings.
- Segurança: se publicar escrita/updates, ajuste RLS e políticas conforme necessidade.