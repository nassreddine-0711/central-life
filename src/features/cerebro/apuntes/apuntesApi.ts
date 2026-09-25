/* ============================================================
   Cliente para las funciones serverless de transcripción/resumen
   de audios de Apuntes. Las claves de API (Soniox, OpenAI) viven
   solo en el servidor (Vercel), nunca en el navegador.
============================================================ */

export interface StartTranscriptionResult {
  transcriptionId: string;
}

export interface PollTranscriptionResult {
  status: "processing" | "completed" | "failed";
  transcript?: string;
  summary?: string;
  error?: string;
}

async function parseJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function startTranscription(audioUrl: string, context?: string): Promise<StartTranscriptionResult> {
  const res = await fetch("/api/apuntes-transcribe-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioUrl, languageHints: ["es", "ca"], context }),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json?.error || "No se pudo iniciar la transcripción.");
  return json;
}

export async function pollTranscription(transcriptionId: string): Promise<PollTranscriptionResult> {
  const res = await fetch(`/api/apuntes-transcribe-status?id=${encodeURIComponent(transcriptionId)}`);
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json?.error || "Error consultando la transcripción.");
  return json;
}
