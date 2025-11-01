-- Migration: Adicionar campos de cidade para profiles e stores
-- Data: 2025-11-02

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
    state = coalesce(excluded.state, profiles.state);
  return new;
exception
  when others then
    raise warning '[handle_new_user] Erro ao criar perfil para %: %', new.id, sqlerrm;
    return new;
end; $$;

