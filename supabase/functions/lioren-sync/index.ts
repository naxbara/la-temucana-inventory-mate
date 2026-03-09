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
  action: "fetch_products" | "get_warehouses" | "add_stock" | "debug";
  productId?: number;
  quantity?: number;
  warehouseId?: number;
}

function extractProducts(data: unknown): LiorenProduct[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Try common wrapper keys
    for (const key of ["data", "productos", "items", "results", "product", "records"]) {
      if (Array.isArray(obj[key])) return obj[key] as LiorenProduct[];
    }
    // Try nested data.data
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>;
      for (const key of ["data", "productos", "items", "results"]) {
        if (Array.isArray(nested[key])) return nested[key] as LiorenProduct[];
      }
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIOREN_API_TOKEN = Deno.env.get("LIOREN_API_TOKEN")?.trim();
    const LIOREN_API_URL = (Deno.env.get("LIOREN_API_URL") || "https://www.lioren.cl/api").trim();

    if (!LIOREN_API_TOKEN) {
      throw new Error("Lioren API token not configured");
    }

    const { action, productId, quantity, warehouseId } = (await req.json()) as SyncRequest;

    const headers = {
      Authorization: `Bearer ${LIOREN_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Debug action: try multiple URL patterns and return raw responses
    if (action === "debug") {
      const urlsToTry = [
        `${LIOREN_API_URL}/productos`,
        `${LIOREN_API_URL}/productos?rpp=10`,
        `${LIOREN_API_URL}/productos?activo=1`,
        `${LIOREN_API_URL}/producto`,
        `${LIOREN_API_URL}/products`,
        `${LIOREN_API_URL}/inventario`,
        `${LIOREN_API_URL}/stock`,
        `${LIOREN_API_URL}/stocks`,
      ];

      const results: Record<string, unknown>[] = [];

      for (const url of urlsToTry) {
        try {
          const r = await fetch(url, { method: "GET", headers });
          const text = await r.text();
          results.push({
            url,
            status: r.status,
            body: text.substring(0, 500),
          });
        } catch (e) {
          results.push({ url, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          configuredUrl: LIOREN_API_URL,
          tokenPrefix: LIOREN_API_TOKEN.substring(0, 8) + "...",
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let response;

    switch (action) {
      case "fetch_products": {
        // Try without filters first, then with pagination
        const allProducts: LiorenProduct[] = [];
        let page = 1;
        let hasMore = true;

        // First try without any filters
        const firstUrl = `${LIOREN_API_URL}/productos?rpp=100&page=${page}`;
        console.log("Fetching:", firstUrl);
        response = await fetch(firstUrl, { method: "GET", headers });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Lioren API error:", response.status, errorText.substring(0, 500));
          throw new Error(`Lioren API error: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Raw response type:", typeof rawData, "isArray:", Array.isArray(rawData));
        console.log("Raw response keys:", rawData && typeof rawData === "object" ? Object.keys(rawData) : "N/A");
        console.log("Raw response preview:", JSON.stringify(rawData).substring(0, 500));

        const products = extractProducts(rawData);
        console.log("Extracted products count:", products.length);

        if (products.length === 0) {
          // Return debug info if no products found
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
              debug: {
                url: firstUrl,
                responseType: typeof rawData,
                isArray: Array.isArray(rawData),
                keys: rawData && typeof rawData === "object" ? Object.keys(rawData) : [],
                preview: JSON.stringify(rawData).substring(0, 1000),
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        allProducts.push(...products);

        // Try pagination if we got a full page
        while (products.length >= 100 && hasMore && page < 20) {
          page++;
          const nextUrl = `${LIOREN_API_URL}/productos?rpp=100&page=${page}`;
          const nextResponse = await fetch(nextUrl, { method: "GET", headers });
          if (!nextResponse.ok) break;
          const nextData = await nextResponse.json();
          const nextProducts = extractProducts(nextData);
          if (nextProducts.length === 0) {
            hasMore = false;
          } else {
            allProducts.push(...nextProducts);
          }
        }

        const transformedProducts = allProducts.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidad,
          stock: p.stocks?.reduce((sum, s) => sum + (s.cantidad || 0), 0) || 0,
          precioCompra: p.preciocompraneto,
          precioVenta: p.precioventabruto,
        }));

        return new Response(
          JSON.stringify({ success: true, data: transformedProducts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_warehouses":
        response = await fetch(`${LIOREN_API_URL}/bodegas`, { method: "GET", headers });
        break;

      case "add_stock":
        if (!productId || quantity === undefined || !warehouseId) {
          throw new Error("productId, quantity, and warehouseId are required for add_stock");
        }
        response = await fetch(`${LIOREN_API_URL}/stocks`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            producto_id: productId,
            bodega_id: warehouseId,
            cantidad: quantity,
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
