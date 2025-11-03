# 🍊 StarFruit - Plataforma de Delivery de Frutas

Sistema completo de delivery de frutas e produtos naturais com perfil de Cliente, Loja e Motoqueiro.

## 🚀 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Roteamento**: React Router

## 📋 Funcionalidades

### 👤 Cliente
- Dashboard com lojas próximas
- Carrinho de compras
- Pedidos ativos com rastreamento
- Histórico completo de pedidos
- Gerenciamento de endereços
- Perfil editável

### 🏪 Loja
- Dashboard de gestão
- Cadastro e edição de produtos com fotos
- Controle de pedidos
- Atribuição de motorista
- Estatísticas de vendas

### 🏍️ Motoqueiro
- Entregas disponíveis
- Histórico de entregas
- Atualização de status
- Estatísticas e ganhos

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Criar arquivo .env.local com:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_key

# Executar migrations do Supabase
# Acesse Supabase Dashboard > SQL Editor e execute os arquivos em:
# supabase/migrations/

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🔐 Contas de Teste (QA)

| Perfil | Email | Senha |
|--------|-------|-------|
| Loja | lojaaaaa@gmail.com | 123456789 |
| Cliente | larilari@gmail.com | 123456789 |
| Motorista | motor@gmail.com | 123456789 |

## 📁 Estrutura do Projeto

```
src/
├── pages/
│   ├── dashboard/       # Dashboards por perfil
│   ├── store/           # Gestão de produtos
│   ├── profile/         # Perfil do usuário
│   └── Auth.tsx         # Login e cadastro
├── components/ui/       # Componentes shadcn-ui
├── context/            # Contextos (Cart, etc)
└── integrations/       # Configuração Supabase

supabase/migrations/    # Migrations SQL
```

## 📝 Migrations Necessárias

Execute as migrations na ordem:
1. `20251029153544_845de7e5-b090-48cb-8ef1-3b378df25a46.sql`
2. `20251030120000_create_products.sql`
3. `20251030123000_full_schema.sql`
4. `20251101000000_fix_trigger_error_handling.sql`
5. `20251102000000_add_city_fields.sql`
6. `20251102010000_add_rider_fields.sql`
7. `20251103000000_add_product_fields.sql`
8. `20251103010000_add_delivery_address_to_orders.sql`

## 🎨 Licença

MIT
