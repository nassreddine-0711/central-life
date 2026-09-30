/* ============================================================
   Vercel Serverless Function: mueve un archivo (carpeta o Google
   Doc) de Drive a una carpeta padre distinta — quita los padres
   actuales y añade el nuevo, tal como pide la API de Drive v3.
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
    const fileId = (body.fileId || "").toString();
    const newParentId = (body.newParentId || "").toString();
    if (!fileId || !newParentId) {
      res.status(400).json({ error: "Falta fileId o newParentId." });
      return;
    }

    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,parents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meta = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      res.status(metaRes.status === 404 ? 404 : 500).json({ error: meta?.error?.message || "No se encontró el archivo en Drive." });
      return;
    }

    const oldParents: string[] = Array.isArray(meta.parents) ? meta.parents : [];
    const removeParents = oldParents.filter(p => p !== newParentId).join(",");

    const moveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}${removeParents ? `&removeParents=${removeParents}` : ""}&fields=id,parents`,
      { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!moveRes.ok) {
      const err = await moveRes.json().catch(() => ({}));
      res.status(500).json({ error: err?.error?.message || "No se pudo mover el archivo en Drive." });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado moviendo el archivo." });
  }
}
