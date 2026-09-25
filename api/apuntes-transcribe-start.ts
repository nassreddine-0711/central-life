/* ============================================================
   Vercel Serverless Function: inicia una transcripción asíncrona
   en Soniox a partir de una URL de audio (firmada, de Supabase
   Storage). Mantiene la API key de Soniox solo en el servidor.
============================================================ */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const SONIOX_API_KEY = process.env.SONIOX_API_KEY;
  if (!SONIOX_API_KEY) {
    res.status(500).json({ error: "Falta configurar SONIOX_API_KEY en las variables de entorno del servidor." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { audioUrl, languageHints, context } = body;
    if (!audioUrl || typeof audioUrl !== "string") {
      res.status(400).json({ error: "Falta audioUrl." });
      return;
    }

    const sonioxRes = await fetch("https://api.soniox.com/v1/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SONIOX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "stt-async-preview",
        audio_url: audioUrl,
        language_hints: Array.isArray(languageHints) && languageHints.length ? languageHints : ["es", "ca"],
        ...(context ? { context: String(context).slice(0, 500) } : {}),
      }),
    });

    const data = await sonioxRes.json().catch(() => ({}));
    if (!sonioxRes.ok) {
      res.status(sonioxRes.status).json({ error: data?.error_message || data?.message || "Error al iniciar la transcripción en Soniox." });
      return;
    }

    res.status(200).json({ transcriptionId: data.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado iniciando la transcripción." });
  }
}
