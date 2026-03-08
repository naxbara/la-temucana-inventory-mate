import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Se requiere una imagen" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente que lee conteos de producción escritos a mano en fotos de hojas de papel o pizarras de una amasandería de empanadas.
Extrae los productos y cantidades que puedas identificar.
Responde SOLO con un JSON array válido, sin texto adicional.
Cada elemento debe tener: "producto" (string) y "cantidad" (number).
Si no puedes leer algo, omítelo. Si la imagen no contiene información relevante, devuelve un array vacío [].
Ejemplo: [{"producto": "Empanada de pino", "cantidad": 50}, {"producto": "Empanada de queso", "cantidad": 30}]`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Lee el conteo de producción de esta imagen y devuelve los productos y cantidades encontrados."
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_production_count",
              description: "Extract production counts from handwritten notes",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        producto: { type: "string", description: "Product name" },
                        cantidad: { type: "number", description: "Quantity produced" }
                      },
                      required: ["producto", "cantidad"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["items"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_production_count" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta de nuevo en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Agrega créditos en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let items: Array<{ producto: string; cantidad: number }> = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        items = parsed.items || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Fallback: try parsing content directly
    if (items.length === 0) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const match = content.match(/\[[\s\S]*\]/);
          if (match) items = JSON.parse(match[0]);
        } catch {
          console.error("Failed to parse content as JSON");
        }
      }
    }

    return new Response(JSON.stringify({ success: true, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
