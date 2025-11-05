create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references auth.users(id) on delete cascade,
  discount_percentage integer not null check (discount_percentage > 0 and discount_percentage <= 100),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promotions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promotions' and policyname='Public can view active promotions') then
    create policy "Public can view active promotions" 
    on public.promotions 
    for select 
    using (
      active = true 
      and (end_date is null or end_date >= now())
      and start_date <= now()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promotions' and policyname='Store can view own promotions') then
    create policy "Store can view own promotions" 
    on public.promotions 
    for select 
    using (auth.uid() = store_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promotions' and policyname='Store can insert own promotions') then
    create policy "Store can insert own promotions" 
    on public.promotions 
    for insert 
    with check (
      auth.uid() = store_id 
      and exists (
        select 1 from public.products 
        where products.id = product_id 
        and products.store_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promotions' and policyname='Store can update own promotions') then
    create policy "Store can update own promotions" 
    on public.promotions 
    for update 
    using (auth.uid() = store_id)
    with check (auth.uid() = store_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promotions' and policyname='Store can delete own promotions') then
    create policy "Store can delete own promotions" 
    on public.promotions 
    for delete 
    using (auth.uid() = store_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='update_promotions_updated_at') then
    create trigger update_promotions_updated_at 
    before update on public.promotions 
    for each row 
    execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_promotions_product_id on public.promotions(product_id);
create index if not exists idx_promotions_store_id on public.promotions(store_id);
create index if not exists idx_promotions_active on public.promotions(active, end_date) where active = true;

