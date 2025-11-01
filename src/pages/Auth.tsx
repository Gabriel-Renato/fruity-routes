import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User, Store, Bike, MapPin, Search, Navigation } from "lucide-react";

type UserType = "customer" | "store" | "rider";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userType, setUserType] = useState<UserType>("customer");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [usingLocation, setUsingLocation] = useState(false);

  // Dados básicos
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Endereço
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [addressLabel, setAddressLabel] = useState("");

  // Campos específicos para motoqueiro
  const [phone, setPhone] = useState("");
  const [cnhNumber, setCnhNumber] = useState("");
  const [cnhCategory, setCnhCategory] = useState("");
  const [cnhExpiry, setCnhExpiry] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  // Buscar endereço pelo CEP usando ViaCEP
  const handleSearchCep = async () => {
    const cepClean = zip.replace(/\D/g, "");
    if (cepClean.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Digite um CEP com 8 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado",
          variant: "destructive",
        });
        return;
      }

      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
      setComplement(data.complemento || "");

      toast({
        title: "Endereço encontrado!",
        description: "Complete os campos restantes",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente ou preencha manualmente",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  // Usar geolocalização do navegador
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
      return;
    }

    setUsingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Usar Nominatim (OpenStreetMap) para reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR`
          );
          const data = await response.json();

          if (data.address) {
            setCity(data.address.city || data.address.town || data.address.village || "");
            setState(data.address.state?.substring(0, 2) || "");
            
            if (data.address.road) {
              setStreet(data.address.road);
            }
            if (data.address.postcode) {
              setZip(data.address.postcode.replace(/\D/g, "").substring(0, 8));
            }

            toast({
              title: "Localização encontrada!",
              description: "Complete os campos de endereço",
            });
          }
        } catch (error) {
          toast({
            title: "Erro ao obter localização",
            description: "Preencha o endereço manualmente",
            variant: "destructive",
          });
        } finally {
          setUsingLocation(false);
        }
      },
      (error) => {
        toast({
          title: "Erro ao acessar localização",
          description: "Permita o acesso à localização ou preencha manualmente",
          variant: "destructive",
        });
        setUsingLocation(false);
      }
    );
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta ao StarFruit 🍊",
        });

        const dashboardRoutes = {
          customer: "/dashboard/customer",
          store: "/dashboard/store",
          rider: "/dashboard/rider",
        };
        navigate(dashboardRoutes[userType]);
      } else {
        // Criar usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: (import.meta.env.VITE_SITE_URL as string) || `${window.location.origin}/`,
            data: {
              name,
              user_type: userType,
              ...(city && state ? { city, state } : {}),
            },
          },
        });

        if (authError) throw authError;

        // Se o usuário foi criado e tem endereço, salvar na tabela addresses
        if (authData.user && (street || city || zip)) {
          // Montar rua completa com número se existir
          let fullStreet = street || "";
          if (number) {
            fullStreet = fullStreet ? `${fullStreet}, ${number}` : `Nº ${number}`;
          }
          if (complement) {
            fullStreet = fullStreet ? `${fullStreet} - ${complement}` : complement;
          }

          const addressData: any = {
            user_id: authData.user.id,
            label: addressLabel || "Principal",
            street: fullStreet || null,
            city: city || null,
            state: state || null,
            zip: zip || null,
          };

          // Adicionar bairro na label se existir
          if (neighborhood) {
            addressData.label = `${addressData.label} - ${neighborhood}`;
          }

          await supabase.from("addresses").insert(addressData);
        }

        // Se for motoqueiro, atualizar perfil com dados de CNH e veículo
        if (authData.user && userType === "rider" && (cnhNumber || phone || vehiclePlate)) {
          const riderData: any = {};
          if (cnhNumber) riderData.cnh_number = cnhNumber;
          if (cnhCategory) riderData.cnh_category = cnhCategory;
          if (cnhExpiry) riderData.cnh_expiry = cnhExpiry;
          if (vehicleType) riderData.vehicle_type = vehicleType;
          if (vehiclePlate) riderData.vehicle_plate = vehiclePlate;
          if (phone) riderData.phone = phone;

          if (Object.keys(riderData).length > 0) {
            await supabase
              .from("profiles")
              .update(riderData)
              .eq("id", authData.user.id);
          }
        }

        toast({
          title: "Cadastro realizado!",
          description: "Sua conta foi criada com sucesso 🎉",
        });

        const dashboardRoutes = {
          customer: "/dashboard/customer",
          store: "/dashboard/store",
          rider: "/dashboard/rider",
        };
        navigate(dashboardRoutes[userType]);
      }
    } catch (error: any) {
      console.error("Erro de autenticação:", error);
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format CEP input
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 8);
    setZip(value);
    
    // Auto-buscar quando CEP completo
    if (value.length === 8) {
      setTimeout(() => handleSearchCep(), 500);
    }
  };

  const userTypes = [
    {
      type: "customer" as UserType,
      icon: User,
      title: "Cliente",
      description: "Peça frutas frescas",
      gradient: "from-primary to-accent",
    },
    {
      type: "store" as UserType,
      icon: Store,
      title: "Loja",
      description: "Venda seus produtos",
      gradient: "from-secondary to-accent",
    },
    {
      type: "rider" as UserType,
      icon: Bike,
      title: "Motoqueiro",
      description: "Faça entregas",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            StarFruit
          </h1>
          <p className="text-muted-foreground text-lg">
            Delivery de frutas e produtos naturais 🍊🍉🍍
          </p>
        </div>

        {/* Mostrar cards de seleção apenas para cadastro */}
        {!isLogin && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {userTypes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => setUserType(item.type)}
                  className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                    userType === item.type
                      ? "border-primary shadow-[var(--shadow-primary)]"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>
        )}

        <Card className="shadow-[var(--shadow-primary)]">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isLogin ? "Entrar" : "Criar conta"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Entre com suas credenciais"
                : "Preencha os dados para criar sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>

                  {/* Seção de Endereço */}
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseLocation}
                        disabled={usingLocation}
                        className="text-xs"
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        {usingLocation ? "Buscando..." : "Usar minha localização"}
                      </Button>
                    </div>

                    {/* CEP */}
                    <div className="space-y-2">
                      <Label htmlFor="zip">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="zip"
                          type="text"
                          placeholder="00000-000"
                          value={zip}
                          onChange={handleZipChange}
                          maxLength={9}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSearchCep}
                          disabled={loadingCep || zip.length !== 8}
                          size="icon"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      {loadingCep && (
                        <p className="text-xs text-muted-foreground">Buscando endereço...</p>
                      )}
                    </div>

                    {/* Rua e Número */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input
                          id="street"
                          type="text"
                          placeholder="Rua, Avenida, etc."
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          type="text"
                          placeholder="123"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento (opcional)</Label>
                        <Input
                          id="complement"
                          type="text"
                          placeholder="Apto, Bloco, etc."
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          type="text"
                          placeholder="Centro"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Cidade e Estado */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="São Paulo"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado (UF)</Label>
                        <Input
                          id="state"
                          type="text"
                          placeholder="SP"
                          value={state}
                          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                          maxLength={2}
                          required
                        />
                      </div>
                    </div>

                    {/* Label do endereço (opcional) */}
                    <div className="space-y-2">
                      <Label htmlFor="addressLabel">Nome do endereço (opcional)</Label>
                      <Input
                        id="addressLabel"
                        type="text"
                        placeholder="Casa, Trabalho, etc."
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Seção específica para Motoqueiro */}
                  {userType === "rider" && (
                    <div className="pt-4 border-t space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Bike className="h-4 w-4" />
                        Informações do Motoqueiro
                      </Label>

                      {/* Telefone */}
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone / WhatsApp</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 98765-4321"
                          value={phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const formatted = value
                              .replace(/^(\d{2})(\d)/, "($1) $2")
                              .replace(/(\d{5})(\d{4})$/, "$1-$2");
                            setPhone(formatted);
                          }}
                          required={userType === "rider"}
                          maxLength={15}
                        />
                      </div>

                      {/* CNH */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="cnhNumber">Número da CNH</Label>
                          <Input
                            id="cnhNumber"
                            type="text"
                            placeholder="12345678901"
                            value={cnhNumber}
                            onChange={(e) => setCnhNumber(e.target.value.replace(/\D/g, "").substring(0, 11))}
                            required={userType === "rider"}
                            maxLength={11}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cnhCategory">Categoria da CNH</Label>
                          <Select value={cnhCategory} onValueChange={setCnhCategory}>
                            <SelectTrigger id="cnhCategory">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">Categoria A (Moto)</SelectItem>
                              <SelectItem value="AB">Categoria AB (Moto + Carro)</SelectItem>
                              <SelectItem value="AC">Categoria AC (Moto + Caminhão)</SelectItem>
                              <SelectItem value="AD">Categoria AD (Moto + Misto)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Validade CNH */}
                      <div className="space-y-2">
                        <Label htmlFor="cnhExpiry">Validade da CNH</Label>
                        <Input
                          id="cnhExpiry"
                          type="date"
                          value={cnhExpiry}
                          onChange={(e) => setCnhExpiry(e.target.value)}
                          required={userType === "rider"}
                        />
                      </div>

                      {/* Veículo */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                          <Select value={vehicleType} onValueChange={setVehicleType}>
                            <SelectTrigger id="vehicleType">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="moto">Moto</SelectItem>
                              <SelectItem value="bicicleta">Bicicleta</SelectItem>
                              <SelectItem value="scooter">Scooter Elétrico</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehiclePlate">Placa do Veículo</Label>
                          <Input
                            id="vehiclePlate"
                            type="text"
                            placeholder="ABC1D23 ou ABC1234"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 7))}
                            required={userType === "rider"}
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Dropdown de tipo de usuário apenas para login */}
              {isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="userType">Tipo de conta</Label>
                  <Select value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                    <SelectTrigger id="userType">
                      <SelectValue>
                        {userType === "customer" && "👤 Cliente"}
                        {userType === "store" && "🏪 Loja"}
                        {userType === "rider" && "🏍️ Motoqueiro"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Cliente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="store">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          <span>Loja</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="rider">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          <span>Motoqueiro</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
