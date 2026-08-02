// Item 340 — corpus repair for enforcement_actions.
//
// SET A: rows flagged review_reason = 'corpus_defect_subject'. Re-extract the
//        controller/subject name FROM THE ROW'S OWN DOCUMENT ONLY.
// SET B: rows with regulator IN ('Unknown','Unknown DPA'). Recover the DPA from
//        the row's own stored page text (GDPRhub title + Authority infobox).
//
// MANDATORY DEGRADATION LAW (CEO-ordered): the model may only copy a name that
// appears verbatim in the source text. No document, or no verbatim match =>
// write nothing and flag the residue so it stays measurable. Never derive a
// subject from the title, the URL, or general knowledge.
//
// Batched (~50), resumable by id cursor, idempotent: repaired/flagged rows drop
// out of the selection predicate, so a re-run is a no-op.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const MODEL = "openai/gpt-5.6-sol";
const MIN_DOC_CHARS = 200;
const MAX_MODEL_DOC_CHARS = 24_000;

// Mirrors verification-scan's precheck exactly (Item 334).
const SUBJECT_PLACEHOLDERS = new Set<string>([
  "company", "controller", "processor", "respondent", "defendant",
  "entity", "organization", "organisation", "data controller",
  "data processor", "the company", "the controller", "the respondent",
  "unknown", "redacted", "anonymous", "n/a", "na", "unspecified",
  "tbd", "tba", "placeholder",
]);

function isPlaceholderSubject(subject: string | null | undefined): boolean {
  if (!subject) return true;
  const n = subject.trim().toLowerCase();
  if (n.length < 3) return true;
  return SUBJECT_PLACEHOLDERS.has(n);
}

// Fetch-failure / bot-wall captures masquerading as documents.
function isJunkCapture(text: string): boolean {
  const head = text.slice(0, 400).toLowerCase();
  return /making sure you're not a bot|oh noes!|target url ret|403 forbidden|access denied|just a moment/.test(head);
}

function normForMatch(s: string): string {
  return s.toLowerCase().replace(/[\s\u00a0]+/g, " ").replace(/[’‘]/g, "'").trim();
}

async function pickDocument(row: any): Promise<{ text: string; origin: string } | null> {
  const candidates: Array<[string, string | null]> = [
    ["source_document_text", row.source_document_text ?? null],
    ["raw_text", row.raw_text ?? null],
    ["legacy_summary_text", row.legacy_summary_text ?? null],
  ];
  for (const [origin, text] of candidates) {
    if (text && text.length >= MIN_DOC_CHARS && !isJunkCapture(text)) return { text, origin };
  }
  const url = row.source_url as string | null;
  if (url) {
    const { data } = await sb
      .from("source_document_cache")
      .select("content_text")
      .eq("source_url", url)
      .maybeSingle();
    const t = (data as any)?.content_text as string | undefined;
    if (t && t.length >= MIN_DOC_CHARS && !isJunkCapture(t)) return { text: t, origin: "source_document_cache" };
  }
  return null;
}

async function extractSubject(doc: string): Promise<string | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "You extract the name of the controller/processor/respondent that an enforcement decision is against. " +
            "COPY RULE: you may only output a string that appears VERBATIM in the supplied document. " +
            "If the document does not state a named entity (e.g. it is anonymised, redacted, or refers only to 'the controller'), " +
            'output exactly NONE. Never infer from a title, URL, case number or your own knowledge. ' +
            "Output only the name, with no quotes, labels or commentary.",
        },
        { role: "user", content: `DOCUMENT:\n${doc.slice(0, MAX_MODEL_DOC_CHARS)}\n\nNAME:` },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const raw = (json?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw || /^none$/i.test(raw)) return null;
  return raw.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

// ---------------------------------------------------------------- SET A

async function runSetA(
  batchSize: number,
  startAfterId: string | null,
  dryRun: boolean,
  // ITEM 365 LEG 2 — after the refetch campaign lands documents, the same Set-A
  // re-extraction is re-run over the rows previously closed as
  // `corpus_defect_subject_unrepairable`, restricted to rows that NOW carry a
  // document. Degradation law unchanged: extract verbatim or flag, never invent.
  reviewReason = "corpus_defect_subject",
  requireDocument = false,
) {
  let q = sb
    .from("enforcement_actions")
    .select(
      "id, subject, source_url, source_document_text, raw_text, legacy_summary_text",
      { count: "exact" },
    )
    .eq("review_reason", reviewReason)
    .order("id", { ascending: true })
    .limit(batchSize);
  if (requireDocument) {
    q = q.not("source_document_text", "is", null);
  }
  if (startAfterId) q = q.gt("id", startAfterId);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  let repaired = 0, cleared_precheck = 0, unrepairable = 0, no_document = 0, no_verbatim = 0;
  const samples: any[] = [];

  for (const row of rows) {
    // (1) Subject already good (flagged by an older precheck pass): just re-run
    // the precheck and clear.
    if (!isPlaceholderSubject(row.subject)) {
      if (!dryRun) {
        await sb.from("enforcement_actions").update({
          review_reason: null,
          verification_status: "unverified",
          verification_last_run_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
      cleared_precheck++;
      samples.push({ id: row.id, outcome: "cleared_precheck", subject: row.subject, origin: "existing" });
      continue;
    }

    const doc = await pickDocument(row);
    if (!doc) {
      if (!dryRun) {
        await sb.from("enforcement_actions").update({
          review_reason: "corpus_defect_subject_unrepairable",
          verification_last_run_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
      unrepairable++; no_document++;
      samples.push({ id: row.id, outcome: "unrepairable", reason: "no_document", subject: row.subject });
      continue;
    }

    let name: string | null = null;
    try {
      name = await extractSubject(doc.text);
    } catch (e) {
      // Transient gateway failure: leave the row flagged as-is so the next run
      // retries it (idempotency preserved — no state written).
      samples.push({ id: row.id, outcome: "deferred", reason: String(e).slice(0, 160) });
      continue;
    }

    const verbatim = name && normForMatch(doc.text).includes(normForMatch(name));
    if (!name || !verbatim || isPlaceholderSubject(name)) {
      if (!dryRun) {
        await sb.from("enforcement_actions").update({
          review_reason: "corpus_defect_subject_unrepairable",
          verification_last_run_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
      unrepairable++; if (name) no_verbatim++; else no_document += 0;
      samples.push({
        id: row.id,
        outcome: "unrepairable",
        reason: !name ? "document_states_no_name" : (isPlaceholderSubject(name) ? "extracted_placeholder" : "not_verbatim"),
        candidate: name,
        origin: doc.origin,
      });
      continue;
    }

    if (!dryRun) {
      await sb.from("enforcement_actions").update({
        subject: name,
        review_reason: null,
        verification_status: "unverified",
        verification_deterministic_pass: null,
        memo_eligible: false,
        verification_last_run_at: new Date().toISOString(),
      }).eq("id", row.id);
      await sb.from("verification_results").insert({
        enforcement_action_id: row.id,
        check_name: "subject_repair_from_source",
        check_category: "deterministic",
        verdict: "pass",
        evidence_text: `subject "${name}" copied verbatim from ${doc.origin}`,
        ran_at: new Date().toISOString(),
      });
    }
    repaired++;
    samples.push({ id: row.id, outcome: "repaired", subject: name, origin: doc.origin });
  }

  return {
    set: "A",
    scanned: rows.length,
    repaired,
    cleared_precheck,
    unrepairable,
    unrepairable_breakdown: { no_document, extracted_not_verbatim: no_verbatim },
    remaining_before_batch: count ?? 0,
    next_cursor: rows.length ? rows[rows.length - 1].id : null,
    samples,
  };
}

// ---------------------------------------------------------------- SET B

// "| Authority: | [APD/GBA (Belgium)](...)" or "Title: APD/GBA (Belgium) - 97/2026"
function extractAuthority(text: string): { raw: string; where: string } | null {
  const infobox = text.match(/Authority:\s*\|?\s*\[?([^\]\|\n]+?)\]?\s*(?:\(https?:[^)]*\))?\s*(?:\||\n)/i);
  if (infobox?.[1]) {
    const v = infobox[1].trim();
    if (v && !/^n\/?a$/i.test(v)) return { raw: v, where: "infobox" };
  }
  const title = text.match(/^\s*Title:\s*(.+)$/im);
  if (title?.[1]) {
    const t = title[1].trim();
    const m = t.match(/^([^-–]+?)\s+[-–]\s+/);
    const v = (m?.[1] ?? "").trim();
    if (v && !/making sure|oh noes/i.test(v)) return { raw: v, where: "page_title" };
  }

  return null;
}

function bareAbbrev(authority: string): string {
  return authority.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function normReg(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Item 336 (e) discipline: containment only when the shorter side is >= 4 chars.
function regulatorsMatch(a: string, b: string): boolean {
  const x = normReg(a), y = normReg(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (Math.min(x.length, y.length) < 4) return false;
  return x.includes(y) || y.includes(x);
}

// Reads DPA_Abbrevation / Court_Abbrevation out of the GDPRhub page that this
// row's source_url points at. Deterministic infobox read, no model involved.
async function authorityFromGdprhubApi(
  sourceUrl: string | null,
): Promise<{ raw: string; where: string } | null> {
  if (!sourceUrl || !/gdprhub\.eu/i.test(sourceUrl)) return null;
  const m = sourceUrl.match(/[?&]title=([^&]+)/);
  if (!m) return null;
  const title = decodeURIComponent(m[1]).replace(/_/g, " ");
  const api = `https://gdprhub.eu/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(api, { headers: { "User-Agent": "enduserprivacy-corpus-repair/1.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    const pages = json?.query?.pages ?? {};
    const page: any = Object.values(pages)[0];
    const wikitext: string = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";
    if (!wikitext) return null;
    const dpa = wikitext.match(/\|\s*DPA_Abbrevation\s*=\s*([^\n|]+)/i)
      ?? wikitext.match(/\|\s*DPA_Abbreviation\s*=\s*([^\n|]+)/i);
    if (dpa?.[1]?.trim()) return { raw: dpa[1].trim(), where: "gdprhub_api_dpa_infobox" };
    const court = wikitext.match(/\|\s*Court_Abbrevation\s*=\s*([^\n|]+)/i)
      ?? wikitext.match(/\|\s*Court_Abbreviation\s*=\s*([^\n|]+)/i);
    if (court?.[1]?.trim()) return { raw: court[1].trim(), where: "gdprhub_api_court_infobox" };
    const withCountry = wikitext.match(/\|\s*(?:DPA|Court)_With_Country\s*=\s*([^\n|]+)/i);
    if (withCountry?.[1]?.trim()) return { raw: withCountry[1].trim(), where: "gdprhub_api_with_country" };
    return null;
  } catch (_e) {
    return null;
  }
}

async function knownRegulators(): Promise<string[]> {
  const { data } = await sb
    .from("enforcement_actions")
    .select("regulator")
    .not("regulator", "in", '("Unknown","Unknown DPA")')
    .limit(5000);
  return Array.from(new Set((data ?? []).map((r: any) => r.regulator as string).filter(Boolean)));
}


async function runSetB(batchSize: number, startAfterId: string | null, dryRun: boolean) {
  let q = sb
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, review_reason, source_url, raw_text, source_document_text, legacy_summary_text", { count: "exact" })
    .in("regulator", ["Unknown", "Unknown DPA"])
    .order("id", { ascending: true })
    .limit(batchSize);
  if (startAfterId) q = q.gt("id", startAfterId);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const known = await knownRegulators();

  let repaired = 0, unrecoverable = 0, normalised = 0;
  const samples: any[] = [];

  for (const row of rows) {
    const text: string = row.raw_text ?? row.source_document_text ?? row.legacy_summary_text ?? "";
    let found = text ? extractAuthority(text) : null;
    // Most stored GDPRhub captures are Anubis bot-wall pages, not the decision.
    // Re-read the ROW'S OWN source page through the GDPRhub MediaWiki API and
    // take the authority/court straight out of the infobox. Still the row's own
    // source — no inference, no general knowledge.
    if (!found) {
      found = await authorityFromGdprhubApi(row.source_url as string | null);
    }

    if (!found) {
      if (!dryRun) {
        await sb.from("enforcement_actions").update({
          review_reason: "corpus_defect_regulator_unrecoverable",
          verification_status: "requires_review",
          memo_eligible: false,
          verification_last_run_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
      unrecoverable++;
      samples.push({ id: row.id, outcome: "unrecoverable", url: row.source_url });
      continue;
    }
    const abbrev = bareAbbrev(found.raw);
    const match = known.find((k) => regulatorsMatch(k, abbrev));
    const finalName = match ?? abbrev;
    if (match && match !== abbrev) normalised++;

    if (!dryRun) {
      // Only clear a regulator-scoped flag. A row can also be carrying a
      // SUBJECT defect flag; repairing the regulator must never silently drop
      // that, or the Set A residue stops being measurable.
      const keepsSubjectFlag = typeof row.review_reason === "string" &&
        row.review_reason.startsWith("corpus_defect_subject");
      await sb.from("enforcement_actions").update({
        regulator: finalName,
        review_reason: keepsSubjectFlag ? row.review_reason : null,
        verification_last_run_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
    repaired++;
    samples.push({
      id: row.id,
      outcome: "repaired",
      regulator: finalName,
      extracted: abbrev,
      normalised_to_corpus: Boolean(match && match !== abbrev),
      source: found.where,
    });
  }

  return {
    set: "B",
    scanned: rows.length,
    repaired,
    normalised_to_existing_naming: normalised,
    unrecoverable,
    remaining_before_batch: count ?? 0,
    next_cursor: rows.length ? rows[rows.length - 1].id : null,
    samples,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const set = String(body.set ?? "A").toUpperCase();
    const batchSize = Math.min(Number(body.batch_size ?? 50), 100);
    const startAfterId = body.start_after_id ?? null;
    const dryRun = Boolean(body.dry_run);
    // Set "A2" (Item 365): re-extraction pass over the previously unrepairable
    // rows whose documents arrived in the Leg-2 refetch campaign.
    const out = set === "B"
      ? await runSetB(batchSize, startAfterId, dryRun)
      : set === "A2"
        ? await runSetA(batchSize, startAfterId, dryRun, "corpus_defect_subject_unrepairable", true)
        : await runSetA(batchSize, startAfterId, dryRun);

    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, ...out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
