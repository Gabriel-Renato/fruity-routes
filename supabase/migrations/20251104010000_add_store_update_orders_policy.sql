do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Store can update store orders') then
    create policy "Store can update store orders" on public.orders
    for update
    using (auth.uid() = store_id)
    with check (auth.uid() = store_id);
  end if;
end $$;

