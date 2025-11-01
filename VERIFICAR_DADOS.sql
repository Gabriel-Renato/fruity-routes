-- ============================================================================
-- VERIFICAR DADOS NO BANCO
-- Execute este arquivo no SQL Editor do Supabase Dashboard para verificar
-- ============================================================================

-- 1. Verificar se os campos foram criados corretamente
select 
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'stores')
  and column_name in ('city', 'state')
order by table_name, column_name;

-- 2. Ver se existem lojas cadastradas
select 
  id,
  name,
  owner_id,
  city,
  state,
  active,
  created_at
from public.stores
order by created_at desc
limit 10;

-- 3. Ver clientes com cidade cadastrada
select 
  id,
  email,
  full_name,
  city,
  state,
  user_type
from public.profiles
where user_type = 'customer'
order by created_at desc
limit 10;

-- 4. Ver produtos e suas lojas
select 
  p.id as product_id,
  p.name as product_name,
  p.price_milli,
  p.store_id,
  s.name as store_name,
  s.city as store_city,
  s.state as store_state
from public.products p
left join public.stores s on p.store_id = s.owner_id
order by p.created_at desc
limit 20;

-- 5. Verificar endereços cadastrados
select 
  id,
  user_id,
  label,
  street,
  city,
  state,
  zip,
  created_at
from public.addresses
order by created_at desc
limit 10;

