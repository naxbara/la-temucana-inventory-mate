import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExcelRow {
  producto: string;
  cantidad: number;
  tipo?: "entrada" | "salida" | "ajuste";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rows, updateType } = (await req.json()) as { 
      rows: ExcelRow[]; 
      updateType: "entrada" | "salida" | "ajuste" 
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("No se recibieron datos del Excel");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing products to match names
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, current_stock")
      .eq("is_active", true);

    if (productsError) throw productsError;

    const results: { producto: string; status: string; newStock?: number }[] = [];
    const productMap = new Map(products?.map((p) => [p.name.toLowerCase(), p]) || []);

    for (const row of rows) {
      const productName = row.producto?.trim().toLowerCase();
      const quantity = Number(row.cantidad);
      const type = row.tipo || updateType;

      if (!productName || isNaN(quantity)) {
        results.push({ producto: row.producto || "Desconocido", status: "error: datos inválidos" });
        continue;
      }

      const product = productMap.get(productName);

      if (!product) {
        results.push({ producto: row.producto, status: "error: producto no encontrado" });
        continue;
      }

      // Calculate new stock based on type
      let newStock = product.current_stock;
      if (type === "entrada") newStock += quantity;
      else if (type === "salida") newStock -= quantity;
      else newStock = quantity; // ajuste

      // Insert movement
      const { error: moveError } = await supabase.from("inventory_movements").insert({
        product_id: product.id,
        type,
        quantity,
        source: "excel",
        notes: `Importación Excel`,
      });

      if (moveError) {
        results.push({ producto: row.producto, status: `error: ${moveError.message}` });
        continue;
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", product.id);

      if (updateError) {
        results.push({ producto: row.producto, status: `error: ${updateError.message}` });
        continue;
      }

      results.push({ producto: row.producto, status: "success", newStock });
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: rows.length,
        successful: successCount,
        failed: rows.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Excel import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
