-- Cria e mantém a coluna de prefixes de CEP (5 dígitos) para paginação por CEP
-- Execute no Supabase SQL Editor (Project > SQL Editor) com permissão suficiente

-- 1) Adiciona coluna se não existir
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS cepPrefixes5 text[];

-- 2) Backfill: popula a coluna com base em cepAreas atuais
UPDATE public.providers p
SET cepPrefixes5 = (
  SELECT ARRAY(
    SELECT DISTINCT LEFT(regexp_replace(v::text, '\\D', '', 'g'), 5)
    FROM unnest(p.cepAreas) AS v
    WHERE length(regexp_replace(v::text, '\\D', '', 'g')) >= 5
  )
);

-- 3) Função trigger para manter a coluna atualizada
CREATE OR REPLACE FUNCTION public.providers_set_cep_prefixes5()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.cepPrefixes5 := (
    SELECT ARRAY(
      SELECT DISTINCT LEFT(regexp_replace(v::text, '\\D', '', 'g'), 5)
      FROM unnest(NEW.cepAreas) AS v
      WHERE length(regexp_replace(v::text, '\\D', '', 'g')) >= 5
    )
  );
  RETURN NEW;
END;
$$;

-- 4) Trigger
DROP TRIGGER IF EXISTS trg_providers_cep_prefixes5 ON public.providers;
CREATE TRIGGER trg_providers_cep_prefixes5
BEFORE INSERT OR UPDATE OF cepAreas
ON public.providers
FOR EACH ROW
EXECUTE FUNCTION public.providers_set_cep_prefixes5();

-- 5) Índice para acelerar contains(text[])
CREATE INDEX IF NOT EXISTS idx_providers_cep_prefixes5_gin
  ON public.providers USING GIN (cepPrefixes5);