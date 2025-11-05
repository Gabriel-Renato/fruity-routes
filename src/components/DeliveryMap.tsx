import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface DeliveryMapProps {
  storeAddress?: { lat?: number; lng?: number; street?: string; city?: string };
  customerAddress?: { lat?: number; lng?: number; street?: string; city?: string };
  currentStep?: "going_to_store" | "at_store" | "going_to_customer";
}

// Configurar ícones padrão do Leaflet
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Ícone para loja
const storeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Ícone para cliente
const customerIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DeliveryMap = ({ storeAddress, customerAddress, currentStep }: DeliveryMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  useEffect(() => {
    // Aguardar um pouco para garantir que o container está pronto (especialmente em modais)
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Limpar mapa anterior se existir
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Calcular centro do mapa
      let centerLat = -23.5505; // São Paulo default
      let centerLng = -46.6333;
      let zoom = 13;

      if (storeAddress?.lat && storeAddress?.lng) {
        centerLat = storeAddress.lat;
        centerLng = storeAddress.lng;
      } else if (customerAddress?.lat && customerAddress?.lng) {
        centerLat = customerAddress.lat;
        centerLng = customerAddress.lng;
      }

      // Criar mapa
      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);
      mapRef.current = map;

      // Adicionar camada de tiles (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Adicionar marcadores
      const markers: L.Marker[] = [];
      
      if (storeAddress?.lat && storeAddress?.lng) {
        const storeMarker = L.marker([storeAddress.lat, storeAddress.lng], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`<b>🏪 Loja</b><br>${storeAddress.street || storeAddress.city || "Endereço da loja"}`);
        markers.push(storeMarker);
        
        if (currentStep === "going_to_store" || currentStep === "at_store") {
          storeMarker.openPopup();
        }
      }

      if (customerAddress?.lat && customerAddress?.lng) {
        const customerMarker = L.marker([customerAddress.lat, customerAddress.lng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`<b>🏠 Cliente</b><br>${customerAddress.street || customerAddress.city || "Endereço do cliente"}`);
        markers.push(customerMarker);
        
        if (currentStep === "going_to_customer") {
          customerMarker.openPopup();
        }
      }

      // Desenhar rota se tiver ambos os endereços
      if (storeAddress?.lat && storeAddress?.lng && customerAddress?.lat && customerAddress?.lng) {
        // Remover rota anterior se existir
        if (routeLayerRef.current) {
          map.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }

        // Determinar origem e destino baseado no currentStep
        let origin: [number, number];
        let destination: [number, number];

        if (currentStep === "going_to_store") {
          // Se está indo para a loja, origem pode ser a posição atual do motorista (vamos usar o cliente como referência)
          // Na prática, você pode usar a localização GPS real do motorista
          origin = [customerAddress.lat, customerAddress.lng];
          destination = [storeAddress.lat, storeAddress.lng];
        } else {
          // Indo para o cliente ou qualquer outro caso
          origin = [storeAddress.lat, storeAddress.lng];
          destination = [customerAddress.lat, customerAddress.lng];
        }

        // Buscar rota usando OSRM (Open Source Routing Machine) - Gratuito
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
        
        fetch(osrmUrl)
          .then(response => response.json())
          .then(data => {
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const geometry = route.geometry;
              
              // Criar camada de rota
              const routeGeoJson = {
                type: 'Feature',
                geometry: geometry,
                properties: {}
              };

              routeLayerRef.current = L.geoJSON(routeGeoJson as any, {
                style: {
                  color: '#3b82f6',
                  weight: 5,
                  opacity: 0.7
                }
              }).addTo(map);

              // Calcular distância e duração
              const distance = (route.distance / 1000).toFixed(1); // em km
              const duration = Math.round(route.duration / 60); // em minutos
              setRouteInfo({
                distance: `${distance} km`,
                duration: `${duration} min`
              });

              // Ajustar visualização para incluir a rota
              const bounds = L.geoJSON(routeGeoJson as any).getBounds();
              map.fitBounds(bounds.pad(0.15));
            } else {
              // Se OSRM falhar, apenas ajustar para os marcadores
              const group = new L.FeatureGroup(markers);
              map.fitBounds(group.getBounds().pad(0.1));
            }
          })
          .catch(error => {
            console.warn('Erro ao buscar rota do OSRM:', error);
            // Em caso de erro, apenas ajustar para os marcadores
            const group = new L.FeatureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
          });
      } else {
        // Se não tiver ambos, apenas ajustar para os marcadores disponíveis
        if (markers.length > 0) {
          const group = new L.FeatureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }

      // Invalidar tamanho do mapa após renderização
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (routeLayerRef.current) {
        routeLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [storeAddress, customerAddress, currentStep]);

  // Se não houver coordenadas, mostrar mensagem ou mapa padrão
  // Mas mostrar o mapa se tiver pelo menos uma coordenada (loja ou cliente)
  // Aguardar um pouco antes de mostrar mensagem de erro
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    // Se tiver pelo menos uma coordenada, não mostrar loading
    if (storeAddress?.lat || customerAddress?.lat) {
      setShowLoading(false);
    } else {
      // Aguardar 3 segundos antes de mostrar mensagem de erro
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [storeAddress, customerAddress]);
  
  if (!storeAddress?.lat && !customerAddress?.lat && showLoading) {
    return (
      <div className="w-full h-96 rounded-lg bg-gray-100 flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-500">Carregando coordenadas...</p>
        <p className="text-sm text-gray-400 mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }
  
  if (!storeAddress?.lat && !customerAddress?.lat) {
    return (
      <div className="w-full h-96 rounded-lg bg-gray-100 flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
        <MapPin className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">Coordenadas não disponíveis</p>
        <p className="text-sm text-gray-400 mt-2">Não foi possível carregar a localização</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {routeInfo && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              <span className="font-semibold">Distância:</span> {routeInfo.distance}
            </span>
            <span className="text-gray-700">
              <span className="font-semibold">Tempo estimado:</span> {routeInfo.duration}
            </span>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-96 rounded-lg" style={{ zIndex: 0, minHeight: '400px' }} />
    </div>
  );
};

export default DeliveryMap;

