/* ============================================================
   Vercel Serverless Function: redirige al usuario a la pantalla
   de consentimiento de Google para conectar Drive/Docs.
============================================================ */
import { getBaseUrl } from "./_lib/google.js";

export default function handler(req: any, res: any) {
  const uid = req.query?.uid;
  if (!uid || typeof uid !== "string") {
    res.status(400).send("Falta uid.");
    return;
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(500).send("Falta configurar GOOGLE_CLIENT_ID en el servidor.");
    return;
  }

  const redirectUri = `${getBaseUrl(req)}/api/google-auth-callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
    state: uid,
  });

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
}
