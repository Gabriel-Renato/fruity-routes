-- 🔍 DIAGNÓSTICO COMPLETO DO SCHEMA AUTH
-- Execute este script no SQL Editor do Supabase para diagnosticar o problema

-- ============================================================================
-- 1️⃣ VERIFICAR SE O SCHEMA AUTH EXISTE
-- ============================================================================
SELECT 
    schema_name,
    'Schema existe ✅' as status
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- ============================================================================
-- 2️⃣ VERIFICAR TABELAS NO SCHEMA AUTH
-- ============================================================================
SELECT 
    table_name,
    'Tabela existe ✅' as status
FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name;

-- ============================================================================
-- 3️⃣ VERIFICAR SE A TABELA auth.users EXISTE
-- ============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
) as users_table_exists;

-- ============================================================================
-- 4️⃣ VERIFICAR TRIGGER on_auth_user_created
-- ============================================================================
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- 5️⃣ VERIFICAR FUNÇÃO handle_new_user
-- ============================================================================
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- 6️⃣ VERIFICAR TABELA PUBLIC.PROFILES
-- ============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_table_exists;

-- ============================================================================
-- 7️⃣ CONTAR USUÁRIOS NO AUTH.USERS
-- ============================================================================
SELECT COUNT(*) as total_users FROM auth.users;

-- ============================================================================
-- 8️⃣ VERIFICAR ÚLTIMAS ENTRADAS
-- ============================================================================
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- 9️⃣ VERIFICAR PERMISSÕES DO SCHEMA AUTH
-- ============================================================================
SELECT 
    nspname as schema_name,
    nspowner::regrole as owner,
    'Permissões OK ✅' as status
FROM pg_namespace 
WHERE nspname = 'auth';

-- ============================================================================
-- 🔟 VERIFICAR SE EXISTE SUPABASE_AUTH_ADMIN
-- ============================================================================
SELECT EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = 'supabase_auth_admin'
) as auth_admin_role_exists;

-- ============================================================================
-- RESULTADO ESPERADO:
-- 
-- ✅ Se schema 'auth' existe
-- ✅ Se tabela 'users' existe no schema auth
-- ✅ Se trigger 'on_auth_user_created' está ativo
-- ✅ Se função 'handle_new_user' existe
-- ✅ Se tabela 'profiles' existe em public
-- ✅ Se permissões estão corretas
--
-- ❌ Se algo falhar aqui, o problema está no schema do Supabase
-- ============================================================================



