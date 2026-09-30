/* ============================================================
   Utilidades compartidas por las funciones de integración con
   Google Drive/Docs. Este archivo vive bajo api/_lib, con guion
   bajo, así que Vercel NO lo convierte en una ruta pública.
============================================================ */
import { createClient } from "@supabase/supabase-js";

/**
 * Dominio público y fijo de la app (no depende del host de la petición).
 *
 * Vercel genera, además del dominio de producción, una URL única por cada
 * despliegue (tipo central-life-<hash>-central-life.vercel.app). Si este
 * valor se calculara a partir de los headers de la petición entrante, el
 * redirect_uri que le mandamos a Google cambiaría cada vez que alguien
 * entra por una de esas URLs de despliegue — y Google solo acepta el/los
 * URI(s) exactos registrados en la consola, así que el login fallaría con
 * redirect_uri_mismatch. Por eso lo fijamos aquí: siempre el mismo dominio,
 * el que está registrado en Google Cloud (configurable vía APP_BASE_URL
 * por si el dominio cambia en el futuro, p. ej. un dominio propio).
 */
export function getBaseUrl(_req?: any): string {
  return process.env.APP_BASE_URL || "https://central-life.vercel.app";
}

export function supabaseAdmin() {
  return createClient(
    process.env.VITE_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

/** Identifica al usuario que llama a la función a partir del token de sesión de Supabase (header Authorization: Bearer ...). */
export async function getUserFromRequest(req: any) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const client = createClient(
    process.env.VITE_SUPABASE_URL as string,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/** Cambia el refresh_token guardado por un access_token de Google válido (caduca en ~1h). */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("google_drive_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.refresh_token) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) return null;
  return tokenData.access_token as string;
}

/** Devuelve el id de la carpeta "Apuntes - central-life" en Drive, creándola la primera vez. */
export async function getOrCreateFolderId(userId: string, accessToken: string): Promise<string> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("google_drive_tokens")
    .select("folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.folder_id) return data.folder_id as string;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Apuntes - central-life", mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !folder.id) throw new Error("No se pudo crear la carpeta de Google Drive.");

  await admin.from("google_drive_tokens").update({ folder_id: folder.id }).eq("user_id", userId);
  return folder.id as string;
}
