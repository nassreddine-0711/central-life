/* ============================================================
   Vercel Serverless Function: devuelve el árbol de carpetas de
   Drive visibles para la app (con drive.file, Google solo nos
   deja ver lo que la propia app ha creado, así que esta lista
   ya viene naturalmente limitada a "Apuntes - central-life").
============================================================ */
import { getUserFromRequest, getGoogleAccessToken, getOrCreateFolderId } from "./_lib/google.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  try {
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const rootId = await getOrCreateFolderId(user.id, accessToken);

    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id,name,parents)",
      pageSize: "1000",
    });
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listData = await listRes.json().catch(() => ({}));
    if (!listRes.ok) {
      res.status(listRes.status).json({ error: "No se pudo leer las carpetas de Drive." });
      return;
    }

    const rawFiles: any[] = listData.files || [];
    const folders = rawFiles.map((f) => ({
      id: f.id as string,
      name: f.name as string,
      parentId: f.id === rootId ? null : ((f.parents && f.parents[0]) || null),
    }));

    if (!folders.some((f) => f.id === rootId)) {
      folders.unshift({ id: rootId, name: "Apuntes", parentId: null });
    }

    res.status(200).json({ rootId, folders });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado leyendo Drive." });
  }
}
