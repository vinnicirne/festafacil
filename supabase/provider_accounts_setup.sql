-- Tabela de contas de fornecedor com validação de status
create table if not exists provider_accounts (
  user_id uuid primary key,
  brand_name text not null,
  plan text not null check (plan in ('GRATIS','START','PROFISSIONAL')),
  balance integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  tax_id text not null,
  phone text not null,
  tax_id_valid boolean not null default false,
  phone_valid boolean not null default false,
  pix_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Função para atualizar updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger provider_accounts_set_updated_at
before update on provider_accounts
for each row execute procedure set_updated_at();

-- Segurança: RLS
alter table provider_accounts enable row level security;
-- Permitir que o próprio usuário crie sua conta
drop policy if exists "provider insert own" on provider_accounts;
create policy "provider insert own" on provider_accounts for insert with check (auth.uid() = user_id);

-- Políticas: fornecedor lê/atualiza apenas sua própria conta
drop policy if exists "provider read own" on provider_accounts;
drop policy if exists "provider update own" on provider_accounts;
create policy "provider read own" on provider_accounts for select using (auth.uid() = user_id);
create policy "provider update own" on provider_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Observação: políticas administrativas (aprovar/alterar status) devem ser feitas com service role
-- via API segura ou SQL no painel, não pelo anon key do cliente.