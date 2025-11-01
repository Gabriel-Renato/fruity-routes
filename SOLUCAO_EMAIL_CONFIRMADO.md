# 🔧 Solução: "Email not confirmed"

## Problema

Você está recebendo o erro:
```
AuthApiError: Email not confirmed
```

Isso significa que o Supabase está exigindo confirmação de email por email.

## ✅ Solução

### Opção 1: Desabilitar Confirmação de Email (Desenvolvimento) ⚡

1. Acesse: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/settings/auth
2. Role até **"Email Auth"**
3. Desabilite **"Enable email confirmations"**
4. Clique em **Save**
5. Teste fazer login novamente

### Opção 2: Confirmar Email Manualmente (Produção)

Se você já tem um usuário cadastrado mas não confirmado:

1. Acesse: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/auth/users
2. Encontre o usuário
3. Clique nos 3 pontos (...) ao lado
4. Clique em **"Confirm email"**

Ou via SQL:

```sql
-- Confirmar email de um usuário específico
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'seu@email.com';
```

### Opção 3: Configurar SMTP (Produção)

Se quiser manter confirmação de email ativa:

1. Vá em Settings → Auth → SMTP Settings
2. Configure um provedor SMTP (Gmail, SendGrid, etc.)
3. Teste o envio de emails
4. Os usuários receberão emails de confirmação

## 🚀 Para Desenvolvimento Local

**Recomendação:** Desabilite a confirmação de email durante o desenvolvimento.

Isso permite que você teste o login imediatamente sem precisar configurar SMTP.

## 📝 Verificar

Após desabilitar, teste:

1. Faça um novo cadastro
2. Ou faça login com usuário existente
3. Verifique se não aparece mais "Email not confirmed"

---

**Links Úteis:**
- Auth Settings: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/settings/auth
- Users: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/auth/users

