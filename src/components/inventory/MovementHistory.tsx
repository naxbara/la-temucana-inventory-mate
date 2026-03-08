import { useMovements } from "@/hooks/use-inventory";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function MovementHistory() {
  const { data: movements, isLoading } = useMovements(30);

  const typeIcon = (type: string) => {
    switch (type) {
      case "entrada": return <ArrowDown className="h-4 w-4 text-success" />;
      case "salida": return <ArrowUp className="h-4 w-4 text-destructive" />;
      default: return <RefreshCw className="h-4 w-4 text-accent" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "entrada": return "Entrada";
      case "salida": return "Salida";
      default: return "Ajuste";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-muted-foreground text-sm">Cargando movimientos...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-3">
        <h3 className="font-display text-lg font-semibold">Últimos Movimientos</h3>
      </div>
      <div className="divide-y max-h-96 overflow-y-auto">
        {(!movements || movements.length === 0) ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin movimientos aún</p>
        ) : (
          movements.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {typeIcon(m.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.products?.name || "Producto"}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabel(m.type)} · {m.quantity} · {m.source === "ocr" ? "📷 OCR" : "Manual"}
                  {m.notes && ` · ${m.notes}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(m.created_at), "d MMM HH:mm", { locale: es })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
