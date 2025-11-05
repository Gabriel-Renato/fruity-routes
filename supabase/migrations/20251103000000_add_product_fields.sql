do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='unit') then
    alter table public.products add column unit text default 'unidade';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='image_url') then
    alter table public.products add column image_url text;
  end if;
end $$;

