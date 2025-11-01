# 🎯 Guia de Resolução Definitiva - Erro 500 Auth

## 📊 Passo 1: DIAGNÓSTICO

Execute o script de diagnóstico para identificar o problema:

1. Acesse: https://app.supabase.com/project/xtugvfvgskalkfviefxm
2. Vá em **SQL Editor**
3. Abra o arquivo `DIAGNOSTICO_AUTH.sql`
4. Copie TODO o conteúdo
5. Cole e execute no SQL Editor

### 📋 Analise os Resultados:

**✅ TUDO CERTO** se você ver:
- Schema 'auth' existe
- Tabela 'users' existe
- Trigger ativo
- Função existe
- Profiles existe

**❌ PROBLEMA DETECTADO** se você ver:
- Algum EXISTS retornando false
- Trigger não encontrado
- Função não encontrada

---

## 🔧 Passo 2: APLICAR CORREÇÃO

### Opção A: Trigger com Problema (Mais Comum)

Execute a migration:
```
supabase/migrations/20251101000000_fix_trigger_error_handling.sql
```

### Opção B: Schema Auth Corrompido

Se o diagnóstico mostrar que o schema auth está corrompido ou faltando:

**⚠️ ATENÇÃO: Isso pode ser necessário apenas em casos extremos!**

```sql
-- Verificar primeiro se realmente falta
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'auth';

-- Se retornar 0 ou muito poucas tabelas, você precisa:
-- 1. Ir em Settings → Database → Restore Database
-- 2. Ou criar um novo projeto e copiar as migrations
```

---

## 🚨 Passo 3: SOLUÇÕES ESPECÍFICAS

### Caso 1: "Database error querying schema"

**Solução:** Execute a migration `20251101000000_fix_trigger_error_handling.sql`

### Caso 2: "Auth schema not found"

**Solução:** Recrie o projeto Supabase ou restaure de backup

### Caso 3: "Too many requests (429)"

**Solução:** Aguarde 1 hora e tente novamente

### Caso 4: Trigger existe mas está quebrado

Execute:

```sql
-- Remover trigger quebrado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar trigger corrigido
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## ✅ Passo 4: VERIFICAÇÃO FINAL

Após aplicar a correção, execute:

```sql
-- Verificar se está tudo OK
SELECT 
    '✅ Auth OK' as status,
    COUNT(*) as total_users 
FROM auth.users;

SELECT 
    '✅ Trigger OK' as status,
    tgname as trigger_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

---

## 📝 RESUMO DOS ARQUIVOS

| Arquivo | Propósito |
|---------|-----------|
| `DIAGNOSTICO_AUTH.sql` | Verificar o que está quebrado |
| `supabase/migrations/20251101000000_fix_trigger_error_handling.sql` | Corrigir o trigger |
| `SOLUCAO_RAPIDA.md` | Guia rápido de 3 passos |
| `FIX_AUTH_ERROR.md` | Documentação completa |

---

## 🆘 AINDA COM PROBLEMAS?

1. **Veja os logs**: Dashboard → Logs → Auth Logs
2. **Entre em contato**: Supabase Support
3. **Crie novo projeto**: Se nada funcionar, recrie e aplique as migrations

---

## 🔗 LINKS ÚTEIS

- Dashboard: https://app.supabase.com/project/xtugvfvgskalkfviefxm
- Logs: https://app.supabase.com/project/xtugvfvgskalkfviefxm/logs
- SQL Editor: https://app.supabase.com/project/xtugvfvgskalkfviefxm/sql/new

