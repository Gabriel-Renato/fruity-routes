-- Migration: Adicionar novos status para rastreamento detalhado da entrega
-- Data: 2025-11-04

-- Adicionar campos para rastrear a jornada do motorista
do $$ begin
  -- Campo para status detalhado da entrega pelo motorista
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='rider_status') then
    alter table public.orders add column rider_status text;
  end if;
  
  -- Campos para coordenadas do endereço da loja (será preenchido via stores table)
  -- Campos para coordenadas do endereço de entrega (já existem em addresses, mas vamos adicionar direto em orders para facilitar)
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='store_lat') then
    alter table public.orders add column store_lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='store_lng') then
    alter table public.orders add column store_lng double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_lat') then
    alter table public.orders add column delivery_lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_lng') then
    alter table public.orders add column delivery_lng double precision;
  end if;
end $$;

-- Adicionar campos de localização nas stores se não existirem
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='lat') then
    alter table public.stores add column lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='lng') then
    alter table public.stores add column lng double precision;
  end if;
end $$;

-- Comentário sobre os status
-- rider_status pode ser: null (ainda não aceito), 'going_to_store', 'at_store', 'going_to_customer'
-- status geral continua sendo: pending, preparing, ready, on_way, delivered

-- Verificar se campos foram criados
do $$
begin
  raise notice '✅ Campos de rastreamento de entrega adicionados com sucesso!';
end $$;

