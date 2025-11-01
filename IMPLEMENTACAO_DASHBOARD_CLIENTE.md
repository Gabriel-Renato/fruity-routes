# Implementação do Dashboard do Cliente - Funcionalidades

## 📋 Resumo das Implementações

Este documento descreve as funcionalidades implementadas na página `/dashboard/customer`.

## ✅ Funcionalidades Implementadas

### 1. **Lojas Próximas** 
- Exibe lojas que estão na mesma cidade do cliente
- Busca baseada no campo `city` da tabela `profiles` (cliente) e `stores` (lojas)
- Mostra mensagem apropriada se:
  - Cliente não está logado
  - Cliente não tem cidade cadastrada no perfil
  - Não há lojas na cidade do cliente

### 2. **Formulário de Registro Atualizado**
- Campos adicionados para coletar **Cidade** e **Estado (UF)** durante o cadastro
- Campos obrigatórios apenas para clientes (`user_type === "customer"`)
- Estado limitado a 2 caracteres e convertido para maiúsculas automaticamente
- Dados salvos no `user_metadata` e depois sincronizados com a tabela `profiles`

### 3. **Pedidos Recentes**
- Exibe os últimos 5 pedidos do cliente
- Mostra: ID do pedido, data, status e valor total
- Funciona apenas para usuários logados
- Contador de pedidos ativos atualizado em tempo real

### 4. **Categorias**
- Lista as categorias cadastradas no banco de dados
- Fallback para categorias padrão se não houver categorias cadastradas:
  - Frutas
  - Verduras
  - Orgânicos
  - Promoções

### 5. **Promoções**
- Mostra produtos com desconto de até 30% OFF
- Exibe preço original riscado e preço com desconto
- Baseado nos primeiros 3 produtos do sistema

### 6. **Recomendados**
- Mostra seleções fresquinhas para o cliente
- Baseado nos 6 produtos mais recentes do sistema
- Texto: "Seleções fresquinhas para você 🍇🍉"

### 7. **Lojas em Destaque**
- Placeholder mantido: "Em breve: parceiros verificados perto de você"

## 📁 Arquivos Modificados

### Frontend
1. **`src/pages/Auth.tsx`**
   - Adicionados campos `city` e `state`
   - Validação e formatação automática do estado (2 caracteres, maiúsculas)
   - Campos visíveis apenas para clientes durante cadastro

2. **`src/pages/dashboard/Customer.tsx`**
   - Implementada busca de lojas próximas baseada em cidade
   - Implementada seção de pedidos recentes
   - Melhoradas seções de categorias, promoções e recomendados
   - Adicionado contador de pedidos ativos
   - Carregamento dinâmico de dados do perfil

### Banco de Dados
1. **`supabase/migrations/20251102000000_add_city_fields.sql`**
   - Migration para adicionar campos `city` e `state` em `profiles` e `stores`
   - Atualização da função `handle_new_user()` para incluir cidade/estado

2. **`ADICIONAR_CIDADE_CAMPOS.sql`**
   - Script SQL completo e idempotente para executar manualmente no Supabase
   - Inclui verificações e mensagens de confirmação

## 🗄️ Estrutura do Banco de Dados

### Campos Adicionados

**Tabela `profiles`:**
- `city` (text, nullable)
- `state` (text, nullable)

**Tabela `stores`:**
- `city` (text, nullable)
- `state` (text, nullable)

### Políticas RLS

As políticas RLS existentes já estão configuradas corretamente:
- Clientes podem ver seus próprios pedidos
- Lojas públicas podem ser visualizadas por todos
- Perfis podem ser atualizados pelos próprios usuários

## 🚀 Como Usar

### 1. Aplicar Migration do Banco de Dados

Execute o arquivo SQL no Supabase Dashboard:

```sql
-- Opção 1: Usar a migration
supabase/migrations/20251102000000_add_city_fields.sql

-- Opção 2: Usar o script completo
ADICIONAR_CIDADE_CAMPOS.sql
```

### 2. Cadastrar Cliente

1. Ir para `/auth`
2. Selecionar tipo "Cliente"
3. Clicar em "Criar conta"
4. Preencher:
   - Nome completo
   - **Cidade** (ex: São Paulo)
   - **Estado (UF)** (ex: SP)
   - Email
   - Senha

### 3. Cadastrar Lojas com Cidade

Para que as lojas apareçam na seção "Lojas Próximas", é necessário que:
- A loja tenha os campos `city` e `state` preenchidos
- A loja esteja com `active = true`

### 4. Visualizar Funcionalidades

1. Login como cliente
2. Dashboard mostrará:
   - Lojas na mesma cidade
   - Pedidos recentes (se houver)
   - Promoções e produtos recomendados
   - Categorias disponíveis

## 📝 Notas Importantes

1. **Cidades devem ser escritas exatamente igual** (case-sensitive) para a busca funcionar
2. **Clientes sem cidade cadastrada** verão mensagem para completar o perfil
3. **Pedidos recentes** são atualizados automaticamente após finalizar um novo pedido
4. **Categorias** precisam ser cadastradas no banco via tabela `categories`
5. **Promoções** são baseadas nos primeiros produtos cadastrados (lógica pode ser melhorada no futuro)

## 🔄 Próximos Passos Sugeridos

1. Adicionar busca/filtro de lojas por cidade na interface
2. Implementar sistema de avaliações para lojas em destaque
3. Adicionar filtro de produtos por categoria
4. Melhorar sistema de promoções (campo dedicado no banco)
5. Adicionar página de detalhes do pedido
6. Implementar geolocalização para busca automática de cidade

