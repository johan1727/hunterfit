import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface SlimFood {
  name_es: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface RecipeRequest {
  userCalories: number;
  userProtein: number;
  userCarbs: number;
  userFat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  preferences?: string[];
  cuisine?: string;
}

const MEAL_TYPE_MAP: Record<string, string> = {
  breakfast: 'desayuno',
  lunch: 'comida',
  dinner: 'cena',
  snack: 'snack/merienda',
};

function buildRecipePrompt(request: RecipeRequest, foods: SlimFood[]): string {
  const foodList = foods
    .slice(0, 50)
    .map(f => `- ${f.name_es} (${f.kcal} kcal, ${f.protein_g}g prot, ${f.carbs_g}g carbs, ${f.fat_g}g fat)`)
    .join('\n');

  const prefsText = request.preferences?.length
    ? `\nPreferencias del usuario: incluir principalmente alimentos de los grupos ${request.preferences.join(', ')}.`
    : '';

  return `Crea una receta rápida para ${MEAL_TYPE_MAP[request.mealType] || request.mealType}.${prefsText}

Macros objetivo: ${request.userCalories} kcal, ${request.userProtein}g prot, ${request.userCarbs}g carbs, ${request.userFat}g grasa.

Alimentos disponibles:
${foodList}

Instrucciones: Selecciona SOLO alimentos de la lista. Aproxima los macros (±10%). Receta simple en 15-30 min. Cocina: ${request.cuisine || 'Latina'}.

Responde SOLO en JSON (sin markdown, sin bloques de código):
{
  "title": "Nombre creativo",
  "description": "Descripción breve",
  "foods": [{"name": "Alimento de la lista", "quantity_g": 150}],
  "prepTime": 20,
  "difficulty": "fácil",
  "steps": ["Paso 1", "Paso 2", "Paso 3"]
}`;
}

interface AskRecipeContext {
  title: string;
  description: string;
  foods: Array<{ name_es: string; quantity_g: number }>;
  steps: string[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  difficulty: string;
  prepTime: number;
}

function buildAskPrompt(question: string, recipe: AskRecipeContext): string {
  const context = `
Receta: ${recipe.title}
Descripción: ${recipe.description}
Ingredientes: ${recipe.foods.map(f => `${f.name_es} (${f.quantity_g}g)`).join(', ')}
Pasos: ${recipe.steps.join(' | ')}
Macros totales: ${recipe.totalKcal} kcal, ${recipe.totalProtein}g proteína, ${recipe.totalCarbs}g carbos, ${recipe.totalFat}g grasa
Dificultad: ${recipe.difficulty}, Tiempo: ${recipe.prepTime} min
`;

  return `Eres un nutricionista y chef experto. Responde de forma concisa y útil (máximo 3 oraciones) la siguiente pregunta sobre esta receta.

RECETA:
${context}

PREGUNTA: ${question}

Responde en español, de forma directa y práctica.`;
}

async function callGemini(apiKey: string, prompt: string, temperature: number, maxOutputTokens: number): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // thinkingBudget 0: en gemini-2.5 los thinking tokens cuentan contra
      // maxOutputTokens — sin esto la respuesta puede volver vacía/truncada.
      generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía (bloqueo de seguridad o límite de tokens)');
  }
  return text;
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Config de Supabase no disponible');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'hunterfit' },
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'No autorizado' }, 401);

    // Gate server-side: la UI ya exige premium, pero sin esto cualquier
    // usuario logueado podría consumir cuota de Gemini invocando directo.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();
    if (!profile?.is_premium) {
      return jsonResponse({ error: 'Requiere Hunter Pro' }, 403);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurado');

    const body = await req.json();
    const mode = body.mode;

    if (mode === 'recipe') {
      const request: RecipeRequest = body.request;
      const foods: SlimFood[] = Array.isArray(body.foods) ? body.foods.slice(0, 50) : [];
      if (!request || foods.length === 0) {
        return jsonResponse({ error: 'request y foods son requeridos' }, 400);
      }

      const prompt = buildRecipePrompt(request, foods);
      const rawText = await callGemini(apiKey, prompt, 0.7, 2048);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Gemini no devolvió JSON válido');

      const recipe = JSON.parse(jsonMatch[0]);
      return jsonResponse({ recipe });
    }

    if (mode === 'ask') {
      const question: string = String(body.question ?? '').slice(0, 500);
      const recipe: AskRecipeContext = body.recipe;
      if (!question || !recipe) {
        return jsonResponse({ error: 'question y recipe son requeridos' }, 400);
      }

      const prompt = buildAskPrompt(question, recipe);
      const answer = await callGemini(apiKey, prompt, 0.4, 512);
      return jsonResponse({ answer: answer.trim() });
    }

    return jsonResponse({ error: `mode inválido: ${mode}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});
