# 🚀 Solução Rápida - Erro 500 na Autenticação

## Erro Atual

```
POST https://xtugvfvgskalkfviefxm.supabase.co/auth/v1/token?grant_type=password 500 (Internal Server Error)
AuthApiError: Database error querying schema
```

## ⚡ Solução em 3 Passos

### 1️⃣ Acesse o Supabase Dashboard

Abra: https://app.supabase.com/project/xtugvfvgskalkfviefxm

### 2️⃣ Vá para o SQL Editor

No menu lateral, clique em **SQL Editor**

### 3️⃣ Execute a Migration

1. Abra o arquivo: `supabase/migrations/20251101000000_fix_trigger_error_handling.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN** ou pressione `Ctrl+Enter`

### ✅ Resultado Esperado

Você deve ver a mensagem:
```
✅ Trigger e função criados com sucesso
```

## 🧪 Teste Rápido

1. Recarregue seu app (F5)
2. Tente fazer login ou cadastro
3. Verifique se não há mais erro 500

## 📝 O que a correção faz?

A migration corrige o trigger que:
- ❌ **Antes**: Quebrava quando tentava criar perfil duplicado
- ✅ **Depois**: Lida com duplicatas e NUNCA quebra a autenticação

## 🔍 Se Ainda Houver Problemas

### Verificar Logs

1. No Dashboard: **Logs** → **Auth Logs**
2. Procure por erros recentes
3. Analise as mensagens

### Verificar SQL

Execute no SQL Editor:

```sql
-- Verificar trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verificar função  
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Ver últimos perfis
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
```

## 📞 Suporte

Se o problema persistir:
- Veja os detalhes em: `FIX_AUTH_ERROR.md`
- Contate: Supabase Support
- Dashboard: https://app.supabase.com/project/xtugvfvgskalkfviefxm

