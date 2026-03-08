import { Package, AlertTriangle, TrendingUp, Camera } from "lucide-react";
import type { Product } from "@/lib/inventory-api";

interface StatsCardsProps {
  products: Product[];
}

export function StatsCards({ products }: StatsCardsProps) {
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock && p.current_stock > 0).length;
  const outOfStockCount = products.filter(p => p.current_stock <= 0).length;
  const totalUnits = products.reduce((sum, p) => sum + p.current_stock, 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="stat-value">{totalProducts}</p>
            <p className="stat-label">Productos</p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="stat-value">{totalUnits}</p>
            <p className="stat-label">Unidades totales</p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="stat-value">{lowStockCount}</p>
            <p className="stat-label">Stock bajo</p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="stat-value">{outOfStockCount}</p>
            <p className="stat-label">Sin stock</p>
          </div>
        </div>
      </div>
    </div>
  );
}
