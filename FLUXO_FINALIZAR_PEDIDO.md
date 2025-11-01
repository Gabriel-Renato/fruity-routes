# 🍊 Fluxo de Finalizar Pedido - StarFruit

## 📱 Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     1️⃣ CLIENTE                                  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ Adiciona produtos ao carrinho
                    │
                    ▼
          ┌──────────────────────────┐
          │  Modal: Forma de Pagamento │
          ├──────────────────────────┤
          │  💳 Cartão de Crédito    │
          │  💳 Cartão de Débito     │
          │  📱 PIX                  │ ← Seleciona
          │  💵 Dinheiro             │
          └──────────────────────────┘
                    │
                    │ Confirmar Pedido
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2️⃣ LOJA                                     │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ Vê pedido criado (status: pending)
                    │
                    ▼
          ┌──────────────────────────┐
          │  [Preparar]              │ ← Clica
          └──────────────────────────┘
                    │
                    ▼ Status: preparing
          ┌──────────────────────────┐
          │  [Pronto]                │ ← Clica
          └──────────────────────────┘
                    │
                    ▼ Status: ready
          ┌──────────────────────────┐
          │  [🚴 Solicitar Motorista] │ ← Clica
          └──────────────────────────┘
                    │
                    │ Atribui motorista aleatório
                    ▼ Status: ready + rider_id
┌─────────────────────────────────────────────────────────────────┐
│                  3️⃣ MOTORISTA                                  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ Vê entrega disponível (atribuída a ele)
                    │
                    ▼
          ┌──────────────────────────┐
          │  [Aceitar Entrega]       │ ← Clica (verde)
          └──────────────────────────┘
                    │
                    ▼ Status: on_way
          ┌──────────────────────────┐
          │  [Finalizar Entrega]     │ ← Clica (azul)
          └──────────────────────────┘
                    │
                    ▼ Status: delivered
                    │
                    ✅ ENTREGA CONCLUÍDA
```

## 📊 Linha do Tempo de Status

```
Cliente             Loja              Motorista
   │                  │                   │
   │ Cria pedido      │                   │
   ▼                  │                   │
pending ─────────────►│                   │
   │                  │                   │
   │                  │ Aceita            │
   │                  ▼                   │
   │            preparing                 │
   │                  │                   │
   │                  │ Marca pronto      │
   │                  ▼                   │
   │            ready                     │
   │                  │                   │
   │                  │ Solicita rider    │
   │                  ▼                   │
   │            ready+rider_id ──────────►│
   │                  │                   │
   │                  │                   │ Aceita corrida
   │                  │                   ▼
   │                  │             on_way
   │                  │                   │
   │                  │                   │ Finaliza
   │                  │                   ▼
   │                  │            delivered
   │                  │                   │
   │                  ▼                   ▼
   └───────────── ✅ FIM ─────────────────┘
```

## 🎯 Ações por Persona

### 👤 Cliente
- [x] Ver produtos
- [x] Adicionar ao carrinho
- [x] **Escolher forma de pagamento**
- [x] **Confirmar pedido**
- [x] Ver status do pedido

### 🏪 Loja
- [x] Ver pedidos pendentes
- [x] **Aceitar pedido** (pending → preparing)
- [x] **Marcar como pronto** (preparing → ready)
- [x] **Solicitar motorista** (ready → ready + rider_id)
- [x] Ver histórico de pedidos

### 🏍️ Motorista
- [x] Ver entregas atribuídas
- [x] **Aceitar corrida** (ready → on_way)
- [x] **Finalizar entrega** (on_way → delivered)
- [x] Ver ganhos

## 💰 Informações Visíveis

### Cliente vê:
- Forma de pagamento escolhida
- Status do pedido
- Total pago

### Loja vê:
- Forma de pagamento do cliente
- Status do pedido
- Se já tem motorista atribuído
- Total do pedido

### Motorista vê:
- Forma de pagamento
- Status da entrega
- Ganho estimado (10% do total)
- ID do pedido

## 🔐 Permissões (RLS)

### Cliente pode:
- Criar pedidos (payment_method incluído)
- Ver seus próprios pedidos

### Loja pode:
- Ver pedidos da sua loja
- Atualizar status
- Atribuir motorista

### Motorista pode:
- Ver pedidos atribuídos a ele
- Atualizar status da entrega

## 📋 Campos do Banco

### Tabela `orders`
```sql
- customer_id (UUID)        → Cliente que fez o pedido
- store_id (UUID)           → Loja que recebeu o pedido
- status (TEXT)             → Estado do pedido
- total_milli (INTEGER)     → Valor em milésimos
- payment_method (TEXT)     → Forma de pagamento ✨ NOVO
- rider_id (UUID)           → Motorista atribuído ✨ NOVO
- created_at (TIMESTAMP)    → Data de criação
```

### Valores de payment_method
- `credit_card` → Cartão de Crédito
- `debit_card` → Cartão de Débito
- `pix` → PIX
- `cash` → Dinheiro

### Valores de status
- `pending` → Aguardando loja
- `preparing` → Loja preparando
- `ready` → Pronto para entrega
- `on_way` → Motorista a caminho
- `delivered` → Entregue ✅
- `cancelled` → Cancelado

---

**🚀 Sistema pronto para uso!**

