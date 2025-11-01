import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, MapPin, Clock, User, Store, Star, TrendingDown, Sparkles, ShoppingCart, CreditCard, Wallet, QrCode } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_milli: number; store_id: string }>>([]);
  const [nearbyStores, setNearbyStores] = useState<Array<{ id: string; name: string; city: string | null; state: string | null; owner_id: string }>>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; created_at: string; total_milli: number; status: string; store_id: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const { addItem, items, totalMilli, clear } = useCart();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        setUserType(null);
        setProfile(null);
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
      } else {
        // Carregar perfil do usuário
        const { data: profileData } = await supabase
          .from("profiles")
          .select("city, state")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
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

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name");
      setCategories(data || []);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadNearbyStores = async () => {
      if (!profile?.city) return;
      
      const { data } = await supabase
        .from("stores")
        .select("id, name, city, state, owner_id")
        .eq("city", profile.city)
        .eq("active", true);
      
      setNearbyStores(data || []);
    };
    
    loadNearbyStores();
  }, [profile]);

  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user) return;
      
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, total_milli, status, store_id")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setRecentOrders(orders || []);
      
      // Contar pedidos ativos
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .in("status", ["pending", "preparing", "ready", "on_way"]);
      
      setActiveOrdersCount(count || 0);
    };
    
    if (user) {
      loadRecentOrders();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToLogin = () => {
    navigate("/auth");
  };

  // Finalizar pedido com método de pagamento
  const finalizeOrder = async () => {
    if (!selectedPaymentMethod) {
      alert('Selecione uma forma de pagamento');
      return;
    }
    
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { navigate('/auth'); return; }
    if (items.length === 0) return;
    
    const storeId = items[0].storeId;
    const { data: order, error } = await supabase
      .from('orders')
      .insert({ 
        customer_id: u.id, 
        store_id: storeId, 
        total_milli: totalMilli,
        payment_method: selectedPaymentMethod
      })
      .select('*')
      .single();
    
    if (!order || error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao finalizar pedido. Tente novamente.');
      return;
    }
    
    const payload = items.map(i => ({ 
      order_id: order.id, 
      product_id: i.productId, 
      qty: i.qty, 
      unit_price_milli: i.priceMilli, 
      subtotal_milli: i.priceMilli*i.qty 
    }));
    
    const { error: itemsError } = await supabase.from('order_items').insert(payload);
    
    if (itemsError) {
      console.error('Erro ao adicionar itens:', itemsError);
      alert('Erro ao adicionar itens ao pedido.');
      return;
    }
    
    clear();
    setIsPaymentModalOpen(false);
    setSelectedPaymentMethod(null);
    
    const { data: orders } = await supabase
      .from("orders")
      .select("id, created_at, total_milli, status, store_id")
      .eq("customer_id", u.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentOrders(orders || []);
    
    alert('Pedido realizado com sucesso!');
  };

  // Produtos com desconto (promoções)
  const promotionalProducts = products.slice(0, 3).map(p => ({
    ...p,
    discountPrice: Math.floor(p.price_milli * 0.7), // 30% OFF
  }));

  // Produtos recomendados (os mais recentes)
  const recommendedProducts = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍊</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
            StarFruit
          </h1>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700 font-medium">{user?.email}</span>
                </div>
                <Button variant="outline" onClick={handleLogout} className="rounded-full">Sair</Button>
              </>
            ) : (
              <Button onClick={goToLogin} className="rounded-full bg-orange-500 hover:bg-orange-600">Entrar</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header com saudação */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1 text-gray-900">
            {user ? `Olá, ${user?.email?.split('@')[0] || 'Cliente'}! 👋` : "Explore o melhor em frutas frescas 🍊"}
          </h2>
          <p className="text-gray-600">
            {user ? "Encontre os melhores produtos perto de você" : "Entre para fazer seus pedidos"}
          </p>
        </div>

        {/* Cards de estatísticas melhorados */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: ShoppingBag, label: "Pedidos Ativos", value: activeOrdersCount.toString(), color: "bg-blue-500", textColor: "text-blue-600" },
            { icon: Clock, label: "Histórico", value: recentOrders.length.toString(), color: "bg-purple-500", textColor: "text-purple-600" },
            { icon: MapPin, label: "Endereços", value: "1", color: "bg-green-500", textColor: "text-green-600" },
            { icon: User, label: "Perfil", value: profile?.city ? "✓" : "!", color: "bg-orange-500", textColor: "text-orange-600" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">{stat.label}</Badge>
                  </div>
                  <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>{stat.value}</div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Seção de Lojas Próximas - Estilo iFood */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Lojas Próximas</h3>
              <p className="text-sm text-gray-500">Encontre o melhor perto de você</p>
            </div>
            {nearbyStores.length > 0 && (
              <Badge variant="secondary" className="text-xs">{(nearbyStores.length)} loja{nearbyStores.length > 1 ? 's' : ''}</Badge>
            )}
          </div>
          
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            {!user ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Faça login para ver lojas próximas</p>
                <Button onClick={goToLogin} className="mt-4">Entrar</Button>
              </div>
            ) : !profile?.city ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Complete seu perfil com sua cidade</p>
                <p className="text-sm">Atualize seu perfil para ver lojas próximas da sua cidade.</p>
              </div>
            ) : nearbyStores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nenhuma loja encontrada na sua cidade</p>
              <p className="text-sm">
                  {profile?.city ? `Não há lojas cadastradas em ${profile.city} ainda.` : "Complete seu perfil com sua cidade."}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {nearbyStores.map(store => (
                  <Card key={store.id} className="hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group cursor-pointer">
                    <div className="relative h-32 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <Store className="h-16 w-16 text-orange-500 opacity-50" />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-orange-500 text-white">Aberto</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900 mb-1">{store.name}</CardTitle>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">4.8</span>
                            <span className="text-gray-400">•</span>
                            <span>50+ avaliações</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span>{store.city}{store.state ? `, ${store.state}` : ""}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full bg-orange-500 hover:bg-orange-600 rounded-full"
                        onClick={() => {
                          setSelectedStore(store);
                          setIsStoreModalOpen(true);
                        }}
                      >
                        Ver Produtos
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção de Categorias - Estilo iFood */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Categorias</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.length > 0 ? (
              categories.map(cat => (
                <Button 
                  key={cat.id} 
                  variant="outline" 
                  className="rounded-full px-6 py-2 whitespace-nowrap hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  onClick={() => {
                    window.scrollTo({ top: document.querySelector('[data-products-section]')?.getBoundingClientRect().top || 0, behavior: 'smooth' });
                  }}
                >
                  {cat.name}
                </Button>
              ))
            ) : (
              <>
                <Button variant="outline" className="rounded-full px-6 py-2 whitespace-nowrap hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">Frutas 🍊</Button>
                <Button variant="outline" className="rounded-full px-6 py-2 whitespace-nowrap hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">Verduras 🥬</Button>
                <Button variant="outline" className="rounded-full px-6 py-2 whitespace-nowrap hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">Orgânicos 🌱</Button>
                <Button variant="outline" className="rounded-full px-6 py-2 whitespace-nowrap hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">Promoções 🔥</Button>
              </>
            )}
          </div>
        </div>

        {/* Seção de Promoções - Estilo iFood */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-red-500" />
                Promoções
              </h3>
              <p className="text-sm text-gray-500">Ofertas da semana com até 30% OFF</p>
            </div>
            <Badge className="bg-red-500 text-white">-30%</Badge>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
            {promotionalProducts.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {promotionalProducts.map(p => (
                  <Card key={p.id} className="bg-white hover:shadow-lg transition-all border border-red-100">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{p.name}</h4>
                          <Badge className="mt-2 bg-red-500 text-white">30% OFF</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-400 line-through">
                          R$ {(p.price_milli/1000).toFixed(2)}
                        </span>
                        <span className="text-xl font-bold text-red-600">
                          R$ {(p.discountPrice/1000).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhuma promoção disponível no momento.</p>
            )}
          </div>
        </div>

        {/* Seção de Recomendados */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                Recomendados
              </h3>
              <p className="text-sm text-gray-500">Seleções fresquinhas para você 🍇🍉</p>
            </div>
          </div>
          {recommendedProducts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {recommendedProducts.slice(0, 3).map(p => (
                <Card key={p.id} className="bg-white hover:shadow-lg transition-all border border-gray-200">
                  <CardContent className="p-4">
                    <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-4xl">🍊</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{p.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-orange-600">R$ {(p.price_milli/1000).toFixed(2)}</span>
                      <Button size="sm" className="rounded-full bg-orange-500 hover:bg-orange-600" onClick={() => addItem({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id })}>
                        Adicionar
                      </Button>
            </div>
          </CardContent>
        </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhum produto recomendado no momento.</p>
          )}
        </div>

        {/* Seção de Produtos - Estilo iFood */}
        <div className="mt-8" data-products-section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Todos os Produtos</h3>
            <Badge variant="secondary">{products.length} produtos</Badge>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum produto disponível no momento</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              {products.map(p => (
                <Card key={p.id} className="bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group cursor-pointer">
                  <div className="relative h-40 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <span className="text-6xl opacity-80">🍊</span>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" className="rounded-full bg-white shadow-md hover:bg-orange-500 hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        addItem({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id });
                      }}>
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-bold text-gray-900 mb-2">{p.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-orange-600">R$ {(p.price_milli/1000).toFixed(2)}</span>
                      <Button 
                        size="sm" 
                        className="rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => addItem({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id })}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Carrinho Flutuante - Estilo iFood */}
        {items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 p-4 md:hidden">
            <div className="container mx-auto flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold text-gray-900">{items.length} item{items.length > 1 ? 's' : ''}</span>
                </div>
                <span className="text-lg font-bold text-orange-600">R$ {(totalMilli/1000).toFixed(2)}</span>
              </div>
              <Button 
                className="rounded-full bg-orange-500 hover:bg-orange-600 px-6"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Finalizar
              </Button>
            </div>
            </div>
          )}

        {/* Carrinho Desktop */}
        <div className="mt-8 hidden md:block">
          <Card className="bg-white shadow-lg border border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  Carrinho
                </CardTitle>
                {items.length > 0 && (
                  <Badge className="bg-orange-500 text-white">{items.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium">Seu carrinho está vazio</p>
                  <p className="text-sm text-gray-400 mt-1">Adicione produtos para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(i => (
                    <div key={i.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{i.name}</span>
                        <p className="text-sm text-gray-500">Quantidade: {i.qty}x</p>
                      </div>
                      <span className="font-bold text-orange-600 ml-4">R$ {((i.priceMilli*i.qty)/1000).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-gray-700">Total</span>
                      <span className="text-2xl font-bold text-orange-600">R$ {(totalMilli/1000).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={clear} className="flex-1 rounded-full">Limpar Carrinho</Button>
                      <Button 
                        className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => setIsPaymentModalOpen(true)}
                      >
                        Finalizar Pedido
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pedidos Recentes - Estilo iFood */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Pedidos Recentes</h3>
              <p className="text-sm text-gray-500">Acompanhe seus últimos pedidos</p>
            </div>
          </div>
          {!user ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Entre para ver seu histórico de pedidos</p>
                <Button onClick={goToLogin} className="mt-4 rounded-full bg-orange-500 hover:bg-orange-600">Entrar</Button>
              </CardContent>
            </Card>
          ) : recentOrders.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Você ainda não fez nenhum pedido</p>
                <p className="text-sm text-gray-400 mt-1">Explore nossos produtos e faça seu primeiro pedido!</p>
            </CardContent>
          </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {recentOrders.map(order => {
                const statusColors: Record<string, string> = {
                  pending: "bg-yellow-100 text-yellow-800",
                  preparing: "bg-blue-100 text-blue-800",
                  ready: "bg-green-100 text-green-800",
                  on_way: "bg-purple-100 text-purple-800",
                  delivered: "bg-gray-100 text-gray-800",
                  cancelled: "bg-red-100 text-red-800"
                };
                const statusLabels: Record<string, string> = {
                  pending: "Pendente",
                  preparing: "Preparando",
                  ready: "Pronto",
                  on_way: "A caminho",
                  delivered: "Entregue",
                  cancelled: "Cancelado"
                };
                return (
                  <Card key={order.id} className="bg-white hover:shadow-lg transition-all border border-gray-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900">Pedido #{order.id.slice(0, 8).toUpperCase()}</h4>
                            <Badge className={`${statusColors[order.status] || statusColors.pending} text-xs`}>
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-xl font-bold text-orange-600">R$ {(order.total_milli/1000).toFixed(2)}</span>
                      </div>
            </CardContent>
          </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Espaço para o carrinho flutuante no mobile */}
        {items.length > 0 && <div className="h-20 md:hidden"></div>}
      </main>

      {/* Modal de Produtos da Loja */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="h-6 w-6 text-orange-500" />
              {selectedStore?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedStore && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span>{selectedStore.city}{selectedStore.state ? `, ${selectedStore.state}` : ""}</span>
                </div>
                {(() => {
                  const storeProducts = products.filter(p => p.store_id === selectedStore.owner_id);
                  return storeProducts.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-4">
                      {storeProducts.map(p => (
                        <Card key={p.id} className="bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden">
                          <div className="relative h-40 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                            <span className="text-6xl opacity-80">🍊</span>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-bold text-gray-900 mb-2">{p.name}</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-orange-600">R$ {(p.price_milli/1000).toFixed(2)}</span>
                              <Button 
                                size="sm" 
                                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => {
                                  addItem({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id });
                                }}
                              >
                                Adicionar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Esta loja ainda não tem produtos cadastrados</p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Formas de Pagamento */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-orange-500" />
              Escolha a Forma de Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            <div className="space-y-3">
              {[
                { 
                  id: 'credit_card', 
                  name: 'Cartão de Crédito', 
                  icon: CreditCard, 
                  desc: 'Visa, Mastercard, Elo'
                },
                { 
                  id: 'debit_card', 
                  name: 'Cartão de Débito', 
                  icon: CreditCard, 
                  desc: 'Visa, Mastercard, Elo'
                },
                { 
                  id: 'pix', 
                  name: 'PIX', 
                  icon: QrCode, 
                  desc: 'Aprovação instantânea'
                },
                { 
                  id: 'cash', 
                  name: 'Dinheiro', 
                  icon: Wallet, 
                  desc: 'Entrega'
                },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-orange-500' : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="text-left">
                          <div className={`font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-900'}`}>
                            {method.name}
                          </div>
                          <div className="text-sm text-gray-500">{method.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">Total</span>
                <span className="text-3xl font-bold text-orange-600">R$ {(totalMilli/1000).toFixed(2)}</span>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="flex-1 rounded-full"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={finalizeOrder}
                  disabled={!selectedPaymentMethod}
                  className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Pedido
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
