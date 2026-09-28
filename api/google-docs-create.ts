/* ============================================================
   Vercel Serverless Function: crea un Google Doc nuevo (dentro
   de la carpeta "Apuntes - central-life" en Drive) para un
   apunte de la app.
============================================================ */
import { getUserFromRequest, getGoogleAccessToken, getOrCreateFolderId } from "./_lib/google.js";

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
    const title = (body.title || "Sin título").toString().slice(0, 300);

    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const folderId = (typeof body.folderId === "string" && body.folderId)
      ? body.folderId
      : await getOrCreateFolderId(user.id, accessToken);

    const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const doc = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !doc.documentId) {
      res.status(500).json({ error: "No se pudo crear el documento en Google Docs." });
      return;
    }

    await fetch(`https://www.googleapis.com/drive/v3/files/${doc.documentId}?addParents=${folderId}&fields=id,parents`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.status(200).json({
      googleDocId: doc.documentId,
      googleDocUrl: `https://docs.google.com/document/d/${doc.documentId}/edit`,
      folderId,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado creando el documento." });
  }
}
