import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCategories, useCreateProduct } from "@/hooks/use-inventory";
import { toast } from "sonner";

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();

  const [form, setForm] = useState({
    name: "",
    category_id: "",
    unit: "unidad",
    current_stock: 0,
    min_stock: 0,
    cost_price: 0,
    sale_price: 0,
    supplier: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    createProduct.mutate(
      {
        ...form,
        category_id: form.category_id || null,
        supplier: form.supplier || null,
      },
      {
        onSuccess: () => {
          toast.success("Producto creado");
          setOpen(false);
          setForm({ name: "", category_id: "", unit: "unidad", current_stock: 0, min_stock: 0, cost_price: 0, sale_price: 0, supplier: "" });
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Empanada de pino" />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Stock inicial</Label>
              <Input type="number" min={0} value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Precio costo ($)</Label>
              <Input type="number" min={0} value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Precio venta ($)</Label>
              <Input type="number" min={0} value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Opcional" />
          </div>

          <Button type="submit" className="w-full" disabled={createProduct.isPending}>
            {createProduct.isPending ? "Guardando..." : "Guardar Producto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
