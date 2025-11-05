DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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
  
  INSERT INTO public.profiles (id, user_type, full_name)
  VALUES (NEW.id, v_user_type, v_full_name)
  ON CONFLICT (id) DO UPDATE
  SET 
    user_type = EXCLUDED.user_type,
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
END $$;

