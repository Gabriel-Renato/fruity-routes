# 🚀 Configurar Novo Banco do StarFruitC

## ✅ Checklist Rápido

- [x] Credenciais atualizadas no `.env`
- [ ] Schema do banco criado
- [ ] Trigger de autenticação configurado
- [ ] App funcionando

---

## 📝 Passo a Passo

### 1️⃣ Credenciais Configuradas

As credenciais do novo Supabase já foram atualizadas no `.env`:

```
VITE_SUPABASE_URL="https://lnnmtvkvngqyyllfezcf.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2️⃣ Criar o Schema do Banco

**Acesse:** https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/sql/new

**Execute o arquivo:** `SETUP_BANCO_COMPLETO.sql`

Este arquivo cria:
- ✅ Tabela `profiles` (perfis dos usuários)
- ✅ Função `handle_new_user()` com tratamento de erros
- ✅ Trigger `on_auth_user_created`
- ✅ Tabelas `stores`, `products`, `categories`
- ✅ Tabelas `addresses`, `carts`, `orders`
- ✅ Todas as políticas RLS (Row Level Security)

### 3️⃣ Verificar Instalação

Após executar o SQL, você deve ver:

```
Tabelas criadas: 10
Funções criadas: 2
Triggers criados: 2
Banco de dados configurado com sucesso!
```

### 4️⃣ Testar a Aplicação

1. Recarregue o app (pressione F5)
2. Tente fazer cadastro
3. Verifique se não há erros 500
4. Faça login com as credenciais criadas

---

## 🔧 Se Algo Der Errado

### Erro ao Executar SQL

1. Verifique se copiou TUDO do arquivo `SETUP_BANCO_COMPLETO.sql`
2. Execute linha por linha se necessário
3. Verifique os logs do Supabase

### Erro 500 ao Fazer Login

O trigger `handle_new_user()` já tem tratamento de erros, mas se ainda der problema:

1. Veja os logs: Dashboard → Logs → Auth Logs
2. Execute o diagnóstico: `DIAGNOSTICO_AUTH.sql`
3. Verifique se todas as tabelas foram criadas

### Tabelas Não Aparecem

Execute este comando para ver todas as tabelas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 📊 Resumo

| Item | Status |
|------|--------|
| Credenciais | ✅ Configuradas |
| SQL de Setup | ✅ Pronto |
| Trigger com Erro Handling | ✅ Implementado |
| RLS Policies | ✅ Incluídas |
| Tabelas Completas | ✅ 10 tabelas |

---

## 🎉 Próximos Passos

Após configurar o banco:

1. Teste fazer cadastro de um usuário
2. Teste fazer login
3. Verifique se o perfil é criado automaticamente
4. Teste criar uma loja
5. Teste adicionar produtos

---

**Links Úteis:**
- Dashboard: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf
- SQL Editor: https://app.supabase.com/project/lnnmtvkvngqyyllfezcf/sql/new

