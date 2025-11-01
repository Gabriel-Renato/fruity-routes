# Correção do Erro 500 na Autenticação Supabase

## Resumo do Problema

O erro `POST https://xtugvfvgskalkfviefxm.supabase.co/auth/v1/token?grant_type=password 500 (Internal Server Error)` com mensagem **"Database error querying schema"** ocorre quando o trigger `handle_new_user()` falha durante a autenticação.

### Causa Raiz

O trigger estava tentando inserir um perfil duplicado sem o tratamento adequado de `ON CONFLICT`, causando falha na consulta ao schema do banco.

## O que foi feito

### 1. Melhorias no Cliente Supabase (`src/integrations/supabase/client.ts`)

Adicionada validação para verificar se as credenciais do Supabase estão configuradas:

```typescript
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Supabase credentials missing!');
  console.error('URL:', SUPABASE_URL);
  console.error('Key:', SUPABASE_PUBLISHABLE_KEY ? 'Present' : 'Missing');
}
```

### 2. Melhorias no Tratamento de Erros (`src/pages/Auth.tsx`)

Adicionado log detalhado para erros de autenticação:

```typescript
catch (error: any) {
  console.error("Erro de autenticação:", error);
  // ... resto do tratamento
}
```

### 3. Nova Migration para Corrigir o Trigger

Criada migration `20251101000000_fix_trigger_error_handling.sql` que:
- Remove o trigger problemático primeiro
- Recria a função `handle_new_user()` com variáveis locais para evitar erros de casting
- Usa `ON CONFLICT DO UPDATE` para lidar com perfis duplicados
- Adiciona `EXCEPTION WHEN OTHERS` para NUNCA quebrar a autenticação
- Verifica se trigger e função foram criados corretamente

## Como Aplicar a Correção

### Opção 1: Via SQL Editor do Supabase Dashboard

1. Acesse: https://app.supabase.com/project/xtugvfvgskalkfviefxm
2. Vá para **SQL Editor**
3. Abra o arquivo `supabase/migrations/20251101000000_fix_trigger_error_handling.sql`
4. Copie e cole todo o conteúdo no SQL Editor
5. Clique em **RUN** ou **Run query**
6. Verifique se aparece a mensagem: `✅ Trigger on_auth_user_created criado com sucesso`

### Opção 2: Via Supabase CLI (se disponível)

```bash
supabase db push
```

## Verificação

Após aplicar a migration:

1. **Limpe o cache do navegador** (Ctrl+Shift+R)
2. **Teste o login/cadastro** no aplicativo
3. **Verifique o console do navegador** para qualquer mensagem de erro
4. **Veja os logs do Supabase** em: Dashboard → Logs → Auth Logs

## Se o Problema Persistir

1. **Veja os logs do Supabase Dashboard**:
   - Dashboard → Logs → Auth Logs
   - Procure por erros recentes com status 500
   - Analise as mensagens de erro detalhadas

2. **Execute este diagnóstico no SQL Editor**:

```sql
-- Verificar trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verificar função
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Ver últimos perfis criados
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
```

3. **Contato**: Se necessário, entre em contato com suporte do Supabase

## Arquivos Modificados

- ✅ `src/integrations/supabase/client.ts` - Validação de credenciais
- ✅ `src/pages/Auth.tsx` - Log detalhado de erros
- ✅ `supabase/migrations/20251101000000_fix_trigger_error_handling.sql` - Correção do trigger

## Próximos Passos

Após aplicar a correção, o aplicativo deve funcionar normalmente. Se houver novos erros, consulte os logs do Dashboard do Supabase para diagnósticos adicionais.

