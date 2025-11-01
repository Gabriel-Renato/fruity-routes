DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('customer', 'store', 'rider');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL DEFAULT 'customer',
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

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
  v_user_type := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::user_type, 
    'customer'
  );
  v_full_name := NEW.raw_user_meta_data->>'name';
  
  INSERT INTO public.profiles (id, user_type, email, full_name)
  VALUES (NEW.id, v_user_type, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE
  SET 
    user_type = EXCLUDED.user_type,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Erro ao criar perfil para %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) INTO v_trigger_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;
  
  IF v_trigger_exists AND v_function_exists THEN
    RAISE NOTICE 'Trigger e função criados com sucesso';
  ELSIF NOT v_function_exists THEN
    RAISE WARNING 'Função handle_new_user não encontrada';
  ELSIF NOT v_trigger_exists THEN
    RAISE WARNING 'Trigger on_auth_user_created não encontrado';
  END IF;
END $$;

