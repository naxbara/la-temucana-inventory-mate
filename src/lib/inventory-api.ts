import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Product = Tables<"products"> & { categories?: Tables<"categories"> | null };
export type Category = Tables<"categories">;
export type InventoryMovement = Tables<"inventory_movements"> & { products?: Tables<"products"> | null };

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(*)")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data as Product[];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function fetchMovements(limit = 50) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, products(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as InventoryMovement[];
}

export async function createProduct(product: TablesInsert<"products">) {
  const { data, error } = await supabase.from("products").insert(product).select("*, categories(*)").single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<TablesInsert<"products">>) {
  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select("*, categories(*)").single();
  if (error) throw error;
  return data as Product;
}

export async function createMovement(movement: TablesInsert<"inventory_movements">) {
  const { error: moveError } = await supabase.from("inventory_movements").insert(movement);
  if (moveError) throw moveError;

  // Update product stock
  const { data: product } = await supabase.from("products").select("current_stock").eq("id", movement.product_id).single();
  if (!product) throw new Error("Producto no encontrado");

  let newStock = product.current_stock;
  if (movement.type === "entrada") newStock += movement.quantity;
  else if (movement.type === "salida") newStock -= movement.quantity;
  else newStock = movement.quantity; // ajuste

  const { error: updateError } = await supabase.from("products").update({ current_stock: newStock }).eq("id", movement.product_id);
  if (updateError) throw updateError;
}

export async function ocrProductionPhoto(imageBase64: string) {
  const { data, error } = await supabase.functions.invoke("ocr-production", {
    body: { imageBase64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.items as Array<{ producto: string; cantidad: number }>;
}
