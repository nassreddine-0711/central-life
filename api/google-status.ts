/* ============================================================
   Vercel Serverless Function: indica si el usuario tiene Google
   Drive conectado, sin exponer el refresh_token al cliente.
============================================================ */
import { getUserFromRequest, supabaseAdmin } from "./_lib/google.js";

export default async function handler(req: any, res: any) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("google_drive_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  res.status(200).json({ connected: !!data });
}
