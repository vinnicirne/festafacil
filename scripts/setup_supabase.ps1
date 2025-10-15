Param(
  [string]$PgUri,
  [string]$SupabaseUrl,
  [string]$AnonKey
)

$ErrorActionPreference = 'Stop'
Write-Host "[setup] Iniciando configuração automática do Supabase..." -ForegroundColor Cyan

# 1) Validar psql instalado
function Ensure-Psql {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psql) {
    Write-Warning "psql não encontrado no PATH. Instale o cliente do PostgreSQL."
    Write-Host "Sugestões:" -ForegroundColor Yellow
    Write-Host "  winget install -e --id PostgreSQL.PostgreSQL" -ForegroundColor Yellow
    Write-Host "Ou instale apenas o psql via pacote de ferramentas (Chocolatey/winget)." -ForegroundColor Yellow
    throw "psql não encontrado. Instale e tente novamente."
  }
}

# 2) Coletar parâmetros (permitir via ENV se não vierem por argumento)
if (-not $PgUri) { $PgUri = $env:PGURI }
if (-not $SupabaseUrl) { $SupabaseUrl = $env:VITE_SUPABASE_URL }
if (-not $AnonKey) { $AnonKey = $env:VITE_SUPABASE_ANON_KEY }

if (-not $PgUri) {
  Write-Host "Informe a Connection String do Supabase (PGURI). Ex.: postgres://..." -ForegroundColor Yellow
  $PgUri = Read-Host "PGURI"
}
if (-not $SupabaseUrl) {
  Write-Host "Informe o VITE_SUPABASE_URL (Project URL do Supabase)." -ForegroundColor Yellow
  $SupabaseUrl = Read-Host "VITE_SUPABASE_URL"
}
if (-not $AnonKey) {
  Write-Host "Informe o VITE_SUPABASE_ANON_KEY (anon public)." -ForegroundColor Yellow
  $AnonKey = Read-Host "VITE_SUPABASE_ANON_KEY"
}

if (-not $PgUri -or -not $SupabaseUrl -or -not $AnonKey) {
  throw "Parâmetros obrigatórios ausentes (PGURI, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
}

Ensure-Psql

# 3) Validar arquivos SQL
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $root '..')
$cepSql = Join-Path $repoRoot 'supabase/cep_prefixes_setup.sql'
$seedSql = Join-Path $repoRoot 'supabase/seed_providers.sql'
$providerAccountsSql = Join-Path $repoRoot 'supabase/provider_accounts_setup.sql'
if (-not (Test-Path $cepSql)) { throw "Arquivo não encontrado: $cepSql" }
if (-not (Test-Path $seedSql)) { throw "Arquivo não encontrado: $seedSql" }
if (-not (Test-Path $providerAccountsSql)) { throw "Arquivo não encontrado: $providerAccountsSql" }

# 4) Criar tabela e segurança básica (RLS + política leitura pública)
$createTable = @"
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
  cepAreas text[] not null default '{}'
);
"@

Write-Host "[setup] Criando tabela providers (se necessário)..." -ForegroundColor Cyan
& psql "$PgUri" -v ON_ERROR_STOP=1 -c $createTable | Out-Null

Write-Host "[setup] Habilitando RLS e política de leitura pública..." -ForegroundColor Cyan
& psql "$PgUri" -v ON_ERROR_STOP=1 -c "alter table public.providers enable row level security;" | Out-Null
& psql "$PgUri" -v ON_ERROR_STOP=1 -c "do $$ begin if not exists (select 1 from pg_policies where polname = 'public read' and tablename = 'providers') then create policy \"public read\" on public.providers for select using (true); end if; end $$;" | Out-Null

# 5) CEP prefixes e índice
Write-Host "[setup] Executando script de CEP prefixes..." -ForegroundColor Cyan
& psql "$PgUri" -v ON_ERROR_STOP=1 -f "$cepSql"

# 6) Seed de dados
Write-Host "[setup] Inserindo/atualizando seed de fornecedores..." -ForegroundColor Cyan
& psql "$PgUri" -v ON_ERROR_STOP=1 -f "$seedSql"

# 6.1) provider_accounts + RLS
Write-Host "[setup] Criando/atualizando tabela provider_accounts e políticas RLS..." -ForegroundColor Cyan
& psql "$PgUri" -v ON_ERROR_STOP=1 -f "$providerAccountsSql"

# 7) Configurar .env.local
$envPath = Join-Path $repoRoot '.env.local'
Write-Host "[setup] Atualizando .env.local..." -ForegroundColor Cyan
if (Test-Path $envPath) {
  $content = Get-Content $envPath -Raw
} else {
  $content = ''
}

if ($content -match "(?m)^VITE_SUPABASE_URL=") {
  $content = $content -replace "(?m)^VITE_SUPABASE_URL=.*$","VITE_SUPABASE_URL=$SupabaseUrl"
} else {
  if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
  $content += "VITE_SUPABASE_URL=$SupabaseUrl`n"
}

if ($content -match "(?m)^VITE_SUPABASE_ANON_KEY=") {
  $content = $content -replace "(?m)^VITE_SUPABASE_ANON_KEY=.*$","VITE_SUPABASE_ANON_KEY=$AnonKey"
} else {
  if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
  $content += "VITE_SUPABASE_ANON_KEY=$AnonKey`n"
}

Set-Content -Path $envPath -Value $content -Encoding UTF8

Write-Host "[setup] Concluído com sucesso." -ForegroundColor Green
Write-Host "Resumo:" -ForegroundColor Green
Write-Host " - Tabela providers criada/atualizada" -ForegroundColor Green
Write-Host " - RLS habilitado + política de leitura pública" -ForegroundColor Green
Write-Host " - cep_prefixes_setup.sql executado" -ForegroundColor Green
Write-Host " - seed_providers.sql executado" -ForegroundColor Green
Write-Host " - .env.local atualizado (URL e ANON KEY)" -ForegroundColor Green

Write-Host "Reinicie seu dev server se estiver rodando: npm run dev" -ForegroundColor Yellow