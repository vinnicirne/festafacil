import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function getArg(name){
  const i = process.argv.indexOf(`--${name}`)
  if(i>=0 && process.argv[i+1]) return process.argv[i+1]
  return process.env[name.toUpperCase()] || ''
}

const PGURI = getArg('pguri')
const SUPABASE_URL = getArg('supabaseUrl') || getArg('supabase_url')
const ANON_KEY = getArg('anonKey') || getArg('anon_key')

if(!PGURI || !SUPABASE_URL || !ANON_KEY){
  console.error('[setup] Parâmetros obrigatórios ausentes. Forneça --pguri, --supabaseUrl e --anonKey ou defina env PGURI, SUPABASE_URL e ANON_KEY.')
  process.exit(1)
}

const createTableSQL = `
create table if not exists public.providers (
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
  cepAreas text[] not null default '{}'::text[]
);
`;

const enableRlsSQL = `
alter table public.providers enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'public read' and schemaname = 'public' and tablename = 'providers'
  ) then
    create policy "public read" on public.providers for select using (true);
  end if;
end $$;
`;

const cepSqlPath = path.join(repoRoot, 'supabase', 'cep_prefixes_setup.sql')
const seedSqlPath = path.join(repoRoot, 'supabase', 'seed_providers.sql')

function readFile(p){
  if(!fs.existsSync(p)){
    console.error(`[setup] Arquivo não encontrado: ${p}`)
    process.exit(2)
  }
  return fs.readFileSync(p, 'utf8')
}

const cepSQL = readFile(cepSqlPath)
const seedSQL = readFile(seedSqlPath)

async function run(){
  console.log('[setup] Conectando ao banco...')
  const client = new Client({
    connectionString: PGURI,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()
  try{
    console.log('[setup] Criando tabela providers (se necessário)...')
    await client.query(createTableSQL)

    console.log('[setup] Habilitando RLS e política pública de leitura...')
    await client.query(enableRlsSQL)

    console.log('[setup] Aplicando CEP prefixes + índice...')
    await client.query(cepSQL)

    console.log('[setup] Inserindo/atualizando seed de fornecedores...')
    await client.query(seedSQL)
  } finally {
    await client.end()
  }

  // Atualiza .env.local
  const envPath = path.join(repoRoot, '.env.local')
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath,'utf8') : ''
  const setLine = (txt, key, val) => {
    const re = new RegExp(`^${key}=.*$`, 'm')
    if(re.test(txt)) return txt.replace(re, `${key}=${val}`)
    return (txt && !/\n$/.test(txt) ? txt+'\n' : txt) + `${key}=${val}\n`
  }
  content = setLine(content, 'VITE_SUPABASE_URL', SUPABASE_URL)
  content = setLine(content, 'VITE_SUPABASE_ANON_KEY', ANON_KEY)
  fs.writeFileSync(envPath, content)
  console.log('[setup] .env.local atualizado com URL e ANON KEY')

  console.log('[setup] Concluído com sucesso.')
}

run().catch(err=>{ console.error('[setup] Falha:', err.message); process.exit(1) })