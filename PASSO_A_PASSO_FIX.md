# 🔧 Passo a Passo para Corrigir Lojas Próximas

## 🎯 O que precisa ser feito

Execute **3 arquivos SQL** no Supabase Dashboard na ordem correta.

## 📍 Passo 1: Adicionar Campos de Cidade

Acesse: https://app.supabase.com/project/xtugvfvgskalkfviefxm/sql/new

Copie e cole o conteúdo do arquivo:
```
ADICIONAR_CIDADE_CAMPOS.sql
```

Execute e verifique: `✅ Campos de cidade adicionados com sucesso!`

## 🏪 Passo 2: Criar Lojas Automaticamente

Na mesma aba SQL Editor, execute:
```
CRIAR_LOJAS_AUTOMATICO.sql
```

Execute e verifique: `✅ Trigger atualizado com sucesso!`

## 🔍 Passo 3: Verificar Dados

Execute:
```
VERIFICAR_DADOS.sql
```

Confira se as tabelas têm os dados corretos.

## 🧪 Passo 4: Testar

### A. Cadastrar uma LOJA

1. Vá para `/auth` na aplicação
2. Selecione tipo "Loja"
3. Preencha:
   - **Nome da loja**: "Super Frutas do Centro"
   - **CEP**: 01310100
   - **Cidade**: São Paulo
   - **Estado**: SP
   - **Email**: loja@teste.com
   - **Senha**: qualquer senha
4. Clique em "Criar conta"

### B. Adicionar Produtos

1. Faça login com a conta da loja
2. Clique em "Adicionar Produto"
3. Adicione: "Maçã Vermelha - R$ 5,00"

### C. Cadastrar um CLIENTE na mesma cidade

1. Vá para `/auth`
2. Selecione tipo "Cliente"
3. Preencha:
   - **Nome**: João Silva
   - **CEP**: 01310100
   - **Cidade**: São Paulo
   - **Estado**: SP
   - **Email**: cliente@teste.com
   - **Senha**: qualquer senha
4. Clique em "Criar conta"

### D. Verificar Lojas Próximas

1. Faça login como cliente
2. Vá para `/dashboard/customer`
3. **A seção "Lojas Próximas" deve mostrar "Super Frutas do Centro"! 🎉**

## ❌ Se NÃO funcionou

### Problema 1: "Complete seu perfil com sua cidade"
**Solução:** O cliente não tem cidade. Cadastre um novo cliente.

### Problema 2: "Nenhuma loja encontrada na sua cidade"
**Solução:** Não existe loja cadastrada. Siga o Passo 4A para cadastrar uma loja.

### Problema 3: Erro ao executar SQL
**Solução:** Verifique se você tem permissão de administrador no Supabase.

## 🔗 Links Úteis

- Dashboard SQL: https://app.supabase.com/project/xtugvfvgskalkfviefxm/sql/new
- Documentação completa: `INSTRUCOES_LOJAS_PROXIMAS.md`

## ✅ Checklist de Sucesso

Execute `VERIFICAR_DADOS.sql` novamente e confirme:

- [ ] Existe pelo menos 1 loja cadastrada
- [ ] A loja tem `city` preenchido
- [ ] A loja tem `state` preenchido
- [ ] Existe pelo menos 1 cliente cadastrado
- [ ] O cliente tem `city` preenchido (mesma cidade da loja)
- [ ] O cliente tem `state` preenchido (mesmo estado da loja)
- [ ] Existem produtos cadastrados
- [ ] Os produtos estão linkados a uma loja

Se todos os itens estão ✅, "Lojas Próximas" deve estar funcionando!

