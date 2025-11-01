-- Adicionar campos de pagamento e motorista na tabela orders

-- Adicionar campo payment_method
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='orders' and column_name='payment_method'
  ) then
    alter table public.orders add column payment_method text;
    raise notice '✅ Campo payment_method adicionado com sucesso!';
  else
    raise notice '⚠️ Campo payment_method já existe';
  end if;
end $$;

-- Adicionar campo rider_id (motorista)
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='orders' and column_name='rider_id'
  ) then
    alter table public.orders add column rider_id uuid references auth.users(id) on delete set null;
    raise notice '✅ Campo rider_id adicionado com sucesso!';
  else
    raise notice '⚠️ Campo rider_id já existe';
  end if;
end $$;

-- Atualizar políticas RLS para motorista ver pedidos
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Rider can view assigned orders') then
    create policy "Rider can view assigned orders" on public.orders 
      for select using (auth.uid() = rider_id);
  end if;
  
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Rider can update assigned orders') then
    create policy "Rider can update assigned orders" on public.orders 
      for update using (auth.uid() = rider_id);
  end if;
end $$;

-- Permitir lojas verem motoristas (para atribuir pedidos)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Store can view riders') then
    create policy "Store can view riders" on public.profiles 
      for select using (
        exists (
          select 1 from public.stores s 
          where s.owner_id = auth.uid() 
          and public.profiles.user_type = 'rider'
        )
      );
  end if;
end $$;

-- Verificar se tudo foi criado
do $$
declare
  v_payment_method_exists boolean;
  v_rider_id_exists boolean;
begin
  select exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='orders' and column_name='payment_method'
  ) into v_payment_method_exists;
  
  select exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='orders' and column_name='rider_id'
  ) into v_rider_id_exists;
  
  if v_payment_method_exists and v_rider_id_exists then
    raise notice '✅ Todos os campos foram adicionados com sucesso!';
  else
    raise notice '❌ Alguns campos não foram encontrados';
  end if;
end $$;

