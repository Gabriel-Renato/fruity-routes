do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_available') then
    alter table public.profiles add column is_available boolean default false;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Stores can view available riders') then
    create policy "Stores can view available riders" on public.profiles
    for select
    using (
      user_type = 'rider' and is_available = true
    );
  end if;
end $$;

