import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, MapPin, Clock, User, Store, Star, TrendingDown, Sparkles, ShoppingCart, CreditCard, Wallet, QrCode, Bike, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_milli: number; store_id: string; image_url?: string }>>([]);
  const [nearbyStores, setNearbyStores] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; created_at: string; total_milli: number; status: string; store_id: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isActiveOrdersModalOpen, setIsActiveOrdersModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<Array<{ id: string; product_id: string; discount_percentage: number; end_date: string | null }>>([]);
  const [storesMap, setStoresMap] = useState<Record<string, { name: string }>>({});
  const [isPixFinalizing, setIsPixFinalizing] = useState(false);
  const { addItem, items, totalMilli, clear } = useCart();

  // Função para adicionar item ao carrinho com feedback visual
  const handleAddToCart = (item: { productId: string; name: string; priceMilli: number; storeId: string }) => {
    const existingItem = items.find(i => i.productId === item.productId);
    const currentQty = existingItem ? existingItem.qty : 0;
    const newQty = currentQty + 1;
    
    addItem(item);
    
    toast({
      title: "✅ Adicionado ao carrinho!",
      description: `${item.name}${newQty > 1 ? ` (${newQty}x)` : ''} - R$ ${(item.priceMilli / 1000).toFixed(2)}`,
      duration: 3000,
    });
  };

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
      const { data } = await supabase.from("products").select("id,name,price_milli,store_id,image_url").order("created_at", { ascending: false });
      setProducts(data || []);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadPromotions = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("promotions")
        .select("id, product_id, discount_percentage, end_date")
        .eq("active", true)
        .lte("start_date", now);
      
      // Filtrar promoções que não expiraram
      const validPromotions = (data || []).filter(p => 
        !p.end_date || new Date(p.end_date) >= new Date()
      );
      setPromotions(validPromotions);
    };
    loadPromotions();
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
      
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, city, state, owner_id")
          .eq("city", profile.city)
          .eq("active", true);
        
        if (error) {
          console.error('Erro ao carregar lojas:', error);
          setNearbyStores([]);
        } else {
          setNearbyStores(data || []);
          // Criar mapa de lojas para acesso rápido
          const map: Record<string, { name: string }> = {};
          (data || []).forEach(store => {
            map[store.owner_id] = { name: store.name };
          });
          setStoresMap(prev => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Erro ao carregar lojas:', err);
        setNearbyStores([]);
      }
    };
    
    loadNearbyStores();
  }, [profile]);

  // Carregar informações das lojas dos produtos no carrinho
  useEffect(() => {
    const loadCartStores = async () => {
      if (items.length === 0) return;
      
      const storeIds = [...new Set(items.map(i => i.storeId))];
      const missingStores = storeIds.filter(id => !storesMap[id]);
      
      if (missingStores.length === 0) return;
      
      try {
        const { data } = await supabase
          .from("stores")
          .select("owner_id, name")
          .in("owner_id", missingStores);
        
        if (data) {
          const newMap = { ...storesMap };
          data.forEach(store => {
            newMap[store.owner_id] = { name: store.name };
          });
          setStoresMap(newMap);
        }
      } catch (err) {
        console.error('Erro ao carregar lojas do carrinho:', err);
      }
    };
    
    loadCartStores();
  }, [items]);

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
      
      // Configurar listener para mudanças de status dos pedidos
      const ordersSubscription = supabase
        .channel('customer-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`
          },
          (payload) => {
            const order = payload.new as any;
            const oldOrder = payload.old as any;
            
            // Se o status mudou para "ready", notificar o cliente
            if (order.status === "ready" && oldOrder?.status !== "ready") {
              toast({
                title: "🎉 Pedido Pronto!",
                description: "Seu pedido está pronto para retirada! Um motorista será atribuído em breve.",
              });
              
              // Recarregar pedidos
              loadRecentOrders();
            }
            
            // Se o motorista aceitou a entrega (going_to_store)
            if ((order as any).rider_status === "going_to_store" && (oldOrder as any)?.rider_status !== "going_to_store") {
              toast({
                title: "🚚 Motorista a caminho da loja!",
                description: "Um motorista aceitou seu pedido e está indo até a loja para retirar.",
              });
              
              loadRecentOrders();
            }
            
            // Se o motorista chegou na loja
            if ((order as any).rider_status === "at_store" && (oldOrder as any)?.rider_status !== "at_store") {
              toast({
                title: "📍 Motorista chegou na loja!",
                description: "O motorista chegou na loja e está aguardando seu pedido ficar pronto.",
              });
              
              loadRecentOrders();
            }
            
            // Se o motorista está indo até o cliente
            if ((order as any).rider_status === "going_to_customer" && (oldOrder as any)?.rider_status !== "going_to_customer") {
              toast({
                title: "🚚 Pedido a Caminho!",
                description: "O motorista pegou seu pedido e está indo até você!",
              });
              
              loadRecentOrders();
            }
            
            // Se o status mudou para "on_way", notificar que está a caminho (fallback para pedidos antigos)
            if (order.status === "on_way" && oldOrder?.status !== "on_way" && !(order as any).rider_status) {
              toast({
                title: "🚚 Pedido a Caminho!",
                description: "Seu pedido saiu para entrega!",
              });
              
              loadRecentOrders();
            }
            
            // Se o status mudou para "delivered", notificar que foi entregue
            if (order.status === "delivered" && oldOrder?.status !== "delivered") {
              toast({
                title: "✅ Pedido Entregue!",
                description: "Seu pedido foi entregue com sucesso! Obrigado pela preferência.",
              });
              
              // Recarregar pedidos
              loadRecentOrders();
            }
          }
        )
        .subscribe();
      
      // Limpar subscription ao desmontar
      return () => {
        ordersSubscription.unsubscribe();
      };
    }
  }, [user, toast]);

  useEffect(() => {
    const loadActiveOrders = async () => {
      if (!user || !isActiveOrdersModalOpen) return;
      
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, total_milli, status, store_id, rider_id, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip")
        .eq("customer_id", user.id)
        .in("status", ["pending", "preparing", "ready", "on_way"])
        .order("created_at", { ascending: false });
      
      setActiveOrders(orders || []);
    };
    
    if (user && isActiveOrdersModalOpen) {
      loadActiveOrders();
      
      // Recarregar a cada 10 segundos quando o modal estiver aberto
      const interval = setInterval(loadActiveOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [user, isActiveOrdersModalOpen]);

  useEffect(() => {
    const loadHistoryOrders = async () => {
      if (!user || !isHistoryModalOpen) return;
      
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id, 
          created_at, 
          total_milli, 
          status, 
          store_id, 
          rider_id, 
          payment_method, 
          delivery_street, 
          delivery_city, 
          delivery_state, 
          delivery_zip,
          order_items(
            product_id, 
            qty, 
            unit_price_milli, 
            subtotal_milli, 
            products(name, unit)
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      
      setHistoryOrders(orders || []);
    };
    
    if (user && isHistoryModalOpen) {
      loadHistoryOrders();
    }
  }, [user, isHistoryModalOpen]);

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (data && data.length > 0) {
        setAddresses(data);
        setSelectedAddress(data[0]); // Seleciona o primeiro endereço por padrão
      }
    };
    
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToLogin = () => {
    navigate("/auth");
  };

  // Finalizar automaticamente quando PIX for selecionado
  useEffect(() => {
    if (selectedPaymentMethod === 'pix' && selectedAddress && items.length > 0 && isPaymentModalOpen && !isPixFinalizing) {
      setIsPixFinalizing(true);
      // Pequeno delay para garantir que o estado está atualizado e mostrar o QR code
      const timer = setTimeout(async () => {
        await finalizeOrderWithMethod('pix');
        setIsPixFinalizing(false);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaymentMethod, selectedAddress, isPaymentModalOpen]);

  // Finalizar pedido com método de pagamento (separado por loja)
  const finalizeOrderWithMethod = async (paymentMethod?: string) => {
    const method = paymentMethod || selectedPaymentMethod;
    
    if (!method) {
      toast({
        title: "Atenção",
        description: "Selecione uma forma de pagamento",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress) {
      toast({
        title: "Atenção",
        description: "É necessário ter um endereço cadastrado. Complete seu perfil primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { navigate('/auth'); return; }
    if (items.length === 0) return;
    
    // Agrupar itens por loja
    const itemsByStore = items.reduce((acc, item) => {
      if (!acc[item.storeId]) {
        acc[item.storeId] = [];
      }
      acc[item.storeId].push(item);
      return acc;
    }, {} as Record<string, typeof items>);
    
    const storeIds = Object.keys(itemsByStore);
    const createdOrders: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Criar um pedido para cada loja
    for (const storeId of storeIds) {
      const storeItems = itemsByStore[storeId];
      const storeTotal = storeItems.reduce((sum, item) => sum + (item.priceMilli * item.qty), 0);
      
      const { data: order, error } = await supabase
        .from('orders')
        .insert({ 
          customer_id: u.id, 
          store_id: storeId, 
          total_milli: storeTotal,
          payment_method: method,
          delivery_street: selectedAddress.street,
          delivery_city: selectedAddress.city,
          delivery_state: selectedAddress.state,
          delivery_zip: selectedAddress.zip,
          delivery_complement: selectedAddress.label
        })
        .select('*')
        .single();
      
      if (!order || error) {
        console.error('Erro ao criar pedido para loja:', storeId, error);
        errorCount++;
        continue;
      }
      
      createdOrders.push(order.id);
      
      // Adicionar itens do pedido
      const payload = storeItems.map(i => ({ 
        order_id: order.id, 
        product_id: i.productId, 
        qty: i.qty, 
        unit_price_milli: i.priceMilli, 
        subtotal_milli: i.priceMilli * i.qty 
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(payload);
      
      if (itemsError) {
        console.error('Erro ao adicionar itens ao pedido:', itemsError);
        errorCount++;
        continue;
      }
      
      successCount++;
    }
    
    if (errorCount > 0) {
      toast({
        title: "Atenção",
        description: `${successCount} pedido(s) criado(s) com sucesso, mas ${errorCount} falhou(ram).`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } else {
      toast({
        title: "Sucesso!",
        description: `${successCount} pedido(s) criado(s) com sucesso! ${storeIds.length > 1 ? 'Os pedidos foram separados por loja.' : ''}`,
      });
    }
    
    if (successCount > 0) {
      clear();
      setIsPaymentModalOpen(false);
      setSelectedPaymentMethod(null);
      setSelectedAddress(null);
      setIsPixFinalizing(false);
      
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, total_milli, status, store_id")
        .eq("customer_id", u.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(orders || []);
    }
  };

  // Produtos com desconto (promoções reais do banco)
  const promotionalProducts = products
    .filter(p => promotions.some(promo => promo.product_id === p.id))
    .map(p => {
      const promotion = promotions.find(promo => promo.product_id === p.id);
      if (!promotion) return null;
      const discountPrice = Math.floor(p.price_milli * (1 - promotion.discount_percentage / 100));
      return {
        ...p,
        discountPrice,
        discountPercentage: promotion.discount_percentage,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 6);

  // Produtos recomendados (os mais recentes)
  const recommendedProducts = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      {/* Navbar Premium */}
      <nav className="sticky top-0 z-50 border-b border-orange-100/50 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="/favicon.png" 
                alt="StarFruit Logo" 
                className="w-11 h-11 rounded-xl shadow-sm ring-2 ring-orange-100"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-clip-text text-transparent tracking-tight">
                StarFruit
              </h1>
              <p className="text-[10px] text-gray-400 -mt-1">Frescor Natural</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Ícone do Carrinho com Badge Premium */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-xl hover:bg-orange-50 transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const cartSection = document.querySelector('[data-cart-section]');
                    if (cartSection) {
                      cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      window.scrollTo({ 
                        top: document.querySelector('[data-products-section]')?.getBoundingClientRect().top + window.scrollY - 100 || 0, 
                        behavior: 'smooth' 
                      });
                    }
                  }}
                >
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  {items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg ring-2 ring-white animate-bounce">
                      {items.reduce((sum, item) => sum + item.qty, 0)}
                    </span>
                  )}
                </Button>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-50 to-orange-50/50 border border-orange-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{user?.email?.split('@')[0] || 'Cliente'}</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout} 
                  className="rounded-xl border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all"
                >
                  Sair
                </Button>
              </>
            ) : (
              <Button 
                onClick={goToLogin} 
                className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section Premium */}
        <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl">🍊</span>
              </div>
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">
                  {user ? `Bem-vindo, ${user?.email?.split('@')[0] || 'Cliente'}!` : "Explore o melhor em frutas frescas"}
                </h2>
                <p className="text-orange-50 text-lg md:text-xl">
                  {user ? "Frescor e qualidade entregues na sua porta" : "Entre para fazer seus pedidos"}
                </p>
              </div>
            </div>
            {!user && (
              <Button 
                onClick={goToLogin}
                size="lg"
                className="mt-6 rounded-xl bg-white text-orange-600 hover:bg-orange-50 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              >
                Começar Agora →
              </Button>
            )}
          </div>
        </div>

        {/* Cards de estatísticas Premium */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[
            { icon: ShoppingBag, label: "Pedidos Ativos", value: activeOrdersCount.toString(), gradient: "from-blue-500 to-blue-600", bgGradient: "from-blue-50 to-blue-100/50", onClick: () => setIsActiveOrdersModalOpen(true) },
            { icon: Clock, label: "Histórico", value: recentOrders.length.toString(), gradient: "from-purple-500 to-purple-600", bgGradient: "from-purple-50 to-purple-100/50", onClick: () => setIsHistoryModalOpen(true) },
            { icon: User, label: "Perfil", value: profile?.city ? "✓" : "!", gradient: "from-orange-500 to-orange-600", bgGradient: "from-orange-50 to-orange-100/50", onClick: () => navigate("/profile") },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.label} 
                className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1 ${stat.onClick ? "cursor-pointer" : ""}`}
                onClick={stat.onClick}
              >
                <CardContent className={`p-6 bg-gradient-to-br ${stat.bgGradient} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <Badge className="bg-white/80 text-gray-700 text-xs font-semibold border-0">{stat.label}</Badge>
                    </div>
                    <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>{stat.value}</div>
                    <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Seção de Lojas Próximas - Premium */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Store className="h-7 w-7 text-orange-500" />
                Lojas Próximas
              </h3>
              <p className="text-gray-600">Encontre o melhor perto de você</p>
            </div>
            {nearbyStores.length > 0 && (
              <Badge className="bg-orange-500 text-white text-sm px-3 py-1">{(nearbyStores.length)} loja{nearbyStores.length > 1 ? 's' : ''}</Badge>
            )}
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-orange-100/50 p-8 backdrop-blur-sm">
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
              <div className="grid md:grid-cols-3 gap-6">
                {nearbyStores.map(store => (
                  <Card key={store.id} className="group hover:shadow-2xl transition-all duration-300 border border-orange-100 overflow-hidden cursor-pointer hover:-translate-y-1 bg-gradient-to-br from-white to-orange-50/30">
                    <div className="relative h-40 bg-gradient-to-br from-orange-400 via-orange-300 to-orange-400 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20H0v-2h2zm0 1v2H0v-2h20zm0 4v2H0v-2h20zm0 4v2H0v-2h20z'/%3E%3C/g%3E%3C/svg%3E")`}}></div>
                      <Store className="h-20 w-20 text-white opacity-80 group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white text-orange-600 shadow-lg border-0 font-semibold">Aberto</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{store.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-gray-900">4.8</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">50+ avaliações</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-5">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">{store.city}{store.state ? `, ${store.state}` : ""}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        onClick={() => {
                          setSelectedStore(store);
                          setIsStoreModalOpen(true);
                        }}
                      >
                        Ver Produtos →
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção de Categorias - Premium */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Categorias</h3>
              <p className="text-gray-600">Explore por tipo de produto</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-2 px-2">
            {categories.length > 0 ? (
              categories.map(cat => (
                <Button 
                  key={cat.id} 
                  variant="outline" 
                  className="rounded-2xl px-6 py-3 whitespace-nowrap hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold border-2"
                  onClick={() => {
                    window.scrollTo({ top: document.querySelector('[data-products-section]')?.getBoundingClientRect().top || 0, behavior: 'smooth' });
                  }}
                >
                  {cat.name}
                </Button>
              ))
            ) : (
              <>
                <Button variant="outline" className="rounded-2xl px-6 py-3 whitespace-nowrap hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold border-2">Frutas 🍊</Button>
                <Button variant="outline" className="rounded-2xl px-6 py-3 whitespace-nowrap hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold border-2">Verduras 🥬</Button>
                <Button variant="outline" className="rounded-2xl px-6 py-3 whitespace-nowrap hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold border-2">Orgânicos 🌱</Button>
                <Button variant="outline" className="rounded-2xl px-6 py-3 whitespace-nowrap hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold border-2">Promoções 🔥</Button>
              </>
            )}
          </div>
        </div>

        {/* Seção de Promoções - Premium */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                Promoções Especiais
              </h3>
              <p className="text-gray-600">Ofertas imperdíveis com descontos exclusivos</p>
            </div>
            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm px-4 py-2 shadow-lg">🔥 Ofertas</Badge>
          </div>
          <div className="bg-gradient-to-br from-red-50 via-orange-50/50 to-orange-50 rounded-3xl p-8 border border-orange-200/50 shadow-xl">
            {promotionalProducts.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {promotionalProducts.map(p => (
                  <Card key={p.id} className="group bg-white hover:shadow-2xl transition-all duration-300 border-2 border-red-100 hover:border-red-300 overflow-hidden hover:-translate-y-1">
                    <div className="relative">
                      <div className="h-32 bg-gradient-to-br from-red-100 via-orange-100 to-red-100 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <span className="text-5xl">🍊</span>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg font-bold text-xs px-2 py-1">
                            {p.discountPercentage}% OFF
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="mb-3">
                        <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-orange-600 transition-colors">{p.name}</h4>
                      </div>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-sm text-gray-400 line-through">
                          R$ {(p.price_milli/1000).toFixed(2)}
                        </span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                          R$ {(p.discountPrice/1000).toFixed(2)}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        onClick={() => handleAddToCart({ 
                          productId: p.id, 
                          name: p.name, 
                          priceMilli: p.discountPrice, 
                          storeId: p.store_id 
                        })}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Adicionar ao Carrinho
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <TrendingDown className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-lg">Nenhuma promoção disponível no momento</p>
                <p className="text-sm text-gray-500 mt-2">Fique de olho! Novas ofertas em breve</p>
              </div>
            )}
          </div>
        </div>

        {/* Seção de Recomendados - Premium */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                Recomendados para Você
              </h3>
              <p className="text-gray-600">Seleções fresquinhas escolhidas especialmente para você</p>
            </div>
          </div>
          {recommendedProducts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {recommendedProducts.slice(0, 3).map(p => (
                <Card key={p.id} className="group bg-white hover:shadow-2xl transition-all duration-300 border-2 border-orange-100 hover:border-orange-300 overflow-hidden hover:-translate-y-1">
                  <div className="relative h-40 bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 rounded-t-xl overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <span className="text-6xl opacity-80">🍊</span>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
                        ⭐ Recomendado
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h4 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-orange-600 transition-colors">{p.name}</h4>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">R$ {(p.price_milli/1000).toFixed(2)}</span>
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        onClick={() => handleAddToCart({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id })}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-orange-100">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium text-lg">Nenhum produto recomendado no momento</p>
              <p className="text-sm text-gray-500 mt-2">Explore nossos produtos abaixo</p>
            </div>
          )}
        </div>

        {/* Seção de Produtos - Premium */}
        <div className="mt-10" data-products-section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <ShoppingBag className="h-7 w-7 text-orange-500" />
                Todos os Produtos
              </h3>
              <p className="text-gray-600">Explore nossa variedade completa</p>
            </div>
            <Badge className="bg-orange-500 text-white text-sm px-4 py-2 shadow-lg">{products.length} produtos</Badge>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-orange-100 shadow-lg">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-2">Nenhum produto disponível no momento</p>
              <p className="text-sm text-gray-500">Volte em breve para ver novos produtos</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map(p => (
                <Card key={p.id} className="group bg-white hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-orange-200 overflow-hidden cursor-pointer hover:-translate-y-1">
                  <div className="relative h-48 bg-gradient-to-br from-orange-50 via-orange-100/50 to-orange-50 flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <span className="text-7xl opacity-70 group-hover:scale-110 transition-transform duration-300">🍊</span>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-white/90 backdrop-blur-sm shadow-xl hover:bg-orange-500 hover:text-white border-0" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id });
                        }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h4 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-orange-600 transition-colors line-clamp-2">{p.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">R$ {(p.price_milli/1000).toFixed(2)}</span>
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        onClick={() => handleAddToCart({ productId: p.id, name: p.name, priceMilli: p.price_milli, storeId: p.store_id })}
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

        {/* Carrinho Flutuante - Premium Mobile */}
        {items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-orange-200 shadow-2xl z-50 p-4 md:hidden">
            <div className="container mx-auto flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-900">{items.reduce((sum, item) => sum + item.qty, 0)} item{items.reduce((sum, item) => sum + item.qty, 0) > 1 ? 's' : ''}</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">R$ {(totalMilli/1000).toFixed(2)}</span>
              </div>
              <Button 
                className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg px-6 font-semibold"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Finalizar →
              </Button>
            </div>
          </div>
        )}

        {/* Carrinho Desktop - Premium */}
        <div className="mt-10 hidden md:block" data-cart-section>
          <Card className="bg-white shadow-2xl border-2 border-orange-100 rounded-3xl overflow-hidden">
            <CardHeader className="pb-6 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-orange-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  Meu Carrinho
                </CardTitle>
                {items.length > 0 && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm px-3 py-1 shadow-lg">
                    {items.reduce((sum, item) => sum + item.qty, 0)} item{items.reduce((sum, item) => sum + item.qty, 0) > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-700 font-semibold text-lg mb-2">Seu carrinho está vazio</p>
                  <p className="text-sm text-gray-500 mb-6">Adicione produtos deliciosos para começar</p>
                  <Button 
                    onClick={() => window.scrollTo({ top: document.querySelector('[data-products-section]')?.getBoundingClientRect().top + window.scrollY - 100 || 0, behavior: 'smooth' })}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                  >
                    Explorar Produtos →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Agrupar itens por loja
                    const itemsByStore = items.reduce((acc, item) => {
                      if (!acc[item.storeId]) {
                        acc[item.storeId] = [];
                      }
                      acc[item.storeId].push(item);
                      return acc;
                    }, {} as Record<string, typeof items>);
                    
                    const storeIds = Object.keys(itemsByStore);
                    
                    return storeIds.map((storeId, storeIndex) => {
                      const storeItems = itemsByStore[storeId];
                      const storeTotal = storeItems.reduce((sum, item) => sum + (item.priceMilli * item.qty), 0);
                      const storeName = storesMap[storeId]?.name || `Loja ${storeIndex + 1}`;
                      
                      return (
                        <div key={storeId} className="border-2 border-orange-100 rounded-2xl p-5 bg-gradient-to-br from-white to-orange-50/30 shadow-md hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-orange-100">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                              <Store className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-gray-900 text-lg">{storeName}</span>
                            <Badge className="ml-auto bg-orange-500 text-white shadow-md">{storeItems.length} item{storeItems.length > 1 ? 's' : ''}</Badge>
                          </div>
                          <div className="space-y-3 mb-4">
                            {storeItems.map(i => (
                              <div key={i.productId} className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-50 shadow-sm hover:shadow-md transition-all">
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-900">{i.name}</span>
                                  <p className="text-xs text-gray-500 mt-1">Quantidade: {i.qty}x • R$ {(i.priceMilli/1000).toFixed(2)} cada</p>
                                </div>
                                <span className="font-bold text-orange-600 ml-4 text-base">R$ {((i.priceMilli*i.qty)/1000).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t-2 border-orange-100">
                            <span className="text-base font-bold text-gray-700">Subtotal {storeName}:</span>
                            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">R$ {(storeTotal/1000).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <div className="border-t-2 border-orange-200 pt-6 mt-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-gray-900">Total Geral</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">R$ {(totalMilli/1000).toFixed(2)}</span>
                    </div>
                    {Object.keys(items.reduce((acc, item) => {
                      acc[item.storeId] = true;
                      return acc;
                    }, {} as Record<string, boolean>)).length > 1 && (
                      <div className="mb-4 p-3 bg-white/80 rounded-xl border border-orange-200">
                        <p className="text-xs text-gray-700 flex items-center gap-2">
                          <span className="text-orange-500">ℹ️</span>
                          Os pedidos serão separados por loja na finalização
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={clear} 
                        className="flex-1 rounded-xl border-orange-200 hover:bg-orange-50 hover:border-orange-300 font-semibold"
                      >
                        Limpar Carrinho
                      </Button>
                      <Button 
                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        onClick={() => setIsPaymentModalOpen(true)}
                      >
                        Finalizar Pedido →
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

      {/* Modal de Formas de Pagamento - Premium */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-orange-100">
            <DialogTitle className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              Finalizar Pedido
            </DialogTitle>
            <p className="text-gray-600 mt-2">Confirme seu endereço e forma de pagamento</p>
          </DialogHeader>
          <div className="mt-6 space-y-8">
            {/* Seção de Endereço - Premium */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                Endereço de Entrega
              </h3>
              {addresses.length === 0 ? (
                <div className="p-5 rounded-2xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                  <p className="text-sm text-yellow-900 font-medium mb-3">
                    Você precisa cadastrar um endereço antes de finalizar o pedido.
                  </p>
                  <Button 
                    variant="outline"
                    className="border-yellow-300 hover:bg-yellow-50 rounded-xl"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Cadastrar Endereço
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddress?.id === addr.id;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-lg' 
                            : 'border-gray-200 hover:border-orange-300 hover:shadow-md bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {addr.label && (
                              <div className="font-bold text-gray-900 mb-2 text-lg">{addr.label}</div>
                            )}
                            <div className="text-sm text-gray-600 space-y-1">
                              {addr.street && <div className="font-medium">{addr.street}</div>}
                              <div>
                                {addr.city && addr.state ? `${addr.city}, ${addr.state}` : addr.city || addr.state}
                                {addr.zip && ` - ${addr.zip}`}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ml-4 shadow-lg">
                              <span className="text-white text-lg font-bold">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <Button 
                    variant="outline" 
                    className="w-full mt-3 rounded-xl border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Adicionar Novo Endereço
                  </Button>
                </div>
              )}
            </div>

            {/* Seção de Pagamento - Premium */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                Forma de Pagamento
              </h3>
              <div className="space-y-3">
              {[
                { 
                  id: 'credit_card', 
                  name: 'Cartão de Crédito', 
                  icon: CreditCard, 
                  desc: 'Visa, Mastercard, Elo',
                  paymentType: 'Pessoalmente na entrega'
                },
                { 
                  id: 'debit_card', 
                  name: 'Cartão de Débito', 
                  icon: CreditCard, 
                  desc: 'Visa, Mastercard, Elo',
                  paymentType: 'Pessoalmente na entrega'
                },
                { 
                  id: 'pix', 
                  name: 'PIX', 
                  icon: QrCode, 
                  desc: 'Aprovação instantânea',
                  paymentType: 'Online'
                },
                { 
                  id: 'cash', 
                  name: 'Dinheiro', 
                  icon: Wallet, 
                  desc: 'Pessoalmente na entrega',
                  paymentType: null
                },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod === method.id;
                const isInPerson = method.id === 'credit_card' || method.id === 'debit_card' || method.id === 'cash';
                
                const handlePaymentMethodSelect = () => {
                  setSelectedPaymentMethod(method.id);
                };
                
                return (
                  <button
                    key={method.id}
                    onClick={handlePaymentMethodSelect}
                    className={`w-full p-5 rounded-2xl border-2 transition-all group ${
                      isSelected 
                        ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-lg' 
                        : 'border-gray-200 hover:border-orange-300 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all ${
                          isSelected ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gray-100 group-hover:bg-orange-50'
                        }`}>
                          <Icon className={`h-7 w-7 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="text-left flex-1">
                          <div className={`font-bold text-lg mb-1 ${isSelected ? 'text-orange-600' : 'text-gray-900'}`}>
                            {method.name}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{method.desc}</div>
                          {isInPerson && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="px-2.5 py-1 rounded-lg bg-orange-100 border border-orange-200">
                                <span className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Pessoalmente na entrega
                                </span>
                              </div>
                            </div>
                          )}
                          {method.id === 'pix' && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="px-2.5 py-1 rounded-lg bg-green-100 border border-green-200">
                                <span className="text-xs font-semibold text-green-700">Pagamento online</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ml-4 shadow-lg">
                          <span className="text-white text-lg font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
              
              {/* QR Code PIX - Exemplo para Teste */}
              {selectedPaymentMethod === 'pix' && (
                <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl border-2 border-green-200">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900 mb-1">
                        ⚠️ QR Code de Exemplo - Apenas para Teste
                      </p>
                      <p className="text-xs text-yellow-800">
                        Este é um QR code de exemplo. Em produção, este código será gerado automaticamente com os dados reais do pagamento.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-xl border-2 border-green-200 shadow-lg">
                    <div className="text-center mb-2">
                      <h4 className="font-bold text-gray-900 mb-1">Escaneie o QR Code</h4>
                      <p className="text-sm text-gray-600 mb-2">Use o app do seu banco para pagar</p>
                      {isPixFinalizing && (
                        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg">
                          <p className="text-xs font-semibold text-green-800">Pedido sendo finalizado automaticamente...</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border-2 border-green-300 shadow-inner">
                      <QRCodeSVG
                        value={`00020126580014BR.GOV.BCB.PIX013612345678901234567890123456789012520400005303986540${(totalMilli/1000).toFixed(2)}5802BR5913STARFRUIT LTDA6009BRASILIA62070503***6304TEST`}
                        size={220}
                        level="H"
                        includeMargin={true}
                        fgColor="#000000"
                        bgColor="#FFFFFF"
                      />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Valor</p>
                        <p className="text-2xl font-bold text-orange-600">R$ {(totalMilli/1000).toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Pagamento: <span className="font-semibold">PIX</span> • <span className="font-semibold">Aprovação instantânea</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Total e Botões - Premium */}
            <div className="pt-6 border-t-2 border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  R$ {(totalMilli/1000).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="flex-1 rounded-xl border-orange-200 hover:bg-orange-50 hover:border-orange-300 font-semibold"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => finalizeOrderWithMethod()}
                  disabled={(!selectedPaymentMethod || !selectedAddress) || selectedPaymentMethod === 'pix' || isPixFinalizing}
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  {selectedPaymentMethod === 'pix' ? (isPixFinalizing ? 'Finalizando...' : 'Pedido Finalizado ✓') : 'Confirmar Pedido →'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pedidos Ativos */}
      <Dialog open={isActiveOrdersModalOpen} onOpenChange={setIsActiveOrdersModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
              Meus Pedidos Ativos
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Você não tem pedidos ativos no momento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800",
                    preparing: "bg-blue-100 text-blue-800",
                    ready: "bg-purple-100 text-purple-800",
                    on_way: "bg-green-100 text-green-800",
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "Aguardando Loja",
                    preparing: "Preparando",
                    ready: "Pronto",
                    on_way: "A Caminho",
                  };
                  
                  return (
                    <Card key={order.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">Pedido #{order.id.slice(0, 8).toUpperCase()}</h4>
                              <Badge className={statusColors[order.status] || "bg-gray-100 text-gray-800"}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                              <Clock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleString('pt-BR')}
                            </p>
                            {order.payment_method && (
                              <p className="text-xs text-gray-500 mb-2">
                                💳 Pagamento: {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                            order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                                            order.payment_method === 'pix' ? 'PIX' :
                                            order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method}
                              </p>
                            )}
                            {(order.delivery_street || order.delivery_city) && (
                              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-green-600" />
                                {order.delivery_street && <span>{order.delivery_street}</span>}
                                {order.delivery_city && order.delivery_state && (
                                  <span>{order.delivery_city}, {order.delivery_state}</span>
                                )}
                              </p>
                            )}
                            {order.rider_id && (
                              <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 rounded-lg p-3">
                                <p className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-2">
                                  <Bike className="h-4 w-4" />
                                  Motorista A Caminho
                                </p>
                                <p className="text-xs text-green-600">
                                  Seu pedido está sendo entregue por um de nossos motoristas.
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-xl font-bold text-blue-600">R$ {(order.total_milli/1000).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico de Pedidos */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-6 w-6 text-purple-500" />
              Histórico de Pedidos
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            {historyOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Você ainda não tem histórico de pedidos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyOrders.map((order: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800",
                    preparing: "bg-blue-100 text-blue-800",
                    ready: "bg-purple-100 text-purple-800",
                    on_way: "bg-green-100 text-green-800",
                    delivered: "bg-gray-100 text-gray-800",
                    cancelled: "bg-red-100 text-red-800"
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "Aguardando Loja",
                    preparing: "Preparando",
                    ready: "Pronto",
                    on_way: "A Caminho",
                    delivered: "Entregue",
                    cancelled: "Cancelado"
                  };
                  
                  return (
                    <Card key={order.id} className="border border-gray-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">Pedido #{order.id.slice(0, 8).toUpperCase()}</h4>
                              <Badge className={statusColors[order.status] || "bg-gray-100 text-gray-800"}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                              <Clock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-purple-600">R$ {(order.total_milli/1000).toFixed(2)}</span>
                        </div>

                        {/* Produtos do Pedido */}
                        {order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0 && (
                          <div className="mb-4 pt-4 border-t border-gray-200">
                            <h5 className="font-semibold text-gray-700 mb-3">Itens do Pedido</h5>
                            <div className="space-y-2">
                              {order.order_items.map((item: any, idx: number) => {
                                const product = item.products;
                                return (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{product?.name || 'Produto'}</p>
                                      <p className="text-xs text-gray-500">
                                        {item.qty}x {product?.unit || 'unidade'}
                                      </p>
                                    </div>
                                    <span className="font-semibold text-gray-700">
                                      R$ {(item.subtotal_milli / 1000).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Informações Adicionais */}
                        <div className="pt-3 border-t border-gray-200 space-y-2">
                          {order.payment_method && (
                            <p className="text-xs text-gray-500">
                              💳 Pagamento: {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                            order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                                            order.payment_method === 'pix' ? 'PIX' :
                                            order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method}
                            </p>
                          )}
                          {(order.delivery_street || order.delivery_city) && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-purple-600" />
                              {order.delivery_street && <span>{order.delivery_street}</span>}
                              {order.delivery_city && order.delivery_state && (
                                <span>{order.delivery_city}, {order.delivery_state}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
