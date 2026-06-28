import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { audio_base64, mime_type = 'audio/m4a' } = await req.json();
    if (!audio_base64) {
      return new Response(JSON.stringify({ error: 'audio_base64 requerido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurado');

    const prompt = `El usuario ha grabado un audio diciendo el nombre de un alimento que quiere registrar en su dieta.
Transcribe lo que dice y extrae el alimento y la cantidad si se menciona.
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin texto extra) con este formato:
{
  "alimento": "nombre del alimento en español, singular y limpio",
  "cantidad_g": 100,
  "confianza": "alta"
}

Reglas:
- "alimento" debe ser el nombre limpio del alimento (ej: "pollo a la plancha", "arroz blanco", "manzana")
- "cantidad_g" es la cantidad en gramos si se menciona, sino usa 100 como valor por defecto
- "confianza": "alta" si el audio es claro, "media" si hay duda, "baja" si no se entiende
- Si no hay alimento reconocible devuelve { "alimento": "", "cantidad_g": 100, "confianza": "baja" }`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type, data: audio_base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
