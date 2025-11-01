-- ============================================================================
-- CRIAR LOJAS AUTOMATICAMENTE QUANDO CADASTRAR USUÁRIO DO TIPO "STORE"
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================================

-- Remover trigger existente se houver
drop trigger if exists on_auth_user_created on auth.users;

-- Atualizar função handle_new_user para criar loja automaticamente
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Criar perfil
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

  -- Se for uma loja, criar registro na tabela stores
  if coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'customer') = 'store' then
    insert into public.stores (owner_id, name, city, state, active)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', 'Nova Loja'),
      new.raw_user_meta_data->>'city',
      new.raw_user_meta_data->>'state',
      true
    ) on conflict do nothing;
  end if;

  return new;
exception
  when others then
    raise warning '[handle_new_user] Erro ao criar perfil para %: %', new.id, sqlerrm;
    return new;
end; $$;

-- Recriar trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Verificar se a função foi atualizada
select 
  proname as function_name
from pg_proc
where proname = 'handle_new_user';

-- Mostrar mensagem de sucesso
do $$
begin
  raise notice '✅ Trigger atualizado com sucesso! Agora lojas serão criadas automaticamente.';
end $$;
