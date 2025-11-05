# Configuração do Storage do Supabase para Imagens de Produtos

## Problema: Erro 400 ao carregar imagens

Se você está recebendo erro 400 ao tentar carregar imagens de produtos, é porque o bucket do Supabase Storage não está configurado corretamente.

## Solução: Configurar o Bucket 'products'

### Passo 1: Criar o Bucket no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **New bucket**
5. Configure:
   - **Name**: `products` (exatamente este nome)
   - **Public bucket**: ✅ **MARQUE ESTA OPÇÃO** (CRÍTICO!)
   - **File size limit**: `5` MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`
6. Clique em **Create bucket**

### Passo 2: Executar a Migração

Após criar o bucket, execute a migração:

```bash
# Execute a migração no Supabase
# Vá em SQL Editor > New query
# Cole o conteúdo de: supabase/migrations/20251105010000_setup_storage_bucket.sql
```

Ou usando o CLI do Supabase:

```bash
supabase db push
```

### Passo 3: Verificar as Políticas RLS

1. No Supabase Dashboard, vá em **Storage** > **Policies**
2. Verifique se as seguintes políticas existem para o bucket `products`:
   - ✅ Public can view product images (SELECT)
   - ✅ Authenticated users can upload product images (INSERT)
   - ✅ Users can update own product images (UPDATE)
   - ✅ Users can delete own product images (DELETE)

### Passo 4: Testar

1. Tente fazer upload de uma imagem ao cadastrar um produto
2. Verifique se a imagem aparece no preview
3. Salve o produto e verifique se a imagem aparece no dashboard do cliente

## Troubleshooting

### Erro 400 ao carregar imagem
- ✅ Verifique se o bucket está marcado como **Público** no Dashboard
- ✅ Verifique se a política "Public can view product images" existe
- ✅ Verifique se o nome do bucket é exatamente `products`

### Erro ao fazer upload
- ✅ Verifique se você está logado
- ✅ Verifique se a política "Authenticated users can upload product images" existe
- ✅ Verifique se o arquivo tem menos de 5MB
- ✅ Verifique se o tipo de arquivo é uma imagem (jpg, png, gif, webp)

### Imagem não aparece após upload
- ✅ Verifique se a URL da imagem foi salva no banco (campo `image_url` na tabela `products`)
- ✅ Abra a URL da imagem diretamente no navegador para ver se ela carrega
- ✅ Verifique o console do navegador para erros adicionais

## Notas Importantes

- O bucket **DEVE** estar marcado como público para que as imagens sejam acessíveis
- As políticas RLS são necessárias mesmo com bucket público
- Imagens são organizadas por usuário: `{user_id}/{timestamp}.{ext}`
- Cada usuário só pode atualizar/deletar suas próprias imagens

