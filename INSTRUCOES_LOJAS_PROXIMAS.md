# 🏪 Como Fazer Lojas Próximas Funcionarem

## ⚠️ Problema Identificado

A seção "Lojas Próximas" não mostra lojas porque:
1. As lojas não estão sendo criadas automaticamente no cadastro
2. As lojas não têm campos de cidade preenchidos
3. O trigger não está inserindo na tabela `stores`

## ✅ Solução

Execute os arquivos SQL na seguinte ordem:

### Passo 1: Adicionar campos de cidade

Execute o arquivo `ADICIONAR_CIDADE_CAMPOS.sql` no Supabase Dashboard:
```bash
ADICIONAR_CIDADE_CAMPOS.sql
```

Isso adiciona os campos `city` e `state` nas tabelas `profiles` e `stores`.

### Passo 2: Criar lojas automaticamente

Execute o arquivo `CRIAR_LOJAS_AUTOMATICO.sql`:
```bash
CRIAR_LOJAS_AUTOMATICO.sql
```

Isso atualiza o trigger `handle_new_user()` para:
- Criar perfil do usuário
- Se for `user_type = 'store'`, criar registro na tabela `stores` automaticamente
- Preencher cidade e estado da loja baseado no endereço do cadastro

### Passo 3: Verificar os dados

Execute o arquivo `VERIFICAR_DADOS.sql` para ver se tudo está funcionando:
```bash
VERIFICAR_DADOS.sql
```

Isso vai mostrar:
- Campos criados corretamente
- Lojas cadastradas
- Clientes com cidade
- Produtos e suas lojas
- Endereços cadastrados

## 🧪 Teste o Fluxo Completo

### 1. Cadastrar uma Loja

1. Acesse `/auth`
2. Selecione tipo "Loja"
3. Clique em "Criar conta"
4. Preencha:
   - Nome da loja
   - CEP (ex: 01310100)
   - Rua, número, bairro, cidade, estado
   - Email e senha
5. Clique em "Criar conta"

A loja será criada automaticamente na tabela `stores` com:
- Nome: nome fornecido no cadastro
- Cidade: cidade do endereço
- Estado: estado do endereço
- Active: true

### 2. Cadastrar Produtos na Loja

1. Faça login com a conta da loja
2. Vá para "/store/products/new"
3. Adicione produtos (ex: Maçã, Banana, Laranja)

### 3. Cadastrar um Cliente

1. Acesse `/auth`
2. Selecione tipo "Cliente"
3. Clique em "Criar conta"
4. Preencha:
   - Nome completo
   - **Cidade** (mesma cidade da loja!)
   - **Estado (UF)** (mesmo estado da loja!)
   - Email e senha
5. Clique em "Criar conta"

### 4. Verificar Lojas Próximas

1. Faça login como cliente
2. Vá para `/dashboard/customer`
3. A seção "Lojas Próximas" deve mostrar a loja da mesma cidade!

## 📊 Estrutura do Banco

```
auth.users (Supabase Auth)
├── user_type: 'store' | 'customer'
└── metadata: { city, state, name }

public.profiles
├── id (foreign key para auth.users)
├── user_type
├── email
├── full_name
├── city ← ADICIONADO
└── state ← ADICIONADO

public.stores
├── id
├── owner_id (foreign key para auth.users)
├── name
├── city ← ADICIONADO
├── state ← ADICIONADO
├── active
└── delivery_radius_km
```

## 🔍 Debug

Se ainda não funcionar, verifique:

1. **Lojas foram criadas?**
```sql
SELECT * FROM public.stores;
```

2. **Lojas têm cidade?**
```sql
SELECT id, name, city, state FROM public.stores WHERE city IS NOT NULL;
```

3. **Cliente tem cidade?**
```sql
SELECT id, email, city, state FROM public.profiles WHERE user_type = 'customer' AND city IS NOT NULL;
```

4. **Produtos estão linkados corretamente?**
```sql
SELECT p.name as produto, s.name as loja, s.city
FROM public.products p
JOIN public.stores s ON p.store_id = s.owner_id;
```

## 🚨 Problemas Comuns

### "Nenhuma loja disponível ainda"
- Verifique se a migration foi executada
- Verifique se a loja foi criada na tabela `stores`
- Verifique se a loja tem `active = true`

### "Complete seu perfil com sua cidade"
- O cliente não tem cidade cadastrada
- Reexecute a migration `ADICIONAR_CIDADE_CAMPOS.sql`
- Cadastre novo cliente com cidade

### "Não há lojas cadastradas em [cidade] ainda"
- Não existe loja na mesma cidade do cliente
- Cadastre uma loja na mesma cidade
- Ou atualize a cidade do cliente para a cidade de uma loja existente

## ✅ Checklist Final

- [ ] Migration de cidade executada
- [ ] Trigger de criação automática de lojas executado
- [ ] Loja cadastrada com cidade
- [ ] Cliente cadastrado com cidade na mesma cidade da loja
- [ ] Produtos cadastrados na loja
- [ ] "Lojas Próximas" mostrando a loja

## 📝 Próximos Passos

Depois que funcionar, você pode:
1. Adicionar geolocalização para busca por distância
2. Adicionar filtros (por categoria, preço, etc)
3. Implementar sistema de avaliações
4. Adicionar fotos das lojas
5. Sistema de recomendação baseado em histórico

