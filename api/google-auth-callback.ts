/* ============================================================
   Vercel Serverless Function: Google redirige aquí tras el
   consentimiento. Cambia el código por tokens, guarda el
   refresh_token (solo accesible con la service role key) y
   vuelve a mandar al usuario a la app.
============================================================ */
import { getBaseUrl, supabaseAdmin } from "./_lib/google";

/** Redirige mostrando un motivo de error corto y no sensible, y lo deja en los logs de Vercel. */
function fail(res: any, base: string, reason: string, detail?: unknown) {
  console.error("[google-auth-callback]", reason, detail ?? "");
  res.writeHead(302, { Location: `${base}/cerebro?google=error&reason=${encodeURIComponent(reason)}` });
  res.end();
}

export default async function handler(req: any, res: any) {
  const { code, state, error } = req.query || {};
  const base = getBaseUrl(req);

  if (error) return fail(res, base, "oauth_denied", error);
  if (!code || !state) return fail(res, base, "missing_code_or_state");

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return fail(res, base, "missing_server_credentials");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: `${base}/api/google-auth-callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenData.refresh_token) {
      // tokenData.error es un código estándar de OAuth (invalid_client, invalid_grant,
      // redirect_uri_mismatch...), no contiene secretos, así que es seguro reenviarlo.
      return fail(
        res,
        base,
        tokenData?.error ? `token_${tokenData.error}` : "no_refresh_token",
        tokenData
      );
    }

    const admin = supabaseAdmin();
    const { error: dbError } = await admin.from("google_drive_tokens").upsert({
      user_id: String(state),
      refresh_token: tokenData.refresh_token,
      updated_at: new Date().toISOString(),
    });
    if (dbError) return fail(res, base, "db_upsert_failed", dbError);

    res.writeHead(302, { Location: `${base}/cerebro?google=connected` });
    res.end();
  } catch (e) {
    fail(res, base, "exception", e);
  }
}
