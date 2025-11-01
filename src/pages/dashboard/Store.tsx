import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Package, TrendingUp, DollarSign, Plus, Edit, Trash2, ShoppingBag, Clock, Star, MapPin, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const StoreDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_milli: number }>>([]);
  const [orders, setOrders] = useState<Array<{ id: string; created_at: string; total_milli: number; status: string; customer_id: string }>>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    ordersToday: 0,
    monthlySales: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        
        // Carregar produtos
        const { data: productsData } = await supabase
          .from("products")
          .select("id,name,price_milli")
          .eq("store_id", user.id)
          .order("created_at", { ascending: false });
        setProducts(productsData || []);

        // Carregar pedidos
        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, created_at, total_milli, status, customer_id")
          .eq("store_id", user.id)
          .order("created_at", { ascending: false });
        setOrders(ordersData || []);

        // Calcular estatísticas
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersToday = (ordersData || []).filter(o => new Date(o.created_at) >= today);
        const monthlySales = (ordersData || []).filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        }).length;

        setStats({
          totalProducts: productsData?.length || 0,
          ordersToday: ordersToday.length,
          monthlySales,
          totalRevenue: (ordersData || []).reduce((sum, o) => sum + (o.total_milli || 0), 0) / 1000
        });
      }
    };

    checkUser();
  }, [navigate]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto",
        variant: "destructive",
      });
    } else {
      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: "Produto excluído",
        description: "Produto removido com sucesso",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast({
        title: "Status atualizado",
        description: "Status do pedido atualizado com sucesso",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Moderna */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              StarFruit
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="rounded-full">Sair</Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1 text-gray-900">
            Dashboard da Loja 🏪
          </h2>
          <p className="text-gray-600">Gerencie seus produtos e pedidos</p>
        </div>

        {/* Cards de Estatísticas Modernos */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Package, label: "Produtos", value: stats.totalProducts.toString(), color: "bg-blue-500", textColor: "text-blue-600" },
            { icon: ShoppingBag, label: "Pedidos Hoje", value: stats.ordersToday.toString(), color: "bg-green-500", textColor: "text-green-600" },
            { icon: TrendingUp, label: "Vendas Mês", value: stats.monthlySales.toString(), color: "bg-purple-500", textColor: "text-purple-600" },
            { icon: DollarSign, label: "Faturamento", value: `R$ ${stats.totalRevenue.toFixed(2)}`, color: "bg-orange-500", textColor: "text-orange-600" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>{stat.value}</div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Pedidos Pendentes */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">Pedidos Pendentes</CardTitle>
                {orders.filter(o => ["pending", "preparing"].includes(o.status)).length > 0 && (
                  <Badge className="bg-orange-500 text-white">
                    {orders.filter(o => ["pending", "preparing"].includes(o.status)).length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {orders.filter(o => ["pending", "preparing"].includes(o.status)).length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium mb-2">Nenhum pedido pendente</p>
                  <p className="text-sm text-gray-400">Novos pedidos aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orders.filter(o => ["pending", "preparing"].includes(o.status)).map(order => {
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-100 text-yellow-800",
                      preparing: "bg-blue-100 text-blue-800",
                    };
                    const statusLabels: Record<string, string> = {
                      pending: "Pendente",
                      preparing: "Preparando",
                    };
                    return (
                      <Card key={order.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Pedido #{order.id.slice(0, 8).toUpperCase()}</h4>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(order.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <Badge className={`${statusColors[order.status]} text-xs`}>
                              {statusLabels[order.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <span className="text-lg font-bold text-blue-600">R$ {(order.total_milli/1000).toFixed(2)}</span>
                            <div className="flex gap-2">
                              {order.status === "pending" && (
                                <Button 
                                  size="sm" 
                                  className="rounded-full bg-blue-500 hover:bg-blue-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                >
                                  Preparar
                                </Button>
                              )}
                              {order.status === "preparing" && (
                                <Button 
                                  size="sm" 
                                  className="rounded-full bg-green-500 hover:bg-green-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "ready")}
                                >
                                  Pronto
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos Cadastrados */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">Produtos Cadastrados</CardTitle>
                <Button 
                  className="rounded-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => navigate("/store/products/new")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium mb-2">Nenhum produto cadastrado</p>
                  <p className="text-sm text-gray-400 mb-4">Comece adicionando seus primeiros produtos</p>
                  <Button className="rounded-full bg-blue-500 hover:bg-blue-600" onClick={() => navigate("/store/products/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {products.map((p) => (
                    <Card key={p.id} className="border border-gray-200 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{p.name}</h4>
                            <p className="text-lg font-bold text-blue-600">R$ {(p.price_milli / 1000).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => navigate(`/store/products/edit/${p.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button 
                    className="w-full rounded-full bg-blue-500 hover:bg-blue-600 mt-3"
                    onClick={() => navigate("/store/products/new")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Novo Produto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Todos os Pedidos */}
        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Todos os Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Nenhum pedido ainda</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map(order => {
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
                    <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900">Pedido #{order.id.slice(0, 8).toUpperCase()}</h4>
                            <Badge className={`${statusColors[order.status]} text-xs`}>
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-blue-600 ml-4">R$ {(order.total_milli/1000).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StoreDashboard;
