import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("unidade");
  const [imageUrl, setImageUrl] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setName(data.name);
          setPrice((data.price_milli / 1000).toFixed(2).replace(".", ","));
          setUnit(data.unit || "unidade");
          if (data.image_url) {
            setExistingImageUrl(data.image_url);
          }
        }
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao carregar produto",
          variant: "destructive",
        });
        navigate("/dashboard/store");
      } finally {
        setLoadingData(false);
      }
    };

    loadProduct();
  }, [id, navigate, toast]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file);

      if (uploadError) {
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
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
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
        name,
        price_milli: priceMilli,
        unit,
      };

      // Usar nova imagem se foi enviada, senão mantém a existente
      const finalImageUrl = imageUrl || existingImageUrl;
      if (finalImageUrl) {
        productData.image_url = finalImageUrl;
      }

      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id);
      
      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Produto atualizado com sucesso",
      });
      
      navigate("/dashboard/store");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar produto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentImageUrl = imageUrl || existingImageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            Editar Produto
          </h1>
          <Button variant="outline" onClick={() => navigate("/dashboard/store")}>Voltar</Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-xl mx-auto shadow-[var(--shadow-secondary)]">
          <CardHeader>
            <CardTitle>Editar Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
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
                    {currentImageUrl && (
                      <div className="w-16 h-16 rounded-md overflow-hidden border">
                        <img src={currentImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard/store")} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-secondary to-accent" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditProduct;

