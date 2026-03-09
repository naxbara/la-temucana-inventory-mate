import { useProducts } from "@/hooks/use-inventory";
import { StatsCards } from "@/components/inventory/StatsCards";
import { ProductTable } from "@/components/inventory/ProductTable";
import { AddProductDialog } from "@/components/inventory/AddProductDialog";
import { PhotoCaptureDialog } from "@/components/inventory/PhotoCaptureDialog";
import { MovementDialog } from "@/components/inventory/MovementDialog";
import { MovementHistory } from "@/components/inventory/MovementHistory";
import { ExcelImportDialog } from "@/components/inventory/ExcelImportDialog";
import { LiorenImportButton, LiorenExportButton } from "@/components/inventory/LiorenSyncDialog";
import { Loader2 } from "lucide-react";

const InventoryDashboard = () => {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">La Temucana</h1>
            <p className="text-sm text-muted-foreground">Sistema de Inventario</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LiorenImportButton />
            <LiorenExportButton />
            <ExcelImportDialog />
            <PhotoCaptureDialog />
            <MovementDialog />
            <AddProductDialog />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <StatsCards products={products || []} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ProductTable products={products || []} />
              </div>
              <div>
                <MovementHistory />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default InventoryDashboard;
