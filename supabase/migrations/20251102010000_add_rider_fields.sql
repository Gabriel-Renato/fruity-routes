-- Migration: Adicionar campos específicos para motoqueiros (riders)
-- Data: 2025-11-02

-- Adicionar campos de CNH e informações de veículo na tabela profiles
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cnh_number') then
    alter table public.profiles add column cnh_number text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cnh_category') then
    alter table public.profiles add column cnh_category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cnh_expiry') then
    alter table public.profiles add column cnh_expiry date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='vehicle_type') then
    alter table public.profiles add column vehicle_type text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='vehicle_plate') then
    alter table public.profiles add column vehicle_plate text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone') then
    alter table public.profiles add column phone text;
  end if;
end $$;

-- Verificar se campos foram criados
do $$
begin
  raise notice '✅ Campos de CNH e veículo adicionados com sucesso!';
end $$;

