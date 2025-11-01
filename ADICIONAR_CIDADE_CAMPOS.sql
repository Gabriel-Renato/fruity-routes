-- ============================================================================
-- ADICIONAR CAMPOS DE CIDADE PARA LOJAS E CLIENTES
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================================

-- Adicionar cidade e estado na tabela profiles
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='city') then
    alter table public.profiles add column city text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='state') then
    alter table public.profiles add column state text;
  end if;
end $$;

-- Adicionar cidade e estado na tabela stores
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='city') then
    alter table public.stores add column city text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='state') then
    alter table public.stores add column state text;
  end if;
end $$;

-- Atualizar função handle_new_user para incluir cidade e estado do metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, user_type, email, full_name, city, state)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'customer'),
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'state'
  ) on conflict (id) do update set
    city = coalesce(excluded.city, profiles.city),
    state = coalesce(excluded.state, profiles.state),
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
exception
  when others then
    raise warning '[handle_new_user] Erro ao criar perfil para %: %', new.id, sqlerrm;
    return new;
end; $$;

-- Verificar se tudo foi criado corretamente
do $$
declare
  v_profiles_city_exists boolean;
  v_profiles_state_exists boolean;
  v_stores_city_exists boolean;
  v_stores_state_exists boolean;
begin
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='city'
  ) into v_profiles_city_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='state'
  ) into v_profiles_state_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='stores' and column_name='city'
  ) into v_stores_city_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='stores' and column_name='state'
  ) into v_stores_state_exists;
  
  if v_profiles_city_exists and v_profiles_state_exists and v_stores_city_exists and v_stores_state_exists then
    raise notice '✅ Campos de cidade adicionados com sucesso!';
  else
    raise warning '⚠️ Alguns campos podem não ter sido criados. Verifique manualmente.';
  end if;
end $$;

