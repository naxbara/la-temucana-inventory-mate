import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, fetchCategories, fetchMovements, createProduct, updateProduct, createMovement } from "@/lib/inventory-api";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: fetchProducts });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

export function useMovements(limit = 50) {
  return useQuery({ queryKey: ["movements", limit], queryFn: () => fetchMovements(limit) });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: TablesInsert<"products">) => createProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TablesInsert<"products">> }) => updateProduct(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movement: TablesInsert<"inventory_movements">) => createMovement(movement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}
