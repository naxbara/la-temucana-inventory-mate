import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Search } from "lucide-react";
import type { Product } from "@/lib/inventory-api";
import { useCreateMovement } from "@/hooks/use-inventory";
import { toast } from "sonner";

interface ProductTableProps {
  products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
  const [search, setSearch] = useState("");
  const createMovement = useCreateMovement();

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleQuickMove = (productId: string, type: "entrada" | "salida", qty: number) => {
    createMovement.mutate(
      { product_id: productId, type, quantity: qty, source: "manual" },
      {
        onSuccess: () => toast.success(type === "entrada" ? "Entrada registrada" : "Salida registrada"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock <= 0) return "alert-badge-danger";
    if (product.current_stock <= product.min_stock) return "alert-badge-warning";
    return "alert-badge-success";
  };

  const getStockLabel = (product: Product) => {
    if (product.current_stock <= 0) return "Sin stock";
    if (product.current_stock <= product.min_stock) return "Bajo";
    return "OK";
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Mín.</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron productos
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(product => (
                <TableRow key={product.id} className="animate-fade-in">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {product.current_stock} {product.unit}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {product.min_stock}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getStockStatus(product)}>{getStockLabel(product)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuickMove(product.id, "entrada", 1)}
                      >
                        <Plus className="h-4 w-4 text-success" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuickMove(product.id, "salida", 1)}
                        disabled={product.current_stock <= 0}
                      >
                        <Minus className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
