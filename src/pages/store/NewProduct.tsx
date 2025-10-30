import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const NewProduct = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const priceMilli = Math.round(Number(price) * 1000);
    await supabase.from("products").insert({
      store_id: user.id,
      name,
      price_milli: priceMilli,
    });
    navigate("/dashboard/store");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            Novo Produto
          </h1>
          <Button variant="outline" onClick={() => navigate("/dashboard/store")}>Voltar</Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-xl mx-auto shadow-[var(--shadow-secondary)]">
          <CardHeader>
            <CardTitle>Cadastrar Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/store")}>Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-secondary to-accent">Salvar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewProduct;


