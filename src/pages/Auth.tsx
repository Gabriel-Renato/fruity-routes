import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User, Store, Bike } from "lucide-react";

type UserType = "customer" | "store" | "rider";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userType, setUserType] = useState<UserType>("customer");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

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
          description: "Bem-vindo de volta ao StarFruitC 🍊",
        });

        // Redirect based on user type
        const dashboardRoutes = {
          customer: "/dashboard/customer",
          store: "/dashboard/store",
          rider: "/dashboard/rider",
        };
        navigate(dashboardRoutes[userType]);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
              user_type: userType,
            },
          },
        });

        if (error) throw error;

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
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            StarFruitC
          </h1>
          <p className="text-muted-foreground text-lg">
            Delivery de frutas e produtos naturais 🍊🍉🍍
          </p>
        </div>

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

        <Card className="max-w-md mx-auto shadow-[var(--shadow-primary)]">
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
