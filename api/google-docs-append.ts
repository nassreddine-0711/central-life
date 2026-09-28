/* ============================================================
   Vercel Serverless Function: añade texto al final de un Google
   Doc existente (usado para insertar el resumen de un audio).
============================================================ */
import { getUserFromRequest, getGoogleAccessToken } from "./_lib/google.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { googleDocId, text } = body;
    if (!googleDocId || !text) {
      res.status(400).json({ error: "Faltan googleDocId o text." });
      return;
    }

    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              text: `\n\n${text}\n`,
              endOfSegmentLocation: { segmentId: "" },
            },
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      res.status(updateRes.status).json({ error: errData?.error?.message || "No se pudo escribir en el documento." });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado escribiendo en el documento." });
  }
}
