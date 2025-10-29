import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, MapPin, Clock, User } from "lucide-react";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            StarFruitC
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Olá, Cliente! 🍊</h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de pedidos
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
      </main>
    </div>
  );
};

export default CustomerDashboard;
