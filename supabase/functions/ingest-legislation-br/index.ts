// Ingest Brazilian federal bills via the Câmara dos Deputados Open Data API.
// https://dadosabertos.camara.leg.br — free, no key.
// Portuguese titles & summaries; keyword matcher already covers Portuguese forms loosely.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "br-camara";
const BASE = "https://dadosabertos.camara.leg.br/api/v2";

// Portuguese topic terms layered on top of the English allowlist for cheap pre-filter.
const PT_TERMS = [
  "privacidade", "proteção de dados", "dados pessoais", "inteligência artificial",
  "biometria", "biométric", "cibersegurança", "vigilância", "consentimento",
  "vazamento de dados", "lgpd",
];
function ptMatch(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return PT_TERMS.some((t) => lower.includes(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    // Pull last 90 days of bills, page through.
    const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    let pagina = 1;
    while (pagina <= 5) {
      const url = `${BASE}/proposicoes?siglaTipo=PL&dataApresentacaoInicio=${since}&ordem=DESC&ordenarPor=id&itens=100&pagina=${pagina}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) { reject(counts, undefined, `list_p${pagina}_http_${res.status}`); break; }
      const json = await res.json();
      const dados: any[] = json?.dados ?? [];
      if (!dados.length) break;
      counts.fetched += dados.length;

      for (const it of dados) {
        try {
          const ementa: string = it?.ementa ?? "";
          // Portuguese pre-filter (cheap, on listing).
          if (!ptMatch(ementa)) continue;

          // Fetch detail for full summary + status.
          const dRes = await fetch(`${BASE}/proposicoes/${it.id}`, { headers: { Accept: "application/json" } });
          const detail = dRes.ok ? (await dRes.json())?.dados : null;
          const fullEmenta: string = detail?.ementa ?? ementa;
          const ementaDetalhada: string = detail?.ementaDetalhada ?? "";

          // Confirm with English+PT match.
          const en = isPrivacyRelated(fullEmenta, ementaDetalhada);
          if (!en.match && !ptMatch(fullEmenta + " " + ementaDetalhada)) {
            continue;
          }

          const statusDesc = detail?.statusProposicao?.descricaoTramitacao ??
                             detail?.statusProposicao?.descricaoSituacao ?? "";

          const bill: NormalizedBill = {
            source: SOURCE,
            external_id: `pl-${it.id}`,
            jurisdiction: "Brazil",
            iso2: "BR",
            jurisdiction_slug: "brazil",
            region: "Americas",
            bill_name: `${detail?.siglaTipo ?? "PL"} ${detail?.numero ?? ""}/${detail?.ano ?? ""} — ${fullEmenta.slice(0, 140)}`,
            bill_number: `${detail?.siglaTipo ?? "PL"} ${detail?.numero ?? ""}/${detail?.ano ?? ""}`,
            stage: normalizeStage(statusDesc),
            summary: ementaDetalhada || fullEmenta || null,
            source_url: detail?.urlInteiroTeor ?? `https://www.camara.leg.br/propostas-legislativas/${it.id}`,
            source_name: "Câmara dos Deputados",
            introduced_at: detail?.dataApresentacao?.slice(0, 10) ?? null,
            source_last_action_at: detail?.statusProposicao?.dataHora?.slice(0, 10) ?? null,
            matched_keywords: en.keywords.length ? en.keywords : ["lgpd"],
            raw_payload: { statusDesc },
          };
          const err = validateBill(bill);
          if (err) { reject(counts, fullEmenta, err); continue; }
          await upsertBill(supabase, bill, counts);

          await new Promise((r) => setTimeout(r, 30));
        } catch (e) {
          reject(counts, it?.ementa, `exception:${(e as Error).message}`);
        }
      }
      pagina += 1;
    }

    await markStaleBills(supabase, SOURCE);
    await finishRun(supabase, runId, startedMs, counts, "success");
    return new Response(JSON.stringify({ ok: true, counts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (runId) await finishRun(supabase, runId, startedMs, counts, "failed", msg);
    return new Response(JSON.stringify({ ok: false, error: msg, counts }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
