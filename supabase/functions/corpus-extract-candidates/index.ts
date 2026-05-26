// corpus-extract-candidates
// Deterministic Tier-A/B candidate extractor for the enforcement_actions corpus.
// Idempotent. Run repeatedly with paginated start_after_id until processed == 0.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Row = {
  id: string;
  regulator: string | null;
  jurisdiction: string | null;
  subject: string | null;
  law: string | null;
  key_compliance_failure: string | null;
  preventive_measures: string | null;
  regulatory_family: string[] | null;
  statutory_provisions_extraction_method: string | null;
};

// ── Extractors ────────────────────────────────────────────────────────────────

function extractStatutoryProvisions(
  text: string,
  families: string[],
): { provisions: string[]; method: string } {
  const out = new Set<string>();
  const fam = new Set(families ?? []);

  const run = (re: RegExp, fmt: (m: RegExpExecArray) => string) => {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = r.exec(text)) !== null) out.add(fmt(m));
  };

  if (fam.has("gdpr") || fam.has("uk_gdpr") || families.length === 0) {
    run(/\bArticle\s+(\d+)(?:\((\d+)\))?(?:\(([a-z])\))?\b/gi, (m) => {
      let s = `Art. ${m[1]}`;
      if (m[2]) s += `(${m[2]})`;
      if (m[3]) s += `(${m[3]})`;
      return s;
    });
    run(/\bArt\.\s*(\d+)/gi, (m) => `Art. ${m[1]}`);
  }
  if (fam.has("ccpa")) {
    run(/§\s*1798\.(\d+(?:\.\d+)?)/g, (m) => `§ 1798.${m[1]}`);
    run(/Section\s+1798\.(\d+)/gi, (m) => `§ 1798.${m[1]}`);
  }
  if (fam.has("bipa")) {
    run(/Section\s+(15|20)(?:\(([a-z])\))?/gi, (m) =>
      m[2] ? `BIPA § ${m[1]}(${m[2]})` : `BIPA § ${m[1]}`);
    run(/740\s+ILCS\s+14\/(\d+)/gi, (m) => `740 ILCS 14/${m[1]}`);
  }
  if (fam.has("tdpsa")) {
    run(/§\s*541\.(\d+)/g, (m) => `§ 541.${m[1]}`);
    run(/Section\s+541\.(\d+)/gi, (m) => `§ 541.${m[1]}`);
  }

  const provisions = Array.from(out);
  return {
    provisions,
    method: provisions.length > 0 ? "regex_high_confidence" : "no_pattern_found",
  };
}

function extractDisposition(text: string): { value: string | null; method: string } {
  const t = text.toLowerCase();
  const hits: string[] = [];
  if (t.includes("stipulated judgment") || t.includes("consent decree")) hits.push("consent_order");
  if (t.includes("settlement")) hits.push("settlement");
  if (t.includes("administrative fine")) hits.push("administrative_fine");
  if (t.includes("decision") && t.includes("final")) hits.push("final_decision");
  if (t.includes("civil penalty")) hits.push("civil_penalty");
  if (t.includes("injunction") || t.includes("injunctive relief")) hits.push("injunctive_relief");

  const priority = [
    "consent_order", "settlement", "administrative_fine",
    "final_decision", "civil_penalty", "injunctive_relief",
  ];
  for (const p of priority) if (hits.includes(p)) return { value: p, method: "regex_low_confidence" };
  return { value: null, method: "no_pattern_found" };
}

function extractAppealStatus(text: string): { value: string | null; method: string } {
  const t = text.toLowerCase();
  if (t.includes("non-appealable") || t.includes("final and non-appealable"))
    return { value: "final", method: "regex_low_confidence" };
  if (t.includes("subject to appeal") || t.includes("appeal pending"))
    return { value: "appeal_pending", method: "regex_low_confidence" };
  if (t.includes("affirmed on appeal"))
    return { value: "affirmed", method: "regex_low_confidence" };
  if (t.includes("vacated") || t.includes("set aside"))
    return { value: "vacated", method: "regex_low_confidence" };
  if (t.includes("remanded"))
    return { value: "remanded", method: "regex_low_confidence" };
  return { value: null, method: "no_pattern_found" };
}

function parseMagnitude(num: string, suffix?: string | null): number {
  let n = parseFloat(num.replace(/,/g, ""));
  if (!isFinite(n)) return NaN;
  if (suffix && /million|^m$/i.test(suffix)) n *= 1_000_000;
  return n;
}

function extractCurrencyAmount(text: string): { currency: string | null; amount: number | null } {
  const candidates: { currency: string; amount: number }[] = [];
  const push = (cur: string, n: number) => { if (isFinite(n)) candidates.push({ currency: cur, amount: n }); };

  for (const m of text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)\s*(million|m\b)?/gi))
    push("USD", parseMagnitude(m[1], m[2]));
  for (const m of text.matchAll(/€\s*([\d,]+(?:\.\d+)?)\s*(million|m\b)?/gi))
    push("EUR", parseMagnitude(m[1], m[2]));
  for (const m of text.matchAll(/£\s*([\d,]+(?:\.\d+)?)\s*(million|m\b)?/gi))
    push("GBP", parseMagnitude(m[1], m[2]));
  for (const m of text.matchAll(/\b(PLN|CZK|HUF|NOK|SEK|DKK)\s*([\d,]+(?:\.\d+)?)/g))
    push(m[1], parseMagnitude(m[2]));
  for (const m of text.matchAll(/\b([\d,]+(?:\.\d+)?)\s*(z[lł]otych|z[lł]oty)\b/gi))
    push("PLN", parseMagnitude(m[1]));

  if (candidates.length === 0) return { currency: null, amount: null };
  candidates.sort((a, b) => b.amount - a.amount);
  return { currency: candidates[0].currency, amount: candidates[0].amount };
}

function extractCaseReference(
  text: string,
  regulator: string | null,
): { value: string | null; method: string } {
  const r = (regulator || "").toLowerCase();
  let m: RegExpMatchArray | null;

  if (r.includes("cnil")) {
    if ((m = text.match(/SAN[-\s]?(\d{4})[-\s]?(\d{3})/)))
      return { value: `SAN-${m[1]}-${m[2]}`, method: "regex_high_confidence" };
    if ((m = text.match(/D[ée]lib[ée]ration\s+n[°o]?\s*([\d-]+)/i)))
      return { value: `Délibération ${m[1]}`, method: "regex_high_confidence" };
  }
  if (r.includes("aepd")) {
    if ((m = text.match(/PS\/(\d{5,6})\/(\d{4})/)))
      return { value: `PS/${m[1]}/${m[2]}`, method: "regex_high_confidence" };
    if ((m = text.match(/Procedimiento\s+(\w+\/\d+\/\d+)/i)))
      return { value: `Procedimiento ${m[1]}`, method: "regex_high_confidence" };
  }
  if (r.includes("ico")) {
    if ((m = text.match(/Penalty\s+Notice\s+([A-Z]{3}\d+)/i)))
      return { value: m[1], method: "regex_high_confidence" };
    if ((m = text.match(/\bENF\d+\b/)))
      return { value: m[0], method: "regex_high_confidence" };
  }
  if (r.includes("uodo")) {
    if ((m = text.match(/ZSPR\.([\d.]+)\.(\d{4})/)))
      return { value: `ZSPR.${m[1]}.${m[2]}`, method: "regex_high_confidence" };
  }
  if (r.includes("garante")) {
    if ((m = text.match(/Provvedimento\s+n\.\s*(\d+\/\d{4})/i)))
      return { value: `Provvedimento ${m[1]}`, method: "regex_high_confidence" };
  }
  if (r.includes("california") || r.includes("cppa")) {
    return { value: null, method: "pattern_per_regulator" };
  }
  return { value: null, method: "no_pattern_found" };
}

function extractSector(subject: string): { value: string | null; method: string } {
  const s = subject.toLowerCase();
  if (/\bbank(ing)?\b/.test(s)) return { value: "financial_services", method: "regex_high_confidence" };
  if (/\b(hospital|health system|clinic)\b/.test(s)) return { value: "healthcare", method: "regex_high_confidence" };
  if (/\b(airline|airways)\b/.test(s)) return { value: "aviation", method: "regex_high_confidence" };
  if (/\b(telecom|telecommunications|mobile operator)\b/.test(s)) return { value: "telecommunications", method: "regex_high_confidence" };
  if (/\binsurance\b/.test(s)) return { value: "insurance", method: "regex_high_confidence" };
  if (/\b(school|university|academy)\b/.test(s)) return { value: "education", method: "regex_high_confidence" };
  return { value: null, method: "no_pattern_found" };
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const batchSize = Math.min(Math.max(parseInt(body.batch_size ?? 100, 10) || 100, 1), 500);
  const startAfterId: string | null = body.start_after_id ?? null;
  const forceReextract: boolean = body.force_reextract === true;

  // Page by id ascending so the caller can resume with last_id.
  let q = supabase
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, subject, law, key_compliance_failure, preventive_measures, regulatory_family, statutory_provisions_extraction_method")
    .order("id", { ascending: true })
    .limit(batchSize);
  if (startAfterId) q = q.gt("id", startAfterId);
  if (!forceReextract) q = q.or("statutory_provisions_extraction_method.is.null,statutory_provisions_extraction_method.eq.none");

  const { data: rows, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const summary = {
    statutory_provisions_high_confidence: 0,
    statutory_provisions_no_pattern: 0,
    disposition_set: 0,
    appeal_status_set: 0,
    original_amount_set: 0,
    case_reference_set: 0,
    sector_set: 0,
    errors: 0,
  };

  let lastId: string | null = startAfterId;

  for (const row of (rows ?? []) as Row[]) {
    lastId = row.id;
    try {
      const provisionsText =
        `${row.key_compliance_failure ?? ""} ${row.preventive_measures ?? ""} ${row.law ?? ""}`;
      const dispoText = `${row.key_compliance_failure ?? ""} ${row.subject ?? ""}`;
      const moneyText = `${row.subject ?? ""} ${row.key_compliance_failure ?? ""}`;
      const refText = `${row.subject ?? ""} ${row.key_compliance_failure ?? ""} ${row.preventive_measures ?? ""}`;

      const sp = extractStatutoryProvisions(provisionsText, row.regulatory_family ?? []);
      const dispo = extractDisposition(dispoText);
      const appeal = extractAppealStatus(dispoText);
      const money = extractCurrencyAmount(moneyText);
      const caseRef = extractCaseReference(refText, row.regulator);
      const sector = extractSector(row.subject ?? "");

      const update: Record<string, unknown> = {
        statutory_provisions: sp.provisions,
        statutory_provisions_extraction_method: sp.method,
        disposition_type_extraction_method: dispo.method,
        appeal_status_extraction_method: appeal.method,
        case_reference_extraction_method: caseRef.method,
        sector_extraction_method: sector.method,
      };
      if (dispo.value) update.disposition_type = dispo.value;
      if (appeal.value) update.appeal_status = appeal.value;
      if (money.currency && money.amount != null) {
        update.original_currency = money.currency;
        update.original_amount = money.amount;
      }
      if (caseRef.value) update.case_reference = caseRef.value;
      if (sector.value) update.sector = sector.value;

      const { error: upErr } = await supabase
        .from("enforcement_actions")
        .update(update)
        .eq("id", row.id);
      if (upErr) throw upErr;

      if (sp.method === "regex_high_confidence") summary.statutory_provisions_high_confidence++;
      else summary.statutory_provisions_no_pattern++;
      if (dispo.value) summary.disposition_set++;
      if (appeal.value) summary.appeal_status_set++;
      if (money.amount != null) summary.original_amount_set++;
      if (caseRef.value) summary.case_reference_set++;
      if (sector.value) summary.sector_set++;
    } catch (e) {
      summary.errors++;
      await supabase.from("corpus_extraction_errors").insert({
        enforcement_action_id: row.id,
        stage: "extract",
        error_message: (e as Error).message ?? String(e),
        details: null,
      });
    }
  }

  return new Response(JSON.stringify({
    processed: rows?.length ?? 0,
    last_id: lastId,
    extraction_summary: summary,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
