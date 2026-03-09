import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LiorenProduct {
  id: number;
  nombre: string;
  unidad: string;
  stocks?: { bodega_id: number; cantidad: number }[];
  preciocompraneto?: number;
  precioventabruto?: number;
  activo: number;
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
    // Base URL is https://www.lioren.cl/api
    const LIOREN_API_URL = Deno.env.get("LIOREN_API_URL") || "https://www.lioren.cl/api";

    if (!LIOREN_API_TOKEN) {
      throw new Error("Lioren API token not configured");
    }

    const { action, productId, quantity, warehouseId } = (await req.json()) as SyncRequest;

    const headers = {
      Authorization: `Bearer ${LIOREN_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let response;

    switch (action) {
      case "fetch_products":
        // GET /productos - returns array of products with stocks
        response = await fetch(`${LIOREN_API_URL}/productos?activo=1&rpp=100`, { 
          method: "GET",
          headers 
        });
        break;

      case "get_warehouses":
        // Lioren uses bodegas endpoint
        response = await fetch(`${LIOREN_API_URL}/bodegas`, { 
          method: "GET",
          headers 
        });
        break;

      case "update_stock":
        if (!productId || quantity === undefined) {
          throw new Error("productId and quantity are required for update_stock");
        }
        // Stock update endpoint - adjust based on actual Lioren docs
        response = await fetch(`${LIOREN_API_URL}/stock`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            producto_id: productId,
            cantidad: quantity,
            bodega_id: warehouseId || 1,
          }),
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lioren API response:", response.status, errorText.substring(0, 500));
      throw new Error(`Lioren API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    // Transform products to include total stock from all warehouses
    if (action === "fetch_products" && Array.isArray(data)) {
      const transformedProducts = data.map((p: LiorenProduct) => ({
        id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        stock: p.stocks?.reduce((sum, s) => sum + (s.cantidad || 0), 0) || 0,
        precioCompra: p.preciocompraneto,
        precioVenta: p.precioventabruto,
      }));
      return new Response(JSON.stringify({ success: true, data: transformedProducts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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