import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface ImportResult {
  producto: string;
  status: string;
  newStock?: number;
}

export function ExcelImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [updateType, setUpdateType] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls") && !selectedFile.name.endsWith(".csv")) {
        toast.error("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map columns - expect "producto" and "cantidad" columns (case insensitive)
      const rows = jsonData.map((row: Record<string, unknown>) => {
        const keys = Object.keys(row);
        const productoKey = keys.find((k) => k.toLowerCase().includes("producto") || k.toLowerCase().includes("nombre"));
        const cantidadKey = keys.find((k) => k.toLowerCase().includes("cantidad") || k.toLowerCase().includes("stock") || k.toLowerCase().includes("qty"));
        const tipoKey = keys.find((k) => k.toLowerCase().includes("tipo"));

        return {
          producto: productoKey ? String(row[productoKey]) : "",
          cantidad: cantidadKey ? Number(row[cantidadKey]) : 0,
          tipo: tipoKey ? String(row[tipoKey]) as "entrada" | "salida" | "ajuste" : undefined,
        };
      });

      if (rows.length === 0) {
        throw new Error("El archivo no contiene datos válidos");
      }

      const { data, error } = await supabase.functions.invoke("import-excel", {
        body: { rows, updateType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results);
      
      if (data.successful > 0) {
        toast.success(`${data.successful} de ${data.processed} productos actualizados`);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["movements"] });
      } else {
        toast.error("No se pudo actualizar ningún producto");
      }
    } catch (error) {
      console.error("Excel processing error:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con columnas "Producto" y "Cantidad" para actualizar el inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>Archivo Excel o CSV</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar un archivo
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Update Type */}
          <div className="space-y-2">
            <Label>Tipo de movimiento</Label>
            <Select value={updateType} onValueChange={(v) => setUpdateType(v as typeof updateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (suma al stock)</SelectItem>
                <SelectItem value="salida">Salida (resta del stock)</SelectItem>
                <SelectItem value="ajuste">Ajuste (reemplaza el stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-2">
              <Label>Resultados</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm p-2 rounded ${
                      result.status === "success" ? "bg-success/10" : "bg-destructive/10"
                    }`}
                  >
                    <span className="font-medium">{result.producto}</span>
                    <div className="flex items-center gap-2">
                      {result.status === "success" ? (
                        <>
                          <span className="text-muted-foreground">Stock: {result.newStock}</span>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-destructive">{result.status}</span>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              {results ? "Cerrar" : "Cancelar"}
            </Button>
            {!results && (
              <Button onClick={processExcel} disabled={!file || isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Importar"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
