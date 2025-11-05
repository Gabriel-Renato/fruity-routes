do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='rider_status') then
    alter table public.orders add column rider_status text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='store_lat') then
    alter table public.orders add column store_lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='store_lng') then
    alter table public.orders add column store_lng double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_lat') then
    alter table public.orders add column delivery_lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_lng') then
    alter table public.orders add column delivery_lng double precision;
  end if;
end $$;

-- Adicionar campos de localização nas stores se não existirem
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='lat') then
    alter table public.stores add column lat double precision;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name='lng') then
    alter table public.stores add column lng double precision;
  end if;
end $$;

