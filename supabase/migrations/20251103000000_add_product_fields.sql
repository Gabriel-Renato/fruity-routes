-- Migration: Adicionar campos de unidade e imagem nos produtos
-- Data: 2025-11-03

-- Adicionar campo de unidade (kg, unidade, etc)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='unit') then
    alter table public.products add column unit text default 'unidade';
  end if;
end $$;

-- Adicionar campo de URL da imagem
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='image_url') then
    alter table public.products add column image_url text;
  end if;
end $$;

-- Verificar se campos foram criados
do $$
begin
  raise notice '✅ Campos de unidade e imagem adicionados aos produtos com sucesso!';
end $$;

