import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, MapPin, Clock, DollarSign, User, Award, Calendar, FileText, Phone, CarFront, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

const RiderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    deliveriesToday: 0,
    onRoute: 0,
    avgTime: 0,
    earningsToday: 0,
    totalEarnings: 0,
    rating: 4.9
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        // Carregar perfil com informações de CNH
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone, cnh_number, cnh_category, cnh_expiry, vehicle_type, vehicle_plate, city, state")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
    };

    checkUser();
  }, [navigate]);

  // Carregar entregas disponíveis (pedidos atribuídos a este motorista)
  useEffect(() => {
    const loadAvailableDeliveries = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("id, customer_id, store_id, total_milli, created_at, status, payment_method")
        .eq("rider_id", user.id)
        .in("status", ["ready", "on_way"])
        .order("created_at", { ascending: true })
        .limit(10);
      setAvailableDeliveries(data || []);
    };
    loadAvailableDeliveries();
  }, [user]);

  // Carregar histórico de entregas
  useEffect(() => {
    const loadDeliveryHistory = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("id, customer_id, store_id, total_milli, created_at, status")
        .in("status", ["delivered", "on_way"])
        .order("created_at", { ascending: false })
        .limit(10);
      setDeliveryHistory(data || []);
      
      // Calcular estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDeliveries = (data || []).filter(d => new Date(d.created_at) >= today);
      setStats({
        deliveriesToday: todayDeliveries.length,
        onRoute: (data || []).filter(d => d.status === "on_way").length,
        avgTime: 25, // minutos (mockado)
        earningsToday: todayDeliveries.reduce((sum, d) => sum + (d.total_milli || 0) * 0.1, 0) / 1000, // 10% do pedido
        totalEarnings: (data || []).reduce((sum, d) => sum + (d.total_milli || 0) * 0.1, 0) / 1000,
        rating: 4.9
      });
    };
    if (user) {
      loadDeliveryHistory();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAcceptDelivery = async (orderId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ status: "on_way" })
      .eq("id", orderId)
      .eq("rider_id", user.id);
    
    if (error) {
      console.error('Erro ao aceitar entrega:', error);
      alert('Erro ao aceitar entrega. Tente novamente.');
    } else {
      setAvailableDeliveries(availableDeliveries.map(d => 
        d.id === orderId ? { ...d, status: "on_way" } : d
      ));
      alert('Entrega aceita com sucesso!');
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("rider_id", user.id);
    
    if (error) {
      console.error('Erro ao completar entrega:', error);
      alert('Erro ao completar entrega. Tente novamente.');
    } else {
      setAvailableDeliveries(availableDeliveries.filter(d => d.id !== orderId));
      alert('Entrega finalizada com sucesso!');
      
      // Recarregar histórico
      if (user) {
        const { data } = await supabase
          .from("orders")
          .select("id, customer_id, store_id, total_milli, created_at, status")
          .in("status", ["delivered", "on_way"])
          .order("created_at", { ascending: false })
          .limit(10);
        setDeliveryHistory(data || []);
      }
    }
  };

  const isCnhExpiringSoon = profile?.cnh_expiry ? new Date(profile.cnh_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : false;
  const isCnhExpired = profile?.cnh_expiry ? new Date(profile.cnh_expiry) < new Date() : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Moderna */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <Bike className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
              StarFruit
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100">
              <User className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="rounded-full">Sair</Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1 text-gray-900">
            Olá, {profile?.full_name || user?.email?.split('@')[0] || 'Entregador'}! 🏍️
          </h2>
          <p className="text-gray-600">Gerencie suas entregas e acompanhe seus ganhos</p>
        </div>

        {/* Cards de Estatísticas Modernos */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Bike, label: "Entregas Hoje", value: stats.deliveriesToday.toString(), color: "bg-purple-500", textColor: "text-purple-600", badge: "Hoje" },
            { icon: MapPin, label: "Em Rota", value: stats.onRoute.toString(), color: "bg-blue-500", textColor: "text-blue-600", badge: "Agora" },
            { icon: Clock, label: "Tempo Médio", value: `${stats.avgTime}min`, color: "bg-green-500", textColor: "text-green-600", badge: "Média" },
            { icon: DollarSign, label: "Ganhos Hoje", value: `R$ ${stats.earningsToday.toFixed(2)}`, color: "bg-orange-500", textColor: "text-orange-600", badge: "Hoje" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">{stat.badge}</Badge>
                  </div>
                  <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>{stat.value}</div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informações do Perfil e CNH */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Card de Perfil */}
          <Card 
            className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => navigate("/profile")}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Meu Perfil</CardTitle>
                  <p className="text-xs text-gray-500">Informações pessoais</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{profile?.full_name || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{profile?.phone || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{profile?.city || "Não informado"}{profile?.state ? `, ${profile.state}` : ""}</span>
              </div>
              {profile?.vehicle_type && (
                <div className="flex items-center gap-2 text-sm">
                  <CarFront className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 capitalize">{profile.vehicle_type}</span>
                  {profile.vehicle_plate && (
                    <Badge variant="outline" className="ml-auto">{profile.vehicle_plate}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de CNH */}
          <Card className={`bg-white border-2 ${isCnhExpired ? 'border-red-300' : isCnhExpiringSoon ? 'border-yellow-300' : 'border-gray-200'} shadow-md`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${isCnhExpired ? 'bg-red-500' : isCnhExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'} flex items-center justify-center`}>
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">CNH</CardTitle>
                    <p className="text-xs text-gray-500">Documentação</p>
                  </div>
                </div>
                {isCnhExpired ? (
                  <Badge className="bg-red-500 text-white">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Vencida
                  </Badge>
                ) : isCnhExpiringSoon ? (
                  <Badge className="bg-yellow-500 text-white">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Vence em breve
                  </Badge>
                ) : (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Válida
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 font-mono">{profile?.cnh_number || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">Categoria: {profile?.cnh_category || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  Validade: {profile?.cnh_expiry ? new Date(profile.cnh_expiry).toLocaleDateString('pt-BR') : "Não informado"}
                </span>
              </div>
              {!profile?.cnh_number && (
                <Button variant="outline" className="w-full mt-2 rounded-full" onClick={() => navigate("/auth")}>
                  Atualizar CNH
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Card de Performance */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Performance</CardTitle>
                  <p className="text-xs text-gray-600">Avaliações e ganhos</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Avaliação</span>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-gray-900">{stats.rating}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Total Ganhos</span>
                <span className="font-bold text-purple-600">R$ {stats.totalEarnings.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Entregas Totais</span>
                <span className="font-bold text-gray-900">{deliveryHistory.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entregas Disponíveis e Histórico */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Entregas Disponíveis */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">Entregas Disponíveis</CardTitle>
                {availableDeliveries.length > 0 && (
                  <Badge className="bg-green-500 text-white">{availableDeliveries.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {availableDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium mb-2">Nenhuma entrega disponível</p>
                  <p className="text-sm text-gray-400">Novas entregas aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableDeliveries.map(delivery => (
                    <Card key={delivery.id} className={`border hover:shadow-md transition-all ${
                      delivery.status === "ready" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-1">Pedido #{delivery.id.slice(0, 8).toUpperCase()}</h4>
                            <p className="text-sm text-gray-600">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(delivery.created_at).toLocaleString('pt-BR')}
                            </p>
                            {delivery.payment_method && (
                              <p className="text-xs text-gray-500 mt-1">
                                💳 {delivery.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                     delivery.payment_method === 'debit_card' ? 'Cartão de Débito' :
                                     delivery.payment_method === 'pix' ? 'PIX' :
                                     delivery.payment_method === 'cash' ? 'Dinheiro' : delivery.payment_method}
                              </p>
                            )}
                          </div>
                          <Badge className={`text-white ${
                            delivery.status === "ready" ? "bg-green-500" : "bg-blue-500"
                          }`}>
                            {delivery.status === "ready" ? "Pronto" : "Em Rota"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <span className="text-sm text-gray-700">Ganho estimado</span>
                          <span className={`text-lg font-bold ${delivery.status === "ready" ? "text-green-600" : "text-blue-600"}`}>
                            R$ {((delivery.total_milli || 0) * 0.1 / 1000).toFixed(2)}
                          </span>
                        </div>
                        {delivery.status === "ready" ? (
                          <Button 
                            className="w-full mt-3 rounded-full bg-green-500 hover:bg-green-600"
                            onClick={() => handleAcceptDelivery(delivery.id)}
                          >
                            Aceitar Entrega
                          </Button>
                        ) : (
                          <Button 
                            className="w-full mt-3 rounded-full bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleCompleteDelivery(delivery.id)}
                          >
                            Finalizar Entrega
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Entregas */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">Histórico de Entregas</CardTitle>
                {deliveryHistory.length > 0 && (
                  <Badge variant="secondary">{deliveryHistory.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {deliveryHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium mb-2">Nenhuma entrega realizada</p>
                  <p className="text-sm text-gray-400">Seu histórico aparecerá aqui</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {deliveryHistory.map(delivery => {
                    const statusColors: Record<string, string> = {
                      delivered: "bg-green-100 text-green-800",
                      on_way: "bg-blue-100 text-blue-800",
                    };
                    const statusLabels: Record<string, string> = {
                      delivered: "Entregue",
                      on_way: "Em Rota",
                    };
                    return (
                      <div key={delivery.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">Pedido #{delivery.id.slice(0, 8).toUpperCase()}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(delivery.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge className={`${statusColors[delivery.status] || statusColors.delivered} text-xs`}>
                            {statusLabels[delivery.status] || delivery.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                          <span className="text-sm text-gray-600">Ganho</span>
                          <span className="font-bold text-purple-600">R$ {((delivery.total_milli || 0) * 0.1 / 1000).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RiderDashboard;
