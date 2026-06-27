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

    const prompt = `Analiza esta foto corporal de frente y devuelve ÚNICAMENTE un JSON válido (sin markdown) con este formato exacto:
{
  "body_type": "ectomorfo|mesomorfo|endomorfo",
  "muscle_groups_priority": ["pecho", "espalda", "piernas"],
  "estimated_body_fat_pct": 18,
  "notes": "descripción breve en español de lo observado",
  "routine_adjustments": {
    "focus": "hipertrofia|fuerza|definicion|general",
    "cardio_frequency": "baja|media|alta",
    "priority_areas": ["pecho", "hombros"]
  }
}

Reglas:
- Solo analiza si hay una persona visible de frente o perfil
- Si la imagen no muestra un cuerpo humano, devuelve null en todos los campos
- Sé conservador con el body_fat_pct (entre 8-40%)
- muscle_groups_priority: lista de 2-4 grupos a priorizar basado en lo observado`;

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
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini error ${geminiRes.status}: ${errBody}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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
