## Gotenberg Deployment Plan

### 1. Pick a Host
A single small VPS is sufficient for a compliance tool with sporadic report generation. Recommended: **Hetzner CX11** (2 vCPU / 4GB RAM / ~€4.50/mo) or **DigitalOcean Droplet** ($6/mo). Gotenberg needs at least 2GB RAM for Chromium.

### 2. Deploy Gotenberg
Run Gotenberg via Docker on the VPS:

```bash
docker run -d \
  --name gotenberg \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  gotenberg/gotenberg:8
```

This binds to localhost only. Expose it to the internet in step 3.

### 3. Secure It
Do NOT leave port 3000 open to the world. Two options:

**Option A: API Key via reverse proxy (recommended)**
Deploy Caddy or Nginx in front of Gotenberg, require an `X-API-Key` header, and terminate TLS. Keep the origin IP restricted to your edge function egress ranges.

**Option B: Private network only**
If your edge functions can reach a private IP (e.g., via Tailscale, WireGuard, or a VPC), bind Gotenberg to an internal address and skip public exposure entirely.

### 4. Store the Endpoint + Key as Secrets
Add two secrets to the project so the edge function can reach Gotenberg:

- `GOTENBERG_URL` — e.g. `https://pdf.yourdomain.com/forms/chromium/convert/html`
- `GOTENBERG_API_KEY` — the key your reverse proxy checks

### 5. Wire the Edge Function
Modify `supabase/functions/generate-report-pdf/index.ts`:

1. Read `GOTENBERG_URL` and `GOTENBERG_API_KEY` from Deno env.
2. Replace the PDFshift `fetch()` call with a `fetch()` to the Gotenberg endpoint.
3. POST the same HTML string as `files` (multipart/form-data) — Gotenberg accepts raw HTML upload.
4. Return the PDF buffer exactly as the function does today.

No changes needed in the frontend or DOCX path.

### 6. Test
Deploy the updated edge function, then trigger a report generation from the preview. Verify:
- PDF renders correctly
- Metadata/header layout is preserved
- No errors in edge function logs

### 7. Cut Over
Once confirmed working:
- Cancel the PDFshift subscription
- Rotate the `GOTENBERG_API_KEY` if it was ever exposed
- Monitor the VPS for disk/memory usage (Chromium can grow over time; `docker restart` handles this)

### Estimated Monthly Cost
- VPS: ~$5–6
- Bandwidth: negligible for HTML-in / PDF-out
- Total: roughly the same as or less than PDFshift at any meaningful volume, with full data control.