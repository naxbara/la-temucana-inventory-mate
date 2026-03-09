import { useState } from "react";
import { useProducts, useCategories, useUpdateProduct } from "@/hooks/use-inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Pencil, ArrowLeft, X, Plus, Tags, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNameVariations, addNameVariation, deleteNameVariation } from "@/lib/admin-api";
import type { Product } from "@/lib/inventory-api";

function ProductEditDialog({ product }: { product: Product }) {
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: product.name,
    category_id: product.category_id || "",
    unit: product.unit,
    min_stock: product.min_stock,
    cost_price: product.cost_price ?? 0,
    sale_price: product.sale_price ?? 0,
    supplier: product.supplier || "",
  });

  const [newVariation, setNewVariation] = useState("");

  const { data: variations = [], refetch: refetchVariations } = useQuery({
    queryKey: ["name-variations", product.id],
    queryFn: () => fetchNameVariations(product.id),
    enabled: open,
  });

  const addVariationMut = useMutation({
    mutationFn: (v: string) => addNameVariation(product.id, v),
    onSuccess: () => {
      refetchVariations();
      setNewVariation("");
      toast.success("Variación agregada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteVariationMut = useMutation({
    mutationFn: deleteNameVariation,
    onSuccess: () => {
      refetchVariations();
      toast.success("Variación eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = () => {
    updateProduct.mutate(
      {
        id: product.id,
        updates: {
          name: form.name,
          category_id: form.category_id || null,
          unit: form.unit,
          min_stock: form.min_stock,
          cost_price: form.cost_price,
          sale_price: form.sale_price,
          supplier: form.supplier || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Producto actualizado");
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleAddVariation = () => {
    const v = newVariation.trim();
    if (!v) return;
    addVariationMut.mutate(v);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setForm({
          name: product.name,
          category_id: product.category_id || "",
          unit: product.unit,
          min_stock: product.min_stock,
          cost_price: product.cost_price ?? 0,
          sale_price: product.sale_price ?? 0,
          supplier: product.supplier || "",
        });
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Name Variations */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Tags className="h-4 w-4" />
              Variaciones del nombre
            </Label>
            <p className="text-xs text-muted-foreground">
              Nombres alternativos para que el sistema reconozca este producto (ej: OCR, importaciones).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variations.map(v => (
                <Badge key={v.id} variant="secondary" className="gap-1 pr-1">
                  {v.variation}
                  <button
                    onClick={() => deleteVariationMut.mutate(v.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: empanada pino, emp. de pino..."
                value={newVariation}
                onChange={e => setNewVariation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddVariation())}
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddVariation} disabled={addVariationMut.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="kg">Kilogramo</SelectItem>
                  <SelectItem value="litro">Litro</SelectItem>
                  <SelectItem value="docena">Docena</SelectItem>
                  <SelectItem value="bandeja">Bandeja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock & Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Precio costo ($)</Label>
              <Input type="number" min={0} value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Precio venta ($)</Label>
              <Input type="number" min={0} value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Opcional" />
          </div>

          <Button onClick={handleSave} className="w-full gap-2" disabled={updateProduct.isPending}>
            <Save className="h-4 w-4" />
            {updateProduct.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { data: products = [], isLoading } = useProducts();
  const [search, setSearch] = useState("");

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administración de Productos</h1>
            <p className="text-sm text-muted-foreground">Edita nombres, variaciones y parámetros</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground py-10 text-center">Cargando...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(product => (
              <Card key={product.id} className="group relative">
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                  <ProductEditDialog product={product} />
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {product.categories && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${product.categories.color}20`,
                        color: product.categories.color || undefined,
                      }}
                    >
                      {product.categories.name}
                    </span>
                  )}
                  <div className="flex justify-between">
                    <span>Stock: {product.current_stock} {product.unit}</span>
                    <span>Mín: {product.min_stock}</span>
                  </div>
                  {(product.cost_price || product.sale_price) && (
                    <div className="flex justify-between">
                      {product.cost_price ? <span>Costo: ${product.cost_price}</span> : <span />}
                      {product.sale_price ? <span>Venta: ${product.sale_price}</span> : <span />}
                    </div>
                  )}
                  {product.supplier && <div>Proveedor: {product.supplier}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
