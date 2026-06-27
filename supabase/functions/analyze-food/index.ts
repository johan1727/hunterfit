import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { image_base64, mime_type = 'image/jpeg' } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 requerido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurado');

    const prompt = `Analiza esta imagen de comida y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin texto extra) con este formato exacto:
{
  "items": [
    {
      "nombre": "nombre del alimento en español",
      "gramos_estimados": 150,
      "kcal": 250,
      "protein_g": 20.5,
      "carbs_g": 15.0,
      "fat_g": 8.0
    }
  ],
  "confianza": "alta"
}

Reglas:
- Identifica TODOS los alimentos visibles por separado
- Estima gramos y macros realistas para la porción visible
- confianza: "alta" si ves claramente la comida, "media" si hay incertidumbre, "baja" si la imagen es poco clara
- Los valores numéricos deben ser números (no strings)
- Si no hay comida visible, devuelve items: []`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type, data: image_base64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini error ${geminiRes.status}: ${errBody}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Extraer JSON aunque Gemini envuelva en ```json
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini no devolvió JSON válido');

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
