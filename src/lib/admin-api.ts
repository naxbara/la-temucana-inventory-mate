import { supabase } from "@/integrations/supabase/client";

export type NameVariation = {
  id: string;
  product_id: string;
  variation: string;
  created_at: string;
};

export async function fetchNameVariations(productId: string) {
  const { data, error } = await supabase
    .from("product_name_variations")
    .select("*")
    .eq("product_id", productId)
    .order("created_at");
  if (error) throw error;
  return data as NameVariation[];
}

export async function addNameVariation(productId: string, variation: string) {
  const { data, error } = await supabase
    .from("product_name_variations")
    .insert({ product_id: productId, variation: variation.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as NameVariation;
}

export async function deleteNameVariation(id: string) {
  const { error } = await supabase
    .from("product_name_variations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
