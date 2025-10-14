-- Seed de fornecedores baseado em src/data/providers.ts
-- Execute no Supabase Studio (SQL Editor) ou via psql

-- Recomendado: garantir que a tabela exista (ajuste se necessário)
-- create table if not exists public.providers (
--   id text primary key,
--   name text not null,
--   category text not null,
--   priceFrom numeric not null,
--   rating numeric not null default 0,
--   ratingCount integer not null default 0,
--   mainImage text not null,
--   radiusKm integer not null,
--   hasCNPJ boolean not null default false,
--   includesMonitor boolean not null default false,
--   cepAreas text[] not null default '{}'
-- );

insert into public.providers (
  id, name, category, priceFrom, rating, ratingCount, mainImage, radiusKm, hasCNPJ, includesMonitor, cepAreas
) values
  (
    '1', 'Castelo Inflável Divertix', 'Brinquedos', 250, 4.8, 32,
    'https://images.unsplash.com/photo-1503708928676-1cb796a0891e?q=80&w=1200&auto=format&fit=crop',
    30, true, true, ARRAY['01234-000','05000-000']::text[]
  ),
  (
    '2', 'Buffet Sabor de Festa', 'Buffet', 1200, 4.9, 54,
    'https://images.unsplash.com/photo-1533777168198-6bde9a1edfd0?q=80&w=1200&auto=format&fit=crop',
    50, true, false, ARRAY['04000-000','06000-000']::text[]
  ),
  (
    '3', 'Decora Tudo Festas', 'Decoração', 800, 4.6, 19,
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
    40, false, false, ARRAY['07000-000']::text[]
  ),
  (
    '4', 'AnimaKids Recreação', 'Recreação', 450, 4.7, 25,
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
    35, true, true, ARRAY['01234-000']::text[]
  ),
  (
    '5', 'Bolos da Maria', 'Bolo', 180, 4.5, 12,
    'https://images.unsplash.com/photo-1568051243858-01bc1294db1b?q=80&w=1200&auto=format&fit=crop',
    20, false, false, ARRAY['02000-000','03000-000']::text[]
  )
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  priceFrom = excluded.priceFrom,
  rating = excluded.rating,
  ratingCount = excluded.ratingCount,
  mainImage = excluded.mainImage,
  radiusKm = excluded.radiusKm,
  hasCNPJ = excluded.hasCNPJ,
  includesMonitor = excluded.includesMonitor,
  cepAreas = excluded.cepAreas;

-- Opcional: se já executou supabase/cep_prefixes_setup.sql, a trigger atualizará cepPrefixes5 automaticamente.
-- Caso contrário, execute o script de prefixes para habilitar paginação por CEP no servidor.