-- ============================================================================
-- ADICIONAR TODOS OS CAMPOS PARA MOTOQUEIROS (CNH + AVALIAÇÃO)
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================================

-- Adicionar campos de CNH e veículo na tabela profiles
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
  
  -- Adicionar campos de avaliação
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rating') then
    alter table public.profiles add column rating numeric(3,2) default 0.0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='total_ratings') then
    alter table public.profiles add column total_ratings integer default 0;
  end if;
end $$;

-- Verificar se campos foram criados
do $$
declare
  v_all_fields_exist boolean := true;
  v_field_exists boolean;
  v_field_name text;
  v_fields_array text[] := array[
    'cnh_number', 'cnh_category', 'cnh_expiry', 
    'vehicle_type', 'vehicle_plate', 'phone',
    'rating', 'total_ratings'
  ];
begin
  -- Verificar cada campo
  foreach v_field_name in array v_fields_array
  loop
    select exists(
      select 1 from information_schema.columns 
      where table_schema='public' 
      and table_name='profiles' 
      and column_name=v_field_name
    ) into v_field_exists;
    
    if not v_field_exists then
      v_all_fields_exist := false;
      raise notice '❌ Campo % não foi criado!', v_field_name;
    end if;
  end loop;
  
  if v_all_fields_exist then
    raise notice '✅ Todos os campos do motoqueiro foram adicionados com sucesso!';
  else
    raise warning '⚠️ Alguns campos podem não ter sido criados. Verifique manualmente.';
  end if;
end $$;


