-- SQL para apagar TODOS os produtos cadastrados
-- ⚠️ ATENÇÃO: Este comando apagará TODOS os produtos do banco de dados!
-- ⚠️ Isso também apagará automaticamente:
--    - Promoções relacionadas (ON DELETE CASCADE)
--    - Categorias dos produtos (product_categories)
--    - Itens do carrinho (cart_items)
--    - order_items precisam ser deletados primeiro (ON DELETE RESTRICT)

-- Opção 1: Deletar order_items primeiro, depois produtos (RECOMENDADO)
BEGIN;

-- 1. Deletar todos os order_items (para evitar erro de foreign key)
DELETE FROM public.order_items;

-- 2. Deletar todos os produtos (isso deletará automaticamente promoções, categorias, cart_items)
DELETE FROM public.products;

-- Verificar quantos produtos foram deletados
SELECT COUNT(*) as produtos_restantes FROM public.products;

COMMIT;

-- Opção 2: Deletar tudo de uma vez (mais rápido, mas pode dar erro se houver order_items)
-- TRUNCATE TABLE public.order_items CASCADE;
-- TRUNCATE TABLE public.products CASCADE;

-- Opção 3: Se quiser manter order_items mas apagar produtos
-- (NÃO RECOMENDADO - pode causar inconsistências)
-- UPDATE public.order_items SET product_id = NULL WHERE product_id IS NOT NULL;
-- DELETE FROM public.products;
