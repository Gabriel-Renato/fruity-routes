-- Migration para corrigir erros no trigger de autenticação
-- Erro: "Database error querying schema" durante login/cadastro
-- Execute esta migration no SQL Editor do Supabase Dashboard

-- Primeiro, remover o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar a função com tratamento robusto de erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type user_type;
  v_full_name text;
BEGIN
  -- Extrair dados dos metadados de forma segura
  v_user_type := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::user_type, 
    'customer'
  );
  v_full_name := NEW.raw_user_meta_data->>'name';
  
  -- Tentar inserir o perfil com ON CONFLICT para evitar duplicatas
  INSERT INTO public.profiles (id, user_type, full_name)
  VALUES (NEW.id, v_user_type, v_full_name)
  ON CONFLICT (id) DO UPDATE
  SET 
    user_type = EXCLUDED.user_type,
    full_name = EXCLUDED.full_name;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas NUNCA quebra a autenticação
    RAISE WARNING '[handle_new_user] Erro ao criar perfil para %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificar se funcionou
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Verificar trigger
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) INTO v_trigger_exists;
  
  -- Verificar função
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;
  
  IF v_trigger_exists AND v_function_exists THEN
    RAISE NOTICE '✅ Trigger e função criados com sucesso';
  ELSIF NOT v_function_exists THEN
    RAISE WARNING '❌ Função handle_new_user não encontrada';
  ELSIF NOT v_trigger_exists THEN
    RAISE WARNING '❌ Trigger on_auth_user_created não encontrado';
  END IF;
END $$;

