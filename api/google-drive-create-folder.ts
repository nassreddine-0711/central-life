/* ============================================================
   Vercel Serverless Function: crea una carpeta (o subcarpeta)
   real dentro de "Apuntes - central-life" en Google Drive.
============================================================ */
import { getUserFromRequest, getGoogleAccessToken, getOrCreateFolderId } from "./_lib/google";

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
    const name = (body.name || "").toString().trim().slice(0, 200);
    if (!name) {
      res.status(400).json({ error: "Falta el nombre de la carpeta." });
      return;
    }

    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const rootId = await getOrCreateFolderId(user.id, accessToken);
    const parentId = (typeof body.parentId === "string" && body.parentId) || rootId;

    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
    });
    const folder = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !folder.id) {
      res.status(500).json({ error: "No se pudo crear la carpeta en Drive." });
      return;
    }

    res.status(200).json({ id: folder.id, name: folder.name || name, parentId });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado creando la carpeta." });
  }
}
