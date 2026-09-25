/* ============================================================
   Vercel Serverless Function: consulta el estado de una
   transcripción en Soniox. Cuando termina, obtiene el texto y
   pide a OpenAI (gpt-4o-mini) un resumen en forma de apuntes.
   Las claves de API viven solo en el servidor.
============================================================ */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const SONIOX_API_KEY = process.env.SONIOX_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!SONIOX_API_KEY) {
    res.status(500).json({ error: "Falta configurar SONIOX_API_KEY en las variables de entorno del servidor." });
    return;
  }

  const id = req.query?.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "Falta id." });
    return;
  }

  try {
    const statusRes = await fetch(`https://api.soniox.com/v1/transcriptions/${id}`, {
      headers: { Authorization: `Bearer ${SONIOX_API_KEY}` },
    });
    const statusData = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok) {
      res.status(statusRes.status).json({ error: statusData?.error_message || "Error consultando Soniox." });
      return;
    }

    if (statusData.status === "failed") {
      res.status(200).json({ status: "failed", error: statusData.error_message || "La transcripción falló." });
      return;
    }

    if (statusData.status !== "completed") {
      res.status(200).json({ status: "processing" });
      return;
    }

    const transcriptRes = await fetch(`https://api.soniox.com/v1/transcriptions/${id}/transcript`, {
      headers: { Authorization: `Bearer ${SONIOX_API_KEY}` },
    });
    const transcriptData = await transcriptRes.json().catch(() => ({}));
    if (!transcriptRes.ok) {
      res.status(transcriptRes.status).json({ error: "No se pudo obtener el texto transcrito." });
      return;
    }
    const transcript: string = transcriptData.text || "";

    let summary = "";
    if (OPENAI_API_KEY && transcript.trim()) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "Eres un asistente que convierte transcripciones de audios (clases, apuntes hablados, notas de voz) en apuntes claros y bien organizados. El audio puede mezclar catalán y castellano; responde en el idioma predominante de la transcripción, respetando términos ya dichos en el otro idioma si son propios de esa lengua. Estructura el resultado en formato Markdown: un breve resumen inicial (2-4 líneas) y después los puntos clave con títulos ## y listas con viñetas. No inventes información que no esté en la transcripción.",
              },
              { role: "user", content: `Transcripción del audio:\n\n${transcript.slice(0, 60000)}` },
            ],
          }),
        });
        const openaiData = await openaiRes.json().catch(() => ({}));
        if (openaiRes.ok) {
          summary = openaiData?.choices?.[0]?.message?.content || "";
        }
      } catch {
        // Si el resumen falla, seguimos devolviendo al menos la transcripción.
      }
    }

    res.status(200).json({ status: "completed", transcript, summary });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado consultando la transcripción." });
  }
}
