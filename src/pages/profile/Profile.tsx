import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { User, MapPin, Lock, Save, ArrowLeft, Phone, CarFront, Navigation } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [usingLocation, setUsingLocation] = useState(false);

  // Estados dos campos editáveis
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");

  // Estados para mudança de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Campos específicos para motoqueiros
  const [cnhNumber, setCnhNumber] = useState("");
  const [cnhCategory, setCnhCategory] = useState("");
  const [cnhExpiry, setCnhExpiry] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        navigate("/auth");
        return;
      }

      setUser(u);
      setEmail(u.email || "");
      
      const typeFromMeta = (u.user_metadata as any)?.user_type as string | undefined;
      const effectiveType = typeFromMeta || "customer";
      setUserType(effectiveType);

      // Carregar dados do perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
        setCity(profileData.city || "");
        setState(profileData.state || "");
        setCnhNumber(profileData.cnh_number || "");
        setCnhCategory(profileData.cnh_category || "");
        setCnhExpiry(profileData.cnh_expiry || "");
        setVehicleType(profileData.vehicle_type || "");
        setVehiclePlate(profileData.vehicle_plate || "");
      }
    };

    loadProfile();
  }, [navigate]);

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

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Atualizar perfil básico
      const profileUpdate: any = {
        full_name: fullName,
        phone: phone,
        city: city,
        state: state.toUpperCase().slice(0, 2),
      };

      // Adicionar campos de motoqueiro se aplicável
      if (userType === "rider") {
        profileUpdate.cnh_number = cnhNumber;
        profileUpdate.cnh_category = cnhCategory;
        profileUpdate.cnh_expiry = cnhExpiry;
        profileUpdate.vehicle_type = vehicleType;
        profileUpdate.vehicle_plate = vehiclePlate;
      }

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso",
      });

      // Redirecionar de volta para o dashboard apropriado
      const dashboardRoutes: Record<string, string> = {
        customer: "/dashboard/customer",
        store: "/dashboard/store",
        rider: "/dashboard/rider",
      };
      setTimeout(() => {
        navigate(dashboardRoutes[userType || "customer"]);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoadingPassword(true);
    try {
      // Verificar senha atual
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (error) {
        toast({
          title: "Senha atual incorreta",
          description: "A senha atual está errada",
          variant: "destructive",
        });
        return;
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso",
      });

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const goBack = () => {
    const dashboardRoutes: Record<string, string> = {
      customer: "/dashboard/customer",
      store: "/dashboard/store",
      rider: "/dashboard/rider",
    };
    navigate(dashboardRoutes[userType || "customer"]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="text-gray-600">Gerencie suas informações pessoais</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>Seus dados básicos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    const formatted = value
                      .replace(/^(\d{2})(\d)/, "($1) $2")
                      .replace(/(\d{5})(\d{4})$/, "$1-$2");
                    setPhone(formatted);
                  }}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Localização</CardTitle>
                  <CardDescription>Sua cidade e estado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Localização</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseLocation}
                  disabled={usingLocation}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {usingLocation ? "Buscando..." : "Usar minha localização"}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Motoqueiro */}
          {userType === "rider" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <CarFront className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Informações do Motoqueiro</CardTitle>
                    <CardDescription>CNH e veículo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="cnhNumber">Número da CNH</Label>
                    <Input
                      id="cnhNumber"
                      value={cnhNumber}
                      onChange={(e) => setCnhNumber(e.target.value.replace(/\D/g, "").substring(0, 11))}
                      placeholder="12345678901"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnhCategory">Categoria da CNH</Label>
                    <Input
                      id="cnhCategory"
                      value={cnhCategory}
                      onChange={(e) => setCnhCategory(e.target.value.toUpperCase())}
                      placeholder="A"
                      maxLength={3}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnhExpiry">Validade da CNH</Label>
                  <Input
                    id="cnhExpiry"
                    type="date"
                    value={cnhExpiry}
                    onChange={(e) => setCnhExpiry(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                    <Input
                      id="vehicleType"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      placeholder="Moto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlate">Placa do Veículo</Label>
                    <Input
                      id="vehiclePlate"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 7))}
                      placeholder="ABC1D23"
                      maxLength={7}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mudança de Senha */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Mudar Senha</CardTitle>
                  <CardDescription>Atualize sua senha de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={loadingPassword || !currentPassword || !newPassword || !confirmPassword}
                variant="outline"
                className="w-full"
              >
                {loadingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <Button
            onClick={handleSaveProfile}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 h-12 text-lg"
          >
            {loading ? (
              "Salvando..."
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

