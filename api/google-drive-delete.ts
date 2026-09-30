/* ============================================================
   Vercel Serverless Function: mueve un archivo de Google Drive
   (un Google Doc creado por la app) a la papelera de Drive.
   No lo borra de forma permanente — así el usuario puede
   recuperarlo desde la papelera de Drive si se equivoca.
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
    if (!fileId) {
      res.status(400).json({ error: "Falta fileId." });
      return;
    }

    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      res.status(400).json({ error: "Google Drive no está conectado." });
      return;
    }

    const trashRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });

    if (!trashRes.ok) {
      // 404 = ya no existe en Drive (alguien lo borró a mano) — para nuestros efectos, ya está "borrado".
      if (trashRes.status === 404) {
        res.status(200).json({ ok: true, alreadyGone: true });
        return;
      }
      const err = await trashRes.json().catch(() => ({}));
      res.status(500).json({ error: err?.error?.message || "No se pudo borrar el archivo en Drive." });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Error inesperado borrando el archivo." });
  }
}
