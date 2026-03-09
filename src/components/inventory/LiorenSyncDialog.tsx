import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "@/hooks/use-inventory";

interface SyncResult {
  producto: string;
  status: string;
  stock?: number;
}

export function LiorenImportButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("lioren-sync", {
        body: { action: "fetch_products" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const liorenProducts = data.data || [];
      const importResults: SyncResult[] = [];

      // Get existing products
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true);

      const productMap = new Map(
        existingProducts?.map((p) => [p.name.toLowerCase(), p.id]) || []
      );

      for (const lp of liorenProducts) {
        const existingId = productMap.get(lp.nombre?.toLowerCase());

        if (existingId) {
          // Update existing product stock
          const { error: updateError } = await supabase
            .from("products")
            .update({ current_stock: lp.stock || 0 })
            .eq("id", existingId);

          if (updateError) {
            importResults.push({ producto: lp.nombre, status: "error", stock: lp.stock });
          } else {
            importResults.push({ producto: lp.nombre, status: "actualizado", stock: lp.stock });
          }
        } else {
          // Create new product
          const { error: insertError } = await supabase.from("products").insert({
            name: lp.nombre,
            current_stock: lp.stock || 0,
            unit: lp.unidad || "unidad",
          });

          if (insertError) {
            importResults.push({ producto: lp.nombre, status: "error" });
          } else {
            importResults.push({ producto: lp.nombre, status: "creado", stock: lp.stock });
          }
        }
      }

      setResults(importResults);
      const successCount = importResults.filter((r) => r.status !== "error").length;
      toast.success(`${successCount} productos importados de Lioren`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Lioren import error:", error);
      toast.error(error instanceof Error ? error.message : "Error al conectar con Lioren");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Importar de Lioren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar de Lioren</DialogTitle>
          <DialogDescription>
            Importa productos y stock desde tu POS Lioren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Se importarán los productos y su stock actual desde Lioren. Los productos existentes se actualizarán, los nuevos se crearán.
              </p>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Iniciar importación
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm p-2 rounded ${
                      result.status !== "error" ? "bg-success/10" : "bg-destructive/10"
                    }`}
                  >
                    <span className="font-medium">{result.producto}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {result.status} {result.stock !== undefined && `(${result.stock})`}
                      </span>
                      {result.status !== "error" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LiorenExportButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const { data: products } = useProducts();

  const handleExport = async () => {
    if (!products || products.length === 0) {
      toast.error("No hay productos para exportar");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const exportResults: SyncResult[] = [];

      for (const product of products) {
        const { data, error } = await supabase.functions.invoke("lioren-sync", {
          body: {
            action: "update_stock",
            productId: product.name, // Using name as identifier for Lioren
            quantity: product.current_stock,
          },
        });

        if (error || data?.error) {
          exportResults.push({ producto: product.name, status: "error" });
        } else {
          exportResults.push({ producto: product.name, status: "exportado", stock: product.current_stock });
        }
      }

      setResults(exportResults);
      const successCount = exportResults.filter((r) => r.status !== "error").length;
      toast.success(`${successCount} productos exportados a Lioren`);
    } catch (error) {
      console.error("Lioren export error:", error);
      toast.error(error instanceof Error ? error.message : "Error al conectar con Lioren");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Exportar a Lioren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar a Lioren</DialogTitle>
          <DialogDescription>
            Envía el stock actual de tus productos a Lioren POS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Se actualizará el stock de {products?.length || 0} productos en Lioren con los valores actuales del inventario.
              </p>
              <Button onClick={handleExport} disabled={isLoading || !products?.length}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Iniciar exportación
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm p-2 rounded ${
                      result.status !== "error" ? "bg-success/10" : "bg-destructive/10"
                    }`}
                  >
                    <span className="font-medium">{result.producto}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {result.status} {result.stock !== undefined && `(${result.stock})`}
                      </span>
                      {result.status !== "error" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
