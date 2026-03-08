import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, X } from "lucide-react";
import { ocrProductionPhoto } from "@/lib/inventory-api";
import { useProducts, useCreateMovement } from "@/hooks/use-inventory";
import { toast } from "sonner";

type OcrItem = { producto: string; cantidad: number };

export function PhotoCaptureDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<OcrItem[]>([]);
  const [matched, setMatched] = useState<Array<{ item: OcrItem; productId: string | null }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: products } = useProducts();
  const createMovement = useCreateMovement();

  const reset = () => {
    setPreview(null);
    setOcrResults([]);
    setMatched([]);
    setIsProcessing(false);
  };

  const handleFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setIsProcessing(true);

      try {
        const base64 = dataUrl.split(",")[1];
        const items = await ocrProductionPhoto(base64);
        setOcrResults(items);

        // Try to match with existing products
        const matchedItems = items.map(item => {
          const found = products?.find(p =>
            p.name.toLowerCase().includes(item.producto.toLowerCase()) ||
            item.producto.toLowerCase().includes(p.name.toLowerCase())
          );
          return { item, productId: found?.id || null };
        });
        setMatched(matchedItems);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error procesando imagen");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [products]);

  const handleApply = async () => {
    const validItems = matched.filter(m => m.productId);
    if (validItems.length === 0) {
      toast.error("No hay productos reconocidos para registrar");
      return;
    }

    try {
      for (const { item, productId } of validItems) {
        await createMovement.mutateAsync({
          product_id: productId!,
          type: "entrada",
          quantity: item.cantidad,
          notes: `OCR: ${item.producto}`,
          source: "ocr",
        });
      }
      toast.success(`${validItems.length} entradas registradas desde la foto`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error("Error registrando movimientos");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Camera className="mr-2 h-4 w-4" />
          Escanear Foto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escanear Conteo de Producción</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saca una foto o sube una imagen de tu hoja de conteo o pizarra. La IA leerá los productos y cantidades automáticamente.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="h-32 flex-col gap-2 border-dashed border-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Subir imagen o tomar foto</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <img src={preview} alt="Captura" className="w-full max-h-48 object-contain" />
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Leyendo imagen...</span>
                  </div>
                </div>
              )}
            </div>

            {!isProcessing && ocrResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Productos detectados:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {matched.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                        m.productId ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m.productId ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-medium">{m.item.producto}</span>
                      </div>
                      <span className="font-semibold">{m.item.cantidad}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApply} className="flex-1" disabled={createMovement.isPending}>
                    {createMovement.isPending ? "Registrando..." : "Registrar Entradas"}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Reintentar
                  </Button>
                </div>
              </div>
            )}

            {!isProcessing && ocrResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No se detectaron productos. Intenta con otra imagen.</p>
                <Button variant="outline" onClick={reset} className="mt-3">
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
