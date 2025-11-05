do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_street') then
    alter table public.orders add column delivery_street text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_city') then
    alter table public.orders add column delivery_city text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_state') then
    alter table public.orders add column delivery_state text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_zip') then
    alter table public.orders add column delivery_zip text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_complement') then
    alter table public.orders add column delivery_complement text;
  end if;
end $$;

