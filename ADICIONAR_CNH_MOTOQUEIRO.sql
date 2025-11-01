-- ============================================================================
-- ADICIONAR CAMPOS DE CNH PARA MOTOQUEIROS
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================================

-- Adicionar campos específicos para motoqueiros na tabela profiles
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
declare
  v_cnh_number_exists boolean;
  v_cnh_category_exists boolean;
  v_cnh_expiry_exists boolean;
  v_vehicle_type_exists boolean;
  v_vehicle_plate_exists boolean;
  v_phone_exists boolean;
begin
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='cnh_number'
  ) into v_cnh_number_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='cnh_category'
  ) into v_cnh_category_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='cnh_expiry'
  ) into v_cnh_expiry_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='vehicle_type'
  ) into v_vehicle_type_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='vehicle_plate'
  ) into v_vehicle_plate_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='phone'
  ) into v_phone_exists;
  
  if v_cnh_number_exists and v_cnh_category_exists and v_cnh_expiry_exists and v_vehicle_type_exists and v_vehicle_plate_exists and v_phone_exists then
    raise notice '✅ Campos de CNH e veículo adicionados com sucesso!';
  else
    raise warning '⚠️ Alguns campos podem não ter sido criados. Verifique manualmente.';
  end if;
end $$;

