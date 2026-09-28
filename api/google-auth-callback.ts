/* ============================================================
   Vercel Serverless Function: Google redirige aquí tras el
   consentimiento. Cambia el código por tokens, guarda el
   refresh_token (solo accesible con la service role key) y
   vuelve a mandar al usuario a la app.
============================================================ */
import { getBaseUrl, supabaseAdmin } from "./_lib/google.js";

export default async function handler(req: any, res: any) {
  const { code, state, error } = req.query || {};
  const base = getBaseUrl(req);

  if (error || !code || !state) {
    res.writeHead(302, { Location: `${base}/cerebro?google=error` });
    res.end();
    return;
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
      res.writeHead(302, { Location: `${base}/cerebro?google=error` });
      res.end();
      return;
    }

    const admin = supabaseAdmin();
    await admin.from("google_drive_tokens").upsert({
      user_id: String(state),
      refresh_token: tokenData.refresh_token,
      updated_at: new Date().toISOString(),
    });

    res.writeHead(302, { Location: `${base}/cerebro?google=connected` });
    res.end();
  } catch {
    res.writeHead(302, { Location: `${base}/cerebro?google=error` });
    res.end();
  }
}
