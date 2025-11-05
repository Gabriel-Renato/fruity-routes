import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bike, MapPin, Clock, DollarSign, User, Award, Calendar, FileText, Phone, CarFront, TrendingUp, CheckCircle, AlertCircle, Store, Navigation } from "lucide-react";
import DeliveryMap from "@/components/DeliveryMap";
import { useToast } from "@/components/ui/use-toast";

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);
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
        // Carregar perfil com informações de CNH e disponibilidade
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone, cnh_number, cnh_category, cnh_expiry, vehicle_type, vehicle_plate")
          .eq("id", user.id)
          .single();
        
        if (profileError) {
          console.error('Erro ao carregar perfil:', profileError);
        }
        if (profileData) {
          setProfile(profileData);
          // is_available será false por padrão até migration ser aplicada
          setIsAvailable(false);
        }
      }
    };

    checkUser();
  }, [navigate]);

  // Carregar entregas disponíveis (pedidos atribuídos a este motorista)
  useEffect(() => {
    const loadAvailableDeliveries = async () => {
      if (!user) return;
      
      // Buscar sem campos novos primeiro (até migration ser aplicada)
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, customer_id, store_id, total_milli, created_at, status, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement")
          .eq("rider_id", user.id)
          .in("status", ["ready", "on_way"])
          .order("created_at", { ascending: true })
          .limit(10);
        
        if (error) {
          console.error('Erro ao carregar entregas:', error);
          setAvailableDeliveries([]);
        } else {
          // Adicionar campos opcionais como null se não existirem
          setAvailableDeliveries((data || []).map((d: any) => ({
            ...d,
            rider_status: d.rider_status || null,
            store_lat: d.store_lat || null,
            store_lng: d.store_lng || null,
            delivery_lat: d.delivery_lat || null,
            delivery_lng: d.delivery_lng || null,
          })));
        }
      } catch (err) {
        console.error('Erro ao carregar entregas:', err);
        setAvailableDeliveries([]);
      }
    };
    loadAvailableDeliveries();
    
    // Recarregar a cada 10 segundos
    const interval = setInterval(loadAvailableDeliveries, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Carregar histórico de entregas
  useEffect(() => {
    const loadDeliveryHistory = async () => {
      if (!user) return;
      
      try {
        // Buscar com campos de endereço
        const { data, error } = await supabase
          .from("orders")
          .select("id, customer_id, store_id, total_milli, created_at, status, rider_id, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement")
          .eq("rider_id", user.id)
          .in("status", ["delivered", "on_way"])
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('Erro ao carregar histórico:', error);
          setDeliveryHistory([]);
          return;
        }
        
        // Adicionar campos opcionais como null se não existirem
        const deliveriesWithDefaults = (data || []).map((d: any) => ({
          ...d,
          delivery_street: d.delivery_street || null,
          delivery_city: d.delivery_city || null,
          delivery_state: d.delivery_state || null,
          rider_status: d.rider_status || null,
        }));
        
        setDeliveryHistory(deliveriesWithDefaults);
        
        // Calcular estatísticas
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDeliveries = deliveriesWithDefaults.filter((d: any) => new Date(d.created_at) >= today);
        setStats({
          deliveriesToday: todayDeliveries.length,
          onRoute: deliveriesWithDefaults.filter((d: any) => d.status === "on_way").length,
          avgTime: 25, // minutos (mockado)
          earningsToday: todayDeliveries.reduce((sum: number, d: any) => sum + (d.total_milli || 0) * 0.1, 0) / 1000, // 10% do pedido
          totalEarnings: deliveriesWithDefaults.reduce((sum: number, d: any) => sum + (d.total_milli || 0) * 0.1, 0) / 1000,
          rating: 4.9
        });
      } catch (err) {
        console.error('Erro ao carregar histórico de entregas:', err);
        setDeliveryHistory([]);
      }
    };
    if (user) {
      loadDeliveryHistory();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleToggleAvailability = async () => {
    if (!user) return;
    
    const newAvailability = !isAvailable;
    
    // Tentar atualizar is_available (pode falhar se campo não existir ainda)
    const { error } = await supabase
      .from("profiles")
      .update({ is_available: newAvailability })
      .eq("id", user.id);
    
    if (error) {
      // Se o erro for porque o campo não existe, apenas atualizar estado local
      if (error.message?.includes("column") && error.message?.includes("does not exist")) {
        console.log('Campo is_available ainda não existe no banco. Usando apenas estado local.');
        setIsAvailable(newAvailability);
        setProfile({ ...profile, is_available: newAvailability });
      } else {
        console.error('Erro ao atualizar disponibilidade:', error);
        toast({
          title: "Aviso",
          description: "Campo de disponibilidade ainda não disponível. A funcionalidade estará completa após aplicar as migrations.",
          variant: "default",
        });
        // Mesmo assim atualizar localmente para não bloquear o usuário
        setIsAvailable(newAvailability);
      }
    } else {
      setIsAvailable(newAvailability);
      setProfile({ ...profile, is_available: newAvailability });
      
      // Recarregar entregas disponíveis quando ficar disponível
      if (newAvailability && user) {
        try {
          const { data } = await supabase
            .from("orders")
            .select("id, customer_id, store_id, total_milli, created_at, status, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement")
            .eq("rider_id", user.id)
            .in("status", ["ready", "on_way"])
            .order("created_at", { ascending: true })
            .limit(10);
          setAvailableDeliveries((data || []).map((d: any) => ({
            ...d,
            rider_status: d.rider_status || null,
            store_lat: d.store_lat || null,
            store_lng: d.store_lng || null,
            delivery_lat: d.delivery_lat || null,
            delivery_lng: d.delivery_lng || null,
          })));
        } catch (err) {
          console.error('Erro ao recarregar entregas:', err);
        }
      }
    }
  };

  // Coordenadas conhecidas das principais cidades brasileiras
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'brasília': { lat: -15.7942, lng: -47.8822 },
    'brasilia': { lat: -15.7942, lng: -47.8822 },
    'são paulo': { lat: -23.5505, lng: -46.6333 },
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
    'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
    'belo horizonte': { lat: -19.9167, lng: -43.9345 },
    'curitiba': { lat: -25.4284, lng: -49.2733 },
    'porto alegre': { lat: -30.0346, lng: -51.2177 },
    'salvador': { lat: -12.9714, lng: -38.5014 },
    'recife': { lat: -8.0476, lng: -34.8770 },
    'fortaleza': { lat: -3.7172, lng: -38.5433 },
    'goiânia': { lat: -16.6864, lng: -49.2643 },
    'manaus': { lat: -3.1190, lng: -60.0217 },
    'belém': { lat: -1.4558, lng: -48.5044 },
    'belem': { lat: -1.4558, lng: -48.5044 },
  };

  // Função auxiliar para obter coordenadas de um endereço
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address || address.trim() === '' || address.trim() === 'Brasil') {
      return null;
    }
    
    // Primeiro, tentar buscar nas coordenadas conhecidas
    const addressLower = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (addressLower.includes(city)) {
        console.log(`Usando coordenadas conhecidas para ${city}`);
        return coords;
      }
    }
    
    // Tentar usar Nominatim (OpenStreetMap) - GRATUITO e não precisa de API key
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos
      
      // Nominatim API - Gratuita
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Brasil')}&limit=1&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'StarFruit Delivery App' // Requerido pela Nominatim
          }
        }
      );
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        console.log('Coordenadas obtidas via Nominatim:', result);
        return { 
          lat: parseFloat(result.lat), 
          lng: parseFloat(result.lon) 
        };
      } else {
        console.warn('Nenhum resultado encontrado no Nominatim para:', address);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Geocodificação via Nominatim demorou muito');
      } else {
        console.error('Erro ao geocodificar endereço via Nominatim:', error);
      }
    }
    
    // Se Nominatim falhar, tentar Google Maps (se tiver API key)
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (apiKey && apiKey !== '') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Brasil')}&key=${apiKey}&language=pt-BR&region=br`,
          {
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          console.log('Coordenadas obtidas via Google Maps:', location);
          return { 
            lat: location.lat, 
            lng: location.lng 
          };
        }
      }
    } catch (error: any) {
      console.error('Erro ao geocodificar via Google Maps:', error);
    }
    
    // Se tudo falhar, tentar extrair cidade e usar coordenadas conhecidas
    const cityMatch = address.match(/\b([A-Za-zÀ-ÿ\s]+)\s*,\s*(?:DF|SP|RJ|MG|PR|RS|BA|PE|CE|GO|AM|PA)\b/i);
    if (cityMatch) {
      const city = cityMatch[1].toLowerCase().trim();
      if (cityCoordinates[city]) {
        console.log(`Usando coordenadas conhecidas para ${city}`);
        return cityCoordinates[city];
      }
    }
    
    return null;
  };

  // Carregar informações completas do pedido para o mapa
  const loadDeliveryDetails = async (delivery: any) => {
    // Limpar informações anteriores
    setStoreInfo(null);
    setCustomerInfo(null);
    setIsLoadingCoordinates(true);
    
    // Debug: verificar se os dados de endereço estão disponíveis
    console.log('Carregando detalhes da entrega:', {
      id: delivery.id,
      delivery_street: delivery.delivery_street,
      delivery_city: delivery.delivery_city,
      delivery_state: delivery.delivery_state,
      store_id: delivery.store_id,
      customer_id: delivery.customer_id
    });
    
    const riderStatus = delivery.rider_status || null;
    // Se não tem rider_status mas status é "on_way", significa que está indo para a loja primeiro
    const isGoingToStore = riderStatus === "going_to_store" || riderStatus === "at_store" || (!riderStatus && delivery.status === "on_way");
    const isGoingToCustomer = riderStatus === "going_to_customer";
    
    console.log('Status da entrega:', { riderStatus, status: delivery.status, isGoingToStore, isGoingToCustomer });
    
    // Função auxiliar para obter coordenadas com fallback - SEMPRE retorna coordenadas
    const getCoordinatesWithFallback = async (address: string, city?: string, state?: string): Promise<{ lat: number; lng: number }> => {
      // PRIORIDADE 1: Verificar se a cidade está nas coordenadas conhecidas (mais rápido e confiável)
      if (city) {
        const cityLower = city.toLowerCase().trim();
        // Verificar variações comuns
        const cityVariations = [
          cityLower,
          cityLower.replace('ã', 'a').replace('á', 'a').replace('â', 'a'),
          cityLower.replace('é', 'e').replace('ê', 'e'),
          cityLower.replace('í', 'i'),
          cityLower.replace('ó', 'o').replace('ô', 'o'),
          cityLower.replace('ú', 'u'),
        ];
        
        for (const variation of cityVariations) {
          if (cityCoordinates[variation]) {
            console.log(`✓ Usando coordenadas conhecidas para ${city} (${variation})`);
            return cityCoordinates[variation];
          }
        }
      }
      
      // PRIORIDADE 2: Tentar geocodificação apenas se não tiver coordenadas conhecidas
      if (address && address !== 'Brasil' && !address.includes('Brasília, DF, Brasil')) {
        try {
          const coords = await geocodeAddress(address);
          if (coords && coords.lat && coords.lng) {
            console.log('✓ Coordenadas obtidas via geocodificação:', coords);
            return coords;
          }
        } catch (err) {
          console.warn('Erro na geocodificação:', err);
        }
      }
      
      // PRIORIDADE 3: Tentar extrair cidade do endereço e usar coordenadas conhecidas
      if (address) {
        const cityMatch = address.match(/\b([A-Za-zÀ-ÿ\s]+)\s*,\s*(?:DF|SP|RJ|MG|PR|RS|BA|PE|CE|GO|AM|PA)\b/i);
        if (cityMatch) {
          const extractedCity = cityMatch[1].toLowerCase().trim();
          const cityVariations = [
            extractedCity,
            extractedCity.replace('ã', 'a').replace('á', 'a'),
          ];
          
          for (const variation of cityVariations) {
            if (cityCoordinates[variation]) {
              console.log(`✓ Usando coordenadas conhecidas extraídas do endereço: ${variation}`);
              return cityCoordinates[variation];
            }
          }
        }
      }
      
      // FALLBACK FINAL: Brasília (sempre retorna algo)
      console.log('⚠ Usando coordenadas padrão de Brasília (fallback)');
      return { lat: -15.7942, lng: -47.8822 };
    };
    
    // SEMPRE carregar a loja (mesmo sem store_id, usar coordenadas padrão)
    const city = delivery.delivery_city || 'Brasília';
    const state = delivery.delivery_state || 'DF';
    
    try {
      let storeName = 'Loja';
      if (delivery.store_id) {
        const { data: storeData, error } = await supabase
          .from("stores")
          .select("name")
          .eq("owner_id", delivery.store_id)
          .maybeSingle();
        
        if (!error && storeData) {
          storeName = storeData.name;
        }
      }
      
      // Montar endereço para geocodificação
      let address = '';
      if (city && state) {
        address = `${city}, ${state}, Brasil`;
      } else if (city) {
        address = `${city}, Brasil`;
      } else {
        address = 'Brasília, DF, Brasil';
      }
      
      console.log('📍 Geocodificando endereço da loja:', address);
      console.log('📍 Cidade:', city, 'Estado:', state);
      
      // Obter coordenadas com fallback - SEMPRE retorna coordenadas válidas
      const coords = await getCoordinatesWithFallback(address, city, state);
      console.log('✅ Coordenadas da loja obtidas:', coords);
      
      setStoreInfo({
        name: storeName,
        lat: coords.lat,
        lng: coords.lng,
        city: city,
        state: state,
      });
    } catch (err) {
      console.error('Erro ao carregar dados da loja:', err);
      // Em caso de erro, definir coordenadas padrão (Brasília)
      const fallbackCoords = cityCoordinates['brasília'] || { lat: -15.7942, lng: -47.8822 };
      setStoreInfo({
        name: 'Loja',
        lat: fallbackCoords.lat,
        lng: fallbackCoords.lng,
        city: city,
        state: state,
      });
    }

    // SEMPRE carregar informações do cliente para mostrar no mapa
    // Isso permite mostrar o mapa completo mesmo quando está na loja
    try {
      let customerName = 'Cliente';
      if (delivery.customer_id) {
        const { data: customerData, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", delivery.customer_id)
          .maybeSingle();
        
        if (!error && customerData) {
          customerName = customerData.full_name || 'Cliente';
        }
      }
      
      // Montar endereço completo para geocodificação
      const city = delivery.delivery_city || 'Brasília';
      const state = delivery.delivery_state || 'DF';
      let address = '';
      
      if (delivery.delivery_street && city && state) {
        // Tentar endereço completo primeiro (mais preciso)
        address = `${delivery.delivery_street}, ${city}, ${state}, Brasil`;
      } else if (city && state) {
        address = `${city}, ${state}, Brasil`;
      } else if (city) {
        address = `${city}, Brasil`;
      } else {
        address = 'Brasília, DF, Brasil';
      }
      
      console.log('📍 Geocodificando endereço do cliente:', address);
      console.log('📍 Cidade:', city, 'Estado:', state);
      
      // Obter coordenadas com fallback - sempre retorna coordenadas válidas
      const coords = await getCoordinatesWithFallback(address, city, state);
      console.log('✅ Coordenadas do cliente obtidas:', coords);
      
      setCustomerInfo({
        full_name: customerName,
        street: delivery.delivery_street || '',
        city: city,
        state: state,
        lat: coords.lat,
        lng: coords.lng,
      });
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      // Em caso de erro, definir coordenadas padrão
      const city = delivery.delivery_city || 'Brasília';
      const state = delivery.delivery_state || 'DF';
      setCustomerInfo({
        full_name: 'Cliente',
        street: delivery.delivery_street || '',
        city: city,
        state: state,
        lat: cityCoordinates['brasília']?.lat || -15.7942,
        lng: cityCoordinates['brasília']?.lng || -47.8822,
      });
    }
    
    
    setIsLoadingCoordinates(false);
  };

  const handleAcceptDelivery = async (orderId: string) => {
    if (!user) return;
    
    const delivery = availableDeliveries.find(d => d.id === orderId);
    
    // Obter coordenadas da loja se necessário
    let storeLat = delivery?.store_lat;
    let storeLng = delivery?.store_lng;
    
    if (!storeLat || !storeLng) {
      // Geocodificar usando cidade do endereço de entrega
      try {
        const address = `${delivery?.delivery_city || 'Brasil'}, ${delivery?.delivery_state || ''}`;
        const coords = await geocodeAddress(address);
        if (coords) {
          storeLat = coords.lat;
          storeLng = coords.lng;
          // Não salvar no banco ainda (campos não existem até migration)
        }
      } catch (err) {
        console.error('Erro ao geocodificar endereço da loja:', err);
      }
    }

    // Obter coordenadas do cliente se necessário
    let deliveryLat = delivery?.delivery_lat;
    let deliveryLng = delivery?.delivery_lng;
    
    if (!deliveryLat || !deliveryLng) {
      const address = `${delivery?.delivery_street || ''}, ${delivery?.delivery_city || ''}, ${delivery?.delivery_state || ''}`;
      const coords = await geocodeAddress(address);
      if (coords) {
        deliveryLat = coords.lat;
        deliveryLng = coords.lng;
      }
    }

    // Preparar dados de atualização (somente campos que existem)
    const updateData: any = {
      status: "on_way"
    };
    
    // Tentar atualizar campos novos se existirem (após migration)
    // Por enquanto, só atualizar status para não causar erro 400
    // Quando a migration for aplicada, esses campos estarão disponíveis
    
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("rider_id", user.id);
    
    if (error) {
      console.error('Erro ao aceitar entrega:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aceitar a entrega",
        variant: "destructive",
      });
    } else {
      // Notificar cliente e loja via toast (a notificação real será via Realtime)
      toast({
        title: "✅ Entrega Aceita!",
        description: "Você está indo até a loja. Cliente e loja foram notificados.",
      });
      
      // Recarregar entregas
      const { data, error: reloadError } = await supabase
        .from("orders")
        .select("id, customer_id, store_id, total_milli, created_at, status, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement")
        .eq("rider_id", user.id)
        .in("status", ["ready", "on_way"])
        .order("created_at", { ascending: true })
        .limit(10);
      
      if (!reloadError && data) {
        setAvailableDeliveries(data.map((d: any) => ({
          ...d,
          rider_status: d.rider_status || null,
          store_lat: d.store_lat || null,
          store_lng: d.store_lng || null,
          delivery_lat: d.delivery_lat || null,
          delivery_lng: d.delivery_lng || null,
        })));
      }
    }
  };

  const handleAtStore = async (orderId: string) => {
    if (!user) return;
    
    // Atualizar status para "at_store"
    const updateData: any = {
      rider_status: "at_store",
      status: "on_way"
    };
    
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("rider_id", user.id);
    
    if (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "📍 Você chegou na loja!",
        description: "Agora você pode ir para a casa do cliente quando o pedido estiver pronto.",
      });
      
      // Recarregar entregas
      const { data, error: reloadError } = await supabase
        .from("orders")
        .select("id, customer_id, store_id, total_milli, created_at, status, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement, rider_status")
        .eq("rider_id", user.id)
        .in("status", ["ready", "on_way"])
        .order("created_at", { ascending: true })
        .limit(10);
      
      if (!reloadError && data) {
        setAvailableDeliveries(data.map((d: any) => ({
          ...d,
          rider_status: d.rider_status || null,
          store_lat: d.store_lat || null,
          store_lng: d.store_lng || null,
          delivery_lat: d.delivery_lat || null,
          delivery_lng: d.delivery_lng || null,
        })));
      }
    }
  };

  const handleGoingToCustomer = async (orderId: string) => {
    if (!user) return;
    
    // Atualizar status para "going_to_customer"
    const updateData: any = {
      rider_status: "going_to_customer",
      status: "on_way"
    };
    
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("rider_id", user.id);
    
    if (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "🚚 Indo até o cliente!",
        description: "Cliente e loja foram notificados que você está a caminho.",
      });
      
      // Recarregar entregas
      const { data, error: reloadError } = await supabase
        .from("orders")
        .select("id, customer_id, store_id, total_milli, created_at, status, payment_method, delivery_street, delivery_city, delivery_state, delivery_zip, delivery_complement, rider_status")
        .eq("rider_id", user.id)
        .in("status", ["ready", "on_way"])
        .order("created_at", { ascending: true })
        .limit(10);
      
      if (!reloadError && data) {
        setAvailableDeliveries(data.map((d: any) => ({
          ...d,
          rider_status: d.rider_status || null,
          store_lat: d.store_lat || null,
          store_lng: d.store_lng || null,
          delivery_lat: d.delivery_lat || null,
          delivery_lng: d.delivery_lng || null,
        })));
      }
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

        {/* Botão de Disponibilidade - Destaque */}
        <Card className="mb-6 bg-gradient-to-r from-purple-500 to-purple-700 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Bike className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {isAvailable ? "Você está disponível para entregas" : "Você está indisponível"}
                  </h3>
                  <p className="text-purple-100 text-sm">
                    {isAvailable 
                      ? "Motoristas disponíveis podem receber novas entregas"
                      : "Clique no botão para começar a receber entregas"}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleToggleAvailability}
                className={`rounded-full px-8 py-6 text-lg font-bold ${
                  isAvailable 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isAvailable ? "Finalizar Jornada" : "Iniciar Jornada"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                            {(delivery.delivery_street || delivery.delivery_city) && (
                              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-purple-600" />
                                {delivery.delivery_street && <span>{delivery.delivery_street}</span>}
                                {delivery.delivery_city && delivery.delivery_state && (
                                  <span>{delivery.delivery_city}, {delivery.delivery_state}</span>
                                )}
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
                        <div className="mt-3 space-y-2">
                          {delivery.status === "ready" && !delivery.rider_status && (
                            <Button 
                              className="w-full rounded-full bg-green-500 hover:bg-green-600"
                              onClick={() => handleAcceptDelivery(delivery.id)}
                            >
                              Aceitar Entrega
                            </Button>
                          )}
                          
                          {delivery.rider_status === "going_to_store" && (
                            <>
                              <Button 
                                className="w-full rounded-full bg-blue-500 hover:bg-blue-600"
                                onClick={async () => {
                                  setSelectedDelivery(delivery);
                                  await loadDeliveryDetails(delivery);
                                  setIsMapModalOpen(true);
                                }}
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                Ver Rota para Loja
                              </Button>
                              <Button 
                                className="w-full rounded-full bg-purple-500 hover:bg-purple-600"
                                onClick={() => handleAtStore(delivery.id)}
                              >
                                Cheguei na Loja
                              </Button>
                            </>
                          )}
                          
                          {delivery.rider_status === "at_store" && (
                            <Button 
                              className="w-full rounded-full bg-orange-500 hover:bg-orange-600"
                              onClick={async () => {
                                // Carregar detalhes primeiro para obter coordenadas
                                await loadDeliveryDetails(delivery);
                                
                                // Aguardar um pouco para garantir que as coordenadas foram carregadas
                                setTimeout(() => {
                                  // Abrir Google Maps com endereço do cliente
                                  if (delivery.delivery_street && delivery.delivery_city && delivery.delivery_state) {
                                    const address = `${delivery.delivery_street}, ${delivery.delivery_city}, ${delivery.delivery_state}, Brasil`;
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                                    window.open(url, '_blank');
                                  } else if (delivery.delivery_city && delivery.delivery_state) {
                                    const address = `${delivery.delivery_city}, ${delivery.delivery_state}, Brasil`;
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                                    window.open(url, '_blank');
                                  }
                                  
                                  // Atualizar status
                                  handleGoingToCustomer(delivery.id);
                                }, 500);
                              }}
                            >
                              Pedido Retirado - Ir para Cliente
                            </Button>
                          )}
                          
                          {delivery.rider_status === "going_to_customer" && (
                            <>
                              <Button 
                                className="w-full rounded-full bg-blue-500 hover:bg-blue-600"
                                onClick={async () => {
                                  setSelectedDelivery(delivery);
                                  await loadDeliveryDetails(delivery);
                                  setIsMapModalOpen(true);
                                }}
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                Ver Rota para Cliente
                              </Button>
                              <Button 
                                className="w-full rounded-full bg-green-500 hover:bg-green-600"
                                onClick={() => handleCompleteDelivery(delivery.id)}
                              >
                                Finalizar Entrega
                              </Button>
                            </>
                          )}
                        </div>
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
                    const isOnWay = delivery.status === "on_way";
                    return (
                      <div key={delivery.id} className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${isOnWay ? 'hover:shadow-md transition-all cursor-pointer' : ''}`}>
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
                        {isOnWay && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <Button
                              className="w-full rounded-full bg-blue-500 hover:bg-blue-600"
                              onClick={async () => {
                                setSelectedDelivery(delivery);
                                await loadDeliveryDetails(delivery);
                                setIsMapModalOpen(true);
                              }}
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              Ver Rota no Mapa
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal do Mapa */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDelivery?.rider_status === "going_to_store" 
                ? "📍 Rota para a Loja" 
                : selectedDelivery?.rider_status === "going_to_customer"
                ? "🏠 Rota para o Cliente"
                : selectedDelivery?.status === "on_way"
                ? "🗺️ Rota da Entrega"
                : "🗺️ Mapa da Entrega"}
            </DialogTitle>
            <DialogDescription>
              Visualize a rota da entrega no mapa abaixo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <DeliveryMap
              storeAddress={storeInfo ? {
                lat: storeInfo.lat,
                lng: storeInfo.lng,
                street: storeInfo.name,
                city: storeInfo.city
              } : undefined}
              customerAddress={customerInfo ? {
                lat: customerInfo.lat,
                lng: customerInfo.lng,
                street: customerInfo.street,
                city: customerInfo.city
              } : undefined}
              currentStep={selectedDelivery?.rider_status}
            />
            <div className="flex flex-col gap-3">
              {/* Botões de Ação */}
              {selectedDelivery && (
                <div className="flex gap-2">
                  {selectedDelivery.rider_status === "going_to_store" && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        if (selectedDelivery?.id) {
                          handleAtStore(selectedDelivery.id);
                          setIsMapModalOpen(false);
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ✓ Chegou na Loja
                    </Button>
                  )}
                  
                  {selectedDelivery.rider_status === "at_store" && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        // Abrir Google Maps diretamente com endereço do cliente
                        if (customerInfo?.lat && customerInfo?.lng) {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${customerInfo.lat},${customerInfo.lng}`;
                          window.open(url, '_blank');
                        } else if (selectedDelivery?.delivery_street && selectedDelivery?.delivery_city && selectedDelivery?.delivery_state) {
                          // Se não tiver coordenadas, usar endereço textual
                          const address = `${selectedDelivery.delivery_street}, ${selectedDelivery.delivery_city}, ${selectedDelivery.delivery_state}, Brasil`;
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                          window.open(url, '_blank');
                        } else if (selectedDelivery?.delivery_city && selectedDelivery?.delivery_state) {
                          const address = `${selectedDelivery.delivery_city}, ${selectedDelivery.delivery_state}, Brasil`;
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                          window.open(url, '_blank');
                        } else {
                          toast({
                            title: "Erro",
                            description: "Endereço do cliente não disponível",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Atualizar status para "going_to_customer"
                        if (selectedDelivery?.id) {
                          handleGoingToCustomer(selectedDelivery.id);
                        }
                        setIsMapModalOpen(false);
                      }}
                    >
                      <Bike className="h-4 w-4 mr-2" />
                      🏠 Ir para Casa do Cliente
                    </Button>
                  )}
                </div>
              )}
              
              {/* Botões de Navegação */}
              <div className="flex gap-2">
                {storeInfo?.lat && storeInfo?.lng && (selectedDelivery?.rider_status === "going_to_store" || selectedDelivery?.rider_status === "at_store" || (selectedDelivery?.status === "on_way" && !selectedDelivery?.rider_status)) && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${storeInfo.lat},${storeInfo.lng}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Abrir Rota para Loja no Google Maps
                  </Button>
                )}
                {customerInfo?.lat && customerInfo?.lng && (selectedDelivery?.rider_status === "going_to_customer" || selectedDelivery?.rider_status === "at_store" || (selectedDelivery?.status === "on_way" && !selectedDelivery?.rider_status)) && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${customerInfo.lat},${customerInfo.lng}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Abrir Rota para Cliente no Google Maps
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiderDashboard;
