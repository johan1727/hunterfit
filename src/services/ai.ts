import { supabase } from '../lib/supabase';
import type { BodyAnalysis, FoodAnalysisItem } from '../types/db';

export interface FoodAnalysisResult {
  items: FoodAnalysisItem[];
  confianza: 'alta' | 'media' | 'baja';
}

/** Envía una foto de comida (base64) a la Edge Function que llama a Gemini. */
export async function analyzeFoodPhoto(base64: string, mimeType: string): Promise<FoodAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { image_base64: base64, mime_type: mimeType },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data as FoodAnalysisResult;
}

/** Envía una foto corporal (base64) para obtener ajustes de rutina. */
export async function analyzeBodyPhoto(base64: string, mimeType: string): Promise<BodyAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-body', {
    body: { image_base64: base64, mime_type: mimeType },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data as BodyAnalysis;
}

async function describeFunctionError(error: unknown): Promise<string> {
  const anyErr = error as { context?: Response; message?: string };
  try {
    if (anyErr.context) {
      const body = await anyErr.context.json();
      if (body?.error) return body.error;
    }
  } catch { /* respuesta sin JSON */ }
  return anyErr.message ?? 'Error desconocido al analizar la imagen';
}
