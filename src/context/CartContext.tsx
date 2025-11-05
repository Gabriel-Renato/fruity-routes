import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = { productId: string; name: string; priceMilli: number; qty: number; storeId: string };
type CartState = { items: CartItem[] };

type CartContextValue = {
  items: CartItem[];
  totalMilli: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<CartState>({ items: [] });

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) {
      try { setState(JSON.parse(raw)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(state));
  }, [state]);

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setState(prev => {
      // Permite produtos de diferentes lojas no carrinho
      const items = [...prev.items];
      const idx = items.findIndex(i => i.productId === item.productId && i.storeId === item.storeId);
      if (idx >= 0) {
        items[idx] = { ...items[idx], qty: items[idx].qty + qty };
      } else {
        items.push({ ...item, qty });
      }
      return { items };
    });
  };

  const clear = () => setState({ items: [] });

  const totalMilli = useMemo(() => state.items.reduce((s, i) => s + i.priceMilli * i.qty, 0), [state.items]);

  const value = useMemo(() => ({ items: state.items, totalMilli, addItem, clear }), [state.items, totalMilli]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};


