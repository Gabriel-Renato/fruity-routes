-- Migration: Configurar bucket de storage para produtos
-- Data: 2025-11-05
-- Descrição: Configurar políticas RLS para o bucket 'products' no Supabase Storage
-- IMPORTANTE: O bucket 'products' precisa ser criado manualmente no Supabase Dashboard:
-- 1. Vá em Storage > Create Bucket
-- 2. Nome: products
-- 3. Público: true
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

    -- Política RLS: Qualquer um pode ver imagens (público)
    DO $$ 
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public can view product images'
    ) THEN
        CREATE POLICY "Public can view product images"
        ON storage.objects
        FOR SELECT
        USING (bucket_id = 'products');
    END IF;
    END $$;

    -- Política RLS: Usuários autenticados podem fazer upload de imagens
    DO $$ 
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload product images'
    ) THEN
        CREATE POLICY "Authenticated users can upload product images"
        ON storage.objects
        FOR INSERT
        WITH CHECK (
        bucket_id = 'products' 
        AND auth.role() = 'authenticated'
        );
    END IF;
    END $$;

    -- Política RLS: Usuários podem atualizar apenas suas próprias imagens
    DO $$ 
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update own product images'
    ) THEN
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
    END IF;
    END $$;

    -- Política RLS: Usuários podem deletar apenas suas próprias imagens
    DO $$ 
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete own product images'
    ) THEN
        CREATE POLICY "Users can delete own product images"
        ON storage.objects
        FOR DELETE
        USING (
        bucket_id = 'products' 
        AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
    END $$;

