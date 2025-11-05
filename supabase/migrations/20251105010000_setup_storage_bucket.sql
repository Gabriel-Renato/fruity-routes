-- Migration: Configurar bucket de storage para produtos
-- Data: 2025-11-05
-- Descrição: Configurar políticas RLS para o bucket 'products' no Supabase Storage
-- IMPORTANTE: O bucket 'products' precisa ser criado manualmente no Supabase Dashboard:
-- 1. Vá em Storage > Create Bucket
-- 2. Nome: products
-- 3. Público: true (CRÍTICO - sem isso as imagens não carregam!)
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
-- 6. Depois de criar, execute esta migração para configurar as políticas RLS

    -- Habilitar RLS na tabela storage.objects se ainda não estiver habilitado
    DO $$ 
    BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    EXCEPTION
    WHEN OTHERS THEN
        -- RLS já está habilitado, continuar
        NULL;
    END $$;

    -- Remover políticas antigas se existirem (para evitar conflitos)
    DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

    -- Política RLS: Qualquer um pode ver imagens (público)
    -- IMPORTANTE: Esta política permite acesso público apenas para leitura
    -- O bucket TAMBÉM precisa estar marcado como público no Dashboard
    CREATE POLICY "Public can view product images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'products');

    -- Política RLS: Usuários autenticados podem fazer upload de imagens
    CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'products' 
        AND auth.role() = 'authenticated'
    );

    -- Política RLS: Usuários podem atualizar apenas suas próprias imagens
    CREATE POLICY "Users can update own product images"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'products' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'products' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Política RLS: Usuários podem deletar apenas suas próprias imagens
    CREATE POLICY "Users can delete own product images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'products' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

