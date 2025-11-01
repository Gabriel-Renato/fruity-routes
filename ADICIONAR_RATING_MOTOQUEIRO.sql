-- ============================================================================
-- ADICIONAR CAMPO DE AVALIAÇÃO PARA MOTOQUEIROS
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================================

-- Adicionar campo de rating (avaliação média) para motoqueiros na tabela profiles
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rating') then
    alter table public.profiles add column rating numeric(3,2) default 0.0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='total_ratings') then
    alter table public.profiles add column total_ratings integer default 0;
  end if;
end $$;

-- Verificar se campos foram criados
do $$
declare
  v_rating_exists boolean;
  v_total_ratings_exists boolean;
begin
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='rating'
  ) into v_rating_exists;
  
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='profiles' and column_name='total_ratings'
  ) into v_total_ratings_exists;
  
  if v_rating_exists and v_total_ratings_exists then
    raise notice '✅ Campos de avaliação adicionados com sucesso!';
  else
    raise warning '⚠️ Alguns campos podem não ter sido criados. Verifique manualmente.';
  end if;
end $$;

