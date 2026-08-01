// Shared CORS helper — reflects an origin allowlist rather than "*".
// Adopt in intentionally-public edge functions now; roll out to the rest
// post-launch (defense-in-depth — CORS is browser-only, JWT auth is the
// real boundary).

const ALLOWED_ORIGINS = new Set<string>([
  "https://enduserprivacy.com",
  "https://www.enduserprivacy.com",
  "https://enduserprivacy.lovable.app",
]);

// Preview origins from Lovable (id-preview--*.lovable.app) are allowed by pattern.
const PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow =
    ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN_RE.test(origin) ? origin : "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

export function corsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: corsHeadersFor(req) });
}
