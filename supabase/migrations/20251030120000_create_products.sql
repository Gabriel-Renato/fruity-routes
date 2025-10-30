-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_milli INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas: qualquer usuário pode ver produtos (catálogo público)
CREATE POLICY "Public can view products"
  ON public.products
  FOR SELECT
  USING (true);

-- Dono (loja) pode inserir/atualizar/deletar seus produtos
CREATE POLICY "Store can insert own products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Store can update own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = store_id);

CREATE POLICY "Store can delete own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = store_id);


