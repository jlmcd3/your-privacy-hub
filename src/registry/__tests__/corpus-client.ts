// ITEM 371 — shared test helper: load the approved cyber provision rows from
// the live corpus over the Data API and expose them through a minimal client
// shaped like the one `resolveProvisionForRender` expects.
//
// Returns null when the corpus is unreachable (offline sandbox) so callers can
// skip; corpus-pin is a CI/dev-only guard.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tvksbtrelpzhbyeutzgp.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

export const CYBER_KEYS = [
  "cppa-7120",
  "cppa-7121",
  "cppa-7122",
  "cppa-7123",
  "cppa-7124",
] as const;

export interface ProvisionRow {
  key: string;
  citation: string;
  status: string;
  verbatim_excerpt: string | null;
  plain_requirements: unknown[] | null;
}

export async function loadCyberProvisionRows(): Promise<Record<string, ProvisionRow> | null> {
  if (!SUPABASE_KEY) return null;
  const url =
    `${SUPABASE_URL}/rest/v1/provision_texts` +
    `?select=key,citation,status,verbatim_excerpt,plain_requirements` +
    `&key=in.(${CYBER_KEYS.join(",")})`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as ProvisionRow[];
    if (!Array.isArray(rows) || rows.length !== CYBER_KEYS.length) return null;
    const out: Record<string, ProvisionRow> = {};
    for (const r of rows) out[r.key] = r;
    return out;
  } catch {
    return null;
  }
}

/** Minimal `.from().select().eq().maybeSingle()` / `.upsert()` stub over rows. */
export function makeCorpusProvisionClient(rows: Record<string, ProvisionRow>) {
  return {
    from(_table: string) {
      let wantedKey: string | null = null;
      const builder = {
        select: () => builder,
        eq: (_col: string, val: string) => {
          wantedKey = val;
          return builder;
        },
        maybeSingle: async () => ({ data: wantedKey ? rows[wantedKey] ?? null : null }),
        upsert: async () => ({ data: null, error: null }),
      };
      return builder;
    },
  };
}
