import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, MapPin, Clock, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_milli: number; store_id: string }>>([]);
  const { addItem, items, totalMilli, clear } = useCart();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        setUserType(null);
        return;
      }
      setUser(user);
      const typeFromMeta = (user.user_metadata as any)?.user_type as string | undefined;
      const effectiveType = typeFromMeta || "customer";
      setUserType(effectiveType);
      if (effectiveType !== "customer") {
        const dashboardRoutes: Record<string, string> = {
          customer: "/dashboard/customer",
          store: "/dashboard/store",
          rider: "/dashboard/rider",
        };
        navigate(dashboardRoutes[effectiveType] || "/auth");
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from("products").select("id,name,price_milli,store_id").order("created_at", { ascending: false });
      setProducts(data || []);
    };
    loadProducts();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToLogin = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            StarFruitC
          </h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                <Button variant="outline" onClick={handleLogout}>Sair</Button>
              </>
            ) : (
              <Button onClick={goToLogin}>Entrar</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Olá, Cliente! 🍊</h2>
          <p className="text-muted-foreground">
            {user ? "Bem-vindo ao seu painel de pedidos" : "Explore ofertas e lojas. Entre para fazer pedidos."}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: "Pedidos Ativos", value: "0", color: "primary" },
            { icon: Clock, label: "Histórico", value: "0", color: "secondary" },
            { icon: MapPin, label: "Endereços", value: "0", color: "accent" },
            { icon: User, label: "Perfil", value: "Completo", color: "primary" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-[var(--shadow-primary)] transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 text-${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-[var(--shadow-primary)]">
          <CardHeader>
            <CardTitle>Lojas Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Nenhuma loja disponível ainda</p>
              <p className="text-sm">
                Em breve você poderá fazer pedidos das lojas mais próximas!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Produtos</h3>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto disponível.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {products.map(p => (
                <Card key={p.id} className="hover:shadow-[var(--shadow-primary)] transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">R$ {(p.price_milli/1000).toFixed(2)}</span>
                    <Button size="sm" onClick={() => addItem({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id })}>Adicionar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Carrinho</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
          ) : (
            <div className="space-y-3">
              {items.map(i => (
                <div key={i.productId} className="flex items-center justify-between border rounded-md p-3">
                  <span>{i.name} x{i.qty}</span>
                  <span className="text-sm text-muted-foreground">R$ {((i.priceMilli*i.qty)/1000).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">R$ {(totalMilli/1000).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clear}>Limpar</Button>
                <Button onClick={async () => {
                  const { data: { user: u } } = await supabase.auth.getUser();
                  if (!u) { navigate('/auth'); return; }
                  if (items.length === 0) return;
                  const storeId = items[0].storeId;
                  const { data: order, error } = await supabase.from('orders').insert({ customer_id: u.id, store_id: storeId, total_milli: totalMilli }).select('*').single();
                  if (!order || error) return;
                  const payload = items.map(i => ({ order_id: order.id, product_id: i.productId, qty: i.qty, unit_price_milli: i.priceMilli, subtotal_milli: i.priceMilli*i.qty }));
                  await supabase.from('order_items').insert(payload);
                  clear();
                }}>Finalizar Pedido</Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="hover:shadow-[var(--shadow-primary)] transition-shadow">
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <span>Frutas</span>
                <span>Verduras</span>
                <span>Orgânicos</span>
                <span>Promoções</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-primary)] transition-shadow">
            <CardHeader>
              <CardTitle>Promoções</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Ofertas da semana com até 30% OFF</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-primary)] transition-shadow">
            <CardHeader>
              <CardTitle>Recomendados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Seleções fresquinhas para você 🍇🍉</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Card className="hover:shadow-[var(--shadow-primary)] transition-shadow">
            <CardHeader>
              <CardTitle>Lojas em destaque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Em breve: parceiros verificados perto de você</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-primary)] transition-shadow">
            <CardHeader>
              <CardTitle>Pedidos recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Entre para ver seu histórico de pedidos</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
