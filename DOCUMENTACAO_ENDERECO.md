# 📍 Sistema de Endereços - Documentação

## ✅ Funcionalidades Implementadas

### 1. **Campos de Endereço Completo**
O formulário de cadastro agora inclui todos os campos necessários:
- **CEP** - Busca automática de endereço
- **Rua** - Logradouro
- **Número** - Número do endereço
- **Complemento** - Apto, Bloco, etc. (opcional)
- **Bairro**
- **Cidade**
- **Estado (UF)** - Limitado a 2 caracteres
- **Nome do Endereço** - Casa, Trabalho, etc. (opcional)

### 2. **Integração ViaCEP**
- **API Gratuita**: Utiliza a API pública do ViaCEP (https://viacep.com.br)
- **Busca Automática**: Ao digitar 8 dígitos do CEP, busca automaticamente o endereço
- **Preenchimento Automático**: Preenche automaticamente:
  - Rua (logradouro)
  - Bairro
  - Cidade
  - Estado (UF)
  - Complemento (se disponível)

### 3. **Geolocalização do Navegador**
- **Botão "Usar minha localização"**: Permite usar a geolocalização do navegador
- **Reverse Geocoding**: Usa Nominatim (OpenStreetMap) para converter coordenadas em endereço
- **Preenchimento Automático**: Preenche cidade e estado baseado na localização

### 4. **Salvamento no Banco de Dados**
- Endereço é salvo na tabela `addresses` após o cadastro
- Campo `street` inclui rua, número e complemento
- Campo `label` inclui nome do endereço e bairro
- Cidade e estado também são salvos para uso na busca de lojas próximas

## 📋 Estrutura de Dados

### Tabela `addresses`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key para auth.users)
- label: TEXT (nome do endereço + bairro)
- street: TEXT (rua completa com número e complemento)
- city: TEXT
- state: TEXT (UF - 2 caracteres)
- zip: TEXT (CEP)
- lat: DOUBLE PRECISION (para geolocalização futura)
- lng: DOUBLE PRECISION (para geolocalização futura)
- created_at: TIMESTAMP
```

### Exemplo de Dados Salvos
```json
{
  "user_id": "uuid-do-usuario",
  "label": "Principal - Centro",
  "street": "Rua das Flores, 123 - Apto 45",
  "city": "São Paulo",
  "state": "SP",
  "zip": "01234567"
}
```

## 🔧 Como Funciona

### 1. Cadastro de Cliente

1. Usuário preenche nome e email
2. **Opção A - CEP**:
   - Digita CEP (8 dígitos)
   - Sistema busca automaticamente via ViaCEP
   - Campos são preenchidos automaticamente
   - Usuário completa número e complemento
3. **Opção B - Geolocalização**:
   - Clica em "Usar minha localização"
   - Navegador solicita permissão
   - Sistema obtém coordenadas
   - Sistema busca endereço via Nominatim
   - Campos são preenchidos automaticamente
4. **Opção C - Manual**:
   - Usuário preenche todos os campos manualmente
5. Ao criar conta, endereço é salvo automaticamente na tabela `addresses`

### 2. Busca ViaCEP

```typescript
// Ao digitar CEP completo (8 dígitos)
const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
const data = await response.json();

// Preenche automaticamente:
setStreet(data.logradouro);      // Rua
setNeighborhood(data.bairro);    // Bairro
setCity(data.localidade);        // Cidade
setState(data.uf);               // Estado
setComplement(data.complemento); // Complemento
```

### 3. Geolocalização

```typescript
// 1. Obtém coordenadas do navegador
navigator.geolocation.getCurrentPosition((position) => {
  const { latitude, longitude } = position.coords;
  
  // 2. Faz reverse geocoding via Nominatim
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
  );
  const data = await response.json();
  
  // 3. Preenche campos automaticamente
  setCity(data.address.city);
  setState(data.address.state);
});
```

## 🎨 Interface do Usuário

### Layout do Formulário
```
┌─────────────────────────────────────┐
│ Nome completo                       │
├─────────────────────────────────────┤
│ 📍 Endereço          [Usar Localização]│
│                                     │
│ CEP: [________] [🔍]                │
│ Rua: [________________] Número: [___]│
│ Complemento: [_______] Bairro: [____]│
│ Cidade: [_____________] Estado: [__]│
│ Nome do endereço: [_____________] │
├─────────────────────────────────────┤
│ Email: [____________________________]│
│ Senha: [____________________________]│
└─────────────────────────────────────┘
```

## 🚀 Melhorias Futuras Sugeridas

1. **Validação de CEP**: Validar formato antes de buscar
2. **Múltiplos Endereços**: Permitir cadastrar vários endereços
3. **Mapa Interativo**: Mostrar endereço no mapa
4. **Salvar Coordenadas**: Salvar lat/lng ao usar geolocalização
5. **Autocomplete de Rua**: Sugerir ruas conforme digita
6. **Integração Google Maps**: Usar API do Google para mais precisão
7. **CEP Internacional**: Suporte para endereços fora do Brasil

## ⚠️ Observações Importantes

1. **ViaCEP**: API gratuita, mas pode ter limitações de rate limit
2. **Nominatim**: API gratuita, mas requer User-Agent e pode ter limitações
3. **Geolocalização**: Requer permissão do usuário no navegador
4. **Campos Opcionais**: Complemento e nome do endereço são opcionais
5. **Validação**: CEP deve ter 8 dígitos para busca automática
6. **Formatação**: Estado é automaticamente convertido para maiúsculas

## 🔐 Segurança e Privacidade

- Geolocalização só é usada se o usuário autorizar
- Dados são salvos apenas no banco de dados do Supabase
- APIs externas (ViaCEP, Nominatim) são públicas e gratuitas
- Não armazenamos coordenadas sem permissão explícita

## 📝 Exemplo de Uso

```typescript
// 1. Usuário digita CEP: "01310100"
// 2. Sistema detecta 8 dígitos e busca automaticamente
// 3. ViaCEP retorna:
{
  "cep": "01310-100",
  "logradouro": "Avenida Paulista",
  "complemento": "",
  "bairro": "Bela Vista",
  "localidade": "São Paulo",
  "uf": "SP"
}
// 4. Campos são preenchidos automaticamente
// 5. Usuário completa número: "1578"
// 6. Usuário completa complemento: "Conjunto 101"
// 7. Ao cadastrar, salva:
{
  "street": "Avenida Paulista, 1578 - Conjunto 101",
  "city": "São Paulo",
  "state": "SP",
  "zip": "01310100",
  "label": "Principal - Bela Vista"
}
```

## ✅ Status de Implementação

- ✅ Campos de endereço no formulário
- ✅ Integração ViaCEP
- ✅ Geolocalização do navegador
- ✅ Salvamento no banco de dados
- ✅ Validação e formatação
- ✅ Interface responsiva
- ✅ Feedback visual (loading, toasts)

