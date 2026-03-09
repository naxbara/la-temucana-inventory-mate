import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LiorenProduct {
  id: string;
  nombre: string;
  stock: number;
  unidad: string;
  categoria?: string;
}

interface SyncRequest {
  action: "fetch_products" | "update_stock" | "get_warehouses";
  productId?: string;
  quantity?: number;
  warehouseId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIOREN_API_TOKEN = Deno.env.get("LIOREN_API_TOKEN");
    const LIOREN_API_URL = Deno.env.get("LIOREN_API_URL");

    if (!LIOREN_API_TOKEN || !LIOREN_API_URL) {
      throw new Error("Lioren API credentials not configured");
    }

    const { action, productId, quantity, warehouseId } = (await req.json()) as SyncRequest;

    const headers = {
      Authorization: `Bearer ${LIOREN_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    let response;

    switch (action) {
      case "fetch_products":
        response = await fetch(`${LIOREN_API_URL}/productos`, { headers });
        break;

      case "get_warehouses":
        response = await fetch(`${LIOREN_API_URL}/bodegas`, { headers });
        break;

      case "update_stock":
        if (!productId || quantity === undefined) {
          throw new Error("productId and quantity are required for update_stock");
        }
        response = await fetch(`${LIOREN_API_URL}/stock`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            producto_id: productId,
            cantidad: quantity,
            bodega_id: warehouseId || "default",
          }),
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lioren API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lioren sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
