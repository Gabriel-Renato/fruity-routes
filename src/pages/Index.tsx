import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Store, Bike, Leaf, Clock, Shield } from "lucide-react";
import heroImage from "@/assets/hero-fruits.jpg";
import customerIcon from "@/assets/customer-icon.png";
import storeIcon from "@/assets/store-icon.png";
import deliveryIcon from "@/assets/delivery-icon.png";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Leaf,
      title: "Produtos Frescos",
      description: "Frutas e verduras selecionadas diariamente",
    },
    {
      icon: Clock,
      title: "Entrega Rápida",
      description: "Receba em casa em até 60 minutos",
    },
    {
      icon: Shield,
      title: "Compra Segura",
      description: "Pagamento protegido e garantia de qualidade",
    },
  ];

  const userTypes = [
    {
      icon: customerIcon,
      title: "Sou Cliente",
      description: "Peça frutas frescas e receba em casa",
      gradient: "from-primary to-accent",
      route: "/auth",
    },
    {
      icon: storeIcon,
      title: "Tenho uma Loja",
      description: "Venda seus produtos naturais",
      gradient: "from-secondary to-accent",
      route: "/auth",
    },
    {
      icon: deliveryIcon,
      title: "Quero Entregar",
      description: "Ganhe dinheiro fazendo entregas",
      gradient: "from-accent to-primary",
      route: "/auth",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted to-background" />
        
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16 animate-float">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              StarFruitC
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 mb-8">
              Delivery de frutas, verduras e produtos naturais 🍊🍉🍍
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Frescor tropical entregue na sua porta
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-white px-8 py-6 text-lg shadow-[var(--shadow-primary)]"
            >
              Começar Agora
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className="backdrop-blur-sm bg-card/90 border-2 border-border hover:border-primary transition-all hover:shadow-[var(--shadow-primary)] hover:-translate-y-1"
                >
                  <CardContent className="pt-6">
                    <Icon className="w-12 h-12 text-primary mb-4 mx-auto" />
                    <h3 className="font-bold text-lg mb-2 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Como você quer usar o StarFruitC?</h2>
            <p className="text-xl text-muted-foreground">
              Escolha a opção que melhor se encaixa com você
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {userTypes.map((type, index) => (
              <Card
                key={index}
                className="hover:shadow-[var(--shadow-primary)] transition-all hover:-translate-y-2 cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate(type.route)}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${type.gradient} p-4 mx-auto mb-6 hover:scale-110 transition-transform`}>
                    <img 
                      src={type.icon} 
                      alt={type.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{type.title}</h3>
                  <p className="text-muted-foreground mb-6">{type.description}</p>
                  <Button 
                    className={`bg-gradient-to-r ${type.gradient} text-white hover:opacity-90`}
                  >
                    Começar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2025 StarFruitC. Frescor tropical na sua porta 🍊
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
