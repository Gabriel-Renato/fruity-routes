DO $$ 
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'products' 
    AND auth.role() = 'authenticated'
);

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

CREATE POLICY "Users can delete own product images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'products' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

