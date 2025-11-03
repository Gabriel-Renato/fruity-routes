import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const DeliveryMap = ({ storeAddress, customerAddress, currentStep }: DeliveryMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
      if (storeAddress?.lat && storeAddress?.lng) {
        const storeMarker = L.marker([storeAddress.lat, storeAddress.lng], { icon: defaultIcon })
          .addTo(map)
          .bindPopup(`<b>🏪 Loja</b><br>${storeAddress.street || storeAddress.city || "Endereço da loja"}`);
        
        if (currentStep === "going_to_store" || currentStep === "at_store") {
          storeMarker.openPopup();
        }
      }

      if (customerAddress?.lat && customerAddress?.lng) {
        const customerIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          className: "customer-marker"
        });

        const customerMarker = L.marker([customerAddress.lat, customerAddress.lng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`<b>🏠 Cliente</b><br>${customerAddress.street || customerAddress.city || "Endereço do cliente"}`);
        
        if (currentStep === "going_to_customer") {
          customerMarker.openPopup();
        }
      }

      // Ajustar visualização para incluir ambos os marcadores
      if (storeAddress?.lat && customerAddress?.lat && storeAddress?.lng && customerAddress?.lng) {
        const group = new L.FeatureGroup([
          L.marker([storeAddress.lat, storeAddress.lng]),
          L.marker([customerAddress.lat, customerAddress.lng]),
        ]);
        map.fitBounds(group.getBounds().pad(0.1));
      }

      // Invalidar tamanho do mapa após renderização
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [storeAddress, customerAddress, currentStep]);

  // Se não houver coordenadas, mostrar mensagem
  if (!storeAddress?.lat && !customerAddress?.lat) {
    return (
      <div className="w-full h-64 rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Carregando coordenadas...</p>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-96 rounded-lg" style={{ zIndex: 0, minHeight: '400px' }} />;
};

export default DeliveryMap;

