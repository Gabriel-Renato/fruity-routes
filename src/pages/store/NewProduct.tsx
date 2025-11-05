import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const NewProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("unidade");
  const [imageUrl, setImageUrl] = useState("");

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d,]/g, "");
    setPrice(value);
  };

  const handlePriceBlur = () => {
    if (price) {
      const numValue = parseFloat(price.replace(",", "."));
      if (!isNaN(numValue)) {
        const formatted = numValue.toFixed(2).replace(".", ",");
        setPrice(formatted);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para fazer upload de imagens",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        if (uploadError.message.includes('new row violates row-level security') || uploadError.message.includes('RLS')) {
          throw new Error("Erro de permissão. Verifique se o bucket 'products' existe, está marcado como PÚBLICO e tem políticas RLS configuradas. Veja STORAGE_SETUP.md para instruções.");
        }
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          throw new Error("Bucket 'products' não encontrado. Crie o bucket no Supabase Dashboard (Storage > Create Bucket) e marque como PÚBLICO. Veja STORAGE_SETUP.md para instruções detalhadas.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      
      toast({
        title: "Sucesso!",
        description: "Imagem carregada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem. Verifique se o bucket 'products' está configurado no Supabase.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      
      const priceValue = price.replace(",", ".");
      const priceMilli = Math.round(parseFloat(priceValue) * 1000);
      
      if (isNaN(priceMilli) || priceMilli <= 0) {
        toast({
          title: "Erro",
          description: "Preço inválido",
          variant: "destructive",
        });
        return;
      }

      const productData: any = {
        store_id: user.id,
        name,
        price_milli: priceMilli,
        unit,
      };

      if (imageUrl) {
        productData.image_url = imageUrl;
      }

      await supabase.from("products").insert(productData);
      
      toast({
        title: "Sucesso!",
        description: "Produto cadastrado com sucesso",
      });
      
      navigate("/dashboard/store");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar produto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input 
                    id="price" 
                    type="text" 
                    value={price} 
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    placeholder="0,00"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="g">Grama</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="ml">Mililitro</SelectItem>
                      <SelectItem value="pacote">Pacote</SelectItem>
                      <SelectItem value="caixa">Caixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Foto do Produto</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                    disabled={loading}
                  />
                  {imageUrl && (
                    <div className="w-16 h-16 rounded-md overflow-hidden border">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/store")} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-secondary to-accent" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewProduct;


