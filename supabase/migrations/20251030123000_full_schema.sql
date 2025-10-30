-- Extensões necessárias
create extension if not exists pgcrypto;

-- ENUM user_type (se não existir)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type user_type as enum ('customer', 'store', 'rider');
  end if;
end $$;

-- profiles (já existe em migração anterior, deixar idempotente)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type user_type not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Users can view own profile') then
    create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Users can update own profile') then
    create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, user_type, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'customer'),
    new.raw_user_meta_data->>'name'
  ) on conflict (id) do nothing;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='on_auth_user_created') then
    create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
  end if;
end $$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='update_profiles_updated_at') then
    create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- stores (lojas mantêm metadados opcionais)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  delivery_radius_km numeric(6,2) default 5.0,
  created_at timestamptz default now()
);
alter table public.stores enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='Public can view stores') then
    create policy "Public can view stores" on public.stores for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='Owner can manage stores') then
    create policy "Owner can manage stores" on public.stores for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
end $$;

-- products (já criado em migração anterior; manter idempotente)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  price_milli integer not null,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Public can view products') then
    create policy "Public can view products" on public.products for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Store can insert own products') then
    create policy "Store can insert own products" on public.products for insert with check (auth.uid() = store_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Store can update own products') then
    create policy "Store can update own products" on public.products for update using (auth.uid() = store_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Store can delete own products') then
    create policy "Store can delete own products" on public.products for delete using (auth.uid() = store_id);
  end if;
end $$;

-- categories e product_categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
alter table public.categories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Public can view categories') then
    create policy "Public can view categories" on public.categories for select using (true);
  end if;
end $$;

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
alter table public.product_categories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='Public can view product_categories') then
    create policy "Public can view product_categories" on public.product_categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='Store can manage own product categories') then
    create policy "Store can manage own product categories" on public.product_categories for all
    using (exists (select 1 from public.products p where p.id = product_id and p.store_id = auth.uid()))
    with check (exists (select 1 from public.products p where p.id = product_id and p.store_id = auth.uid()));
  end if;
end $$;

-- addresses (endereços do usuário)
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  street text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);
alter table public.addresses enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='addresses' and policyname='Owner can manage own addresses') then
    create policy "Owner can manage own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- carts e cart_items (opcional, mas com RLS por usuário)
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references auth.users(id) on delete set null, -- carrinho por loja (simplificado)
  created_at timestamptz default now()
);
alter table public.carts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='carts' and policyname='Owner can manage own carts') then
    create policy "Owner can manage own carts" on public.carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null check (qty > 0),
  unit_price_milli integer not null,
  created_at timestamptz default now()
);
alter table public.cart_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='cart_items' and policyname='Owner can manage own cart items') then
    create policy "Owner can manage own cart items" on public.cart_items for all
    using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
    with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
  end if;
end $$;

-- orders e order_items
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending',
  total_milli integer not null default 0,
  created_at timestamptz default now()
);
alter table public.orders enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Customer can view own orders') then
    create policy "Customer can view own orders" on public.orders for select using (auth.uid() = customer_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Customer can insert own orders') then
    create policy "Customer can insert own orders" on public.orders for insert with check (auth.uid() = customer_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Store can view store orders') then
    create policy "Store can view store orders" on public.orders for select using (auth.uid() = store_id);
  end if;
end $$;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_price_milli integer not null,
  subtotal_milli integer not null,
  created_at timestamptz default now()
);
alter table public.order_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='Customer can manage items of own orders') then
    create policy "Customer can manage items of own orders" on public.order_items for all
    using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()))
    with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
  end if;
end $$;


