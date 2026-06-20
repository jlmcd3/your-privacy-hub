// Derive a user's compliance obligations on read from their own artifacts.
// Statutory deadlines and recommended cadences are clearly distinguished.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  addDays,
  daysUntil,
  euNoticeRefreshDate,
  obligationId,
  severityFor,
  type Obligation,
} from "./derive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const requestedClientId: string | undefined = body?.client_id;

    // Resolve caller's client ids
    const { data: clientRows } = await admin
      .from("clients")
      .select("id")
      .eq("owner_id", user.id);
    const allClientIds: string[] = (clientRows || []).map((c: any) => c.id);
    let scopedClientIds: string[] = allClientIds;
    if (requestedClientId) {
      if (!allClientIds.includes(requestedClientId)) {
        return new Response(JSON.stringify({ error: "Client not accessible" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      scopedClientIds = [requestedClientId];
    }
    const clientIdsForQuery = scopedClientIds.length ? scopedClientIds : ["00000000-0000-0000-0000-000000000000"];

    const obligations: Obligation[] = [];

    // a) REGISTRATION RENEWALS
    try {
      let q = admin
        .from("registration_orders")
        .select("id, next_renewal_at, jurisdictions, client_id")
        .eq("user_id", user.id)
        .not("next_renewal_at", "is", null);
      if (requestedClientId) q = q.eq("client_id", requestedClientId);
      const { data } = await q;
      for (const r of (data as any[]) || []) {
        if (!r.next_renewal_at) continue;
        const due = new Date(r.next_renewal_at).toISOString();
        const d = daysUntil(due);
        const count = Array.isArray(r.jurisdictions) ? r.jurisdictions.length : 0;
        obligations.push({
          id: obligationId("registration_renewal", "registration_orders", r.id, due),
          kind: "registration_renewal",
          source_table: "registration_orders",
          source_id: r.id,
          title: `Registration renewal — ${count} jurisdiction${count === 1 ? "" : "s"}`,
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "Renewal period set by each authority (see your filing documents)",
          basis_type: "statutory",
          source_route: "/registration-manager/my-filings",
        });
      }
    } catch (e) { console.warn("[obligations] registration error:", (e as Error).message); }

    // b) CPPA TRIENNIAL REVIEW
    try {
      let q = admin
        .from("cppa_assessments")
        .select("id, report_data, client_id")
        .eq("user_id", user.id)
        .eq("module", "risk_assessment")
        .not("report_data", "is", null);
      if (requestedClientId) q = q.eq("client_id", requestedClientId);
      const { data } = await q;
      for (const r of (data as any[]) || []) {
        const rd: any = r.report_data || {};
        const dueRaw: string | undefined =
          rd?.sec_10_governance?.triennial_review_date || rd?.next_review_date;
        if (!dueRaw) continue;
        const due = new Date(dueRaw).toISOString();
        const d = daysUntil(due);
        obligations.push({
          id: obligationId("cppa_triennial", "cppa_assessments", r.id, due),
          kind: "cppa_triennial",
          source_table: "cppa_assessments",
          source_id: r.id,
          title: "CPPA risk assessment review",
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "Cal. Code Regs. § 7155(a) — review at least once every three years",
          basis_type: "statutory",
          source_route: `/cppa-risk-assessment/result/${r.id}`,
        });
      }
    } catch (e) { console.warn("[obligations] cppa error:", (e as Error).message); }

    // c) EU NOTICE REFRESH (client-keyed)
    try {
      const { data } = await admin
        .from("eu_notice_documents")
        .select("id, client_id, is_current, is_combined, generated_at")
        .in("client_id", clientIdsForQuery);
      const byClient = new Map<string, any[]>();
      for (const d of (data as any[]) || []) {
        if (!byClient.has(d.client_id)) byClient.set(d.client_id, []);
        byClient.get(d.client_id)!.push(d);
      }
      for (const [cid, docs] of byClient) {
        const due = euNoticeRefreshDate(docs);
        if (!due) continue;
        // Use earliest doc id as source_id for stability
        const eligible = docs.filter((x) => x.is_current && !x.is_combined && x.generated_at);
        const earliest = eligible.sort((a, b) =>
          new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
        )[0];
        const d = daysUntil(due);
        obligations.push({
          id: obligationId("eu_notice_refresh", "eu_notice_documents", earliest.id, due),
          kind: "eu_notice_refresh",
          source_table: "eu_notice_documents",
          source_id: earliest.id,
          title: "EU/Global privacy notice review",
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "Good practice — annual review (not a statutory deadline)",
          basis_type: "recommended",
          source_route: "/eu-notices",
        });
      }
    } catch (e) { console.warn("[obligations] eu_notice error:", (e as Error).message); }

    // d) US NOTICE REFRESH (client-keyed)
    try {
      const { data } = await admin
        .from("us_notice_sessions")
        .select("id, client_id, completed_at")
        .in("client_id", clientIdsForQuery)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      const seenClients = new Set<string>();
      for (const r of (data as any[]) || []) {
        if (seenClients.has(r.client_id)) continue;
        seenClients.add(r.client_id);
        const due = addDays(r.completed_at, 365);
        const d = daysUntil(due);
        obligations.push({
          id: obligationId("us_notice_refresh", "us_notice_sessions", r.id, due),
          kind: "us_notice_refresh",
          source_table: "us_notice_sessions",
          source_id: r.id,
          title: "US privacy notice review",
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "Good practice — annual review; several state laws require notices to be kept current",
          basis_type: "recommended",
          source_route: "/us-notices",
        });
      }
    } catch (e) { console.warn("[obligations] us_notice error:", (e as Error).message); }

    // e) ASSESSMENT REVIEWS — latest row per tool
    const reviewSpecs: Array<{
      table: string; kind: string; titleSlug: string; route: (id: string) => string;
    }> = [
      { table: "li_assessments", kind: "lia_review", titleSlug: "Legitimate Interest Assessment", route: (id) => `/li-assessment/result/${id}` },
      { table: "dpia_frameworks", kind: "dpia_review", titleSlug: "Impact Assessment Builder", route: (id) => `/dpia-framework/result/${id}` },
      { table: "governance_assessments", kind: "governance_review", titleSlug: "Governance Assessment", route: (id) => `/governance-assessment/result/${id}` },
    ];
    for (const spec of reviewSpecs) {
      try {
        let q = admin
          .from(spec.table)
          .select("id, created_at, client_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (requestedClientId) q = q.eq("client_id", requestedClientId);
        const { data } = await q;
        const r = (data as any[])?.[0];
        if (!r?.created_at) continue;
        const due = addDays(r.created_at, 365);
        const d = daysUntil(due);
        obligations.push({
          id: obligationId(spec.kind, spec.table, r.id, due),
          kind: spec.kind,
          source_table: spec.table,
          source_id: r.id,
          title: `${spec.titleSlug} reassessment`,
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "Good practice — annual reassessment (not a statutory deadline)",
          basis_type: "recommended",
          source_route: spec.route(r.id),
        });
      } catch (e) { console.warn(`[obligations] ${spec.table} error:`, (e as Error).message); }
    }

    // f) ROPA REFRESH — latest generated row per client
    try {
      const { data } = await admin
        .from("ropa_sessions")
        .select("id, client_id, completed_at, status")
        .in("client_id", clientIdsForQuery)
        .eq("status", "generated")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      const seenClients = new Set<string>();
      for (const r of (data as any[]) || []) {
        if (seenClients.has(r.client_id)) continue;
        seenClients.add(r.client_id);
        const due = addDays(r.completed_at, 365);
        const d = daysUntil(due);
        obligations.push({
          id: obligationId("ropa_refresh", "ropa_sessions", r.id, due),
          kind: "ropa_refresh",
          source_table: "ropa_sessions",
          source_id: r.id,
          title: "RoPA annual refresh",
          due_date: due,
          days_until: d,
          severity: severityFor(d),
          basis: "GDPR Art. 30 — records must be kept up to date; annual refresh is our recommended cadence",
          basis_type: "recommended",
          source_route: "/ropa",
        });
      }
    } catch (e) { console.warn("[obligations] ropa error:", (e as Error).message); }

    // ── Apply user acknowledgements (latest per obligation_id) ──
    const ids = obligations.map((o) => o.id);
    let ackByObl: Record<string, any> = {};
    if (ids.length > 0) {
      try {
        const { data: acks } = await admin
          .from("obligation_acknowledgements")
          .select("obligation_id, action, snooze_until, created_at")
          .eq("user_id", user.id)
          .in("obligation_id", ids)
          .order("created_at", { ascending: false });
        for (const a of (acks as any[]) || []) {
          if (!ackByObl[a.obligation_id]) ackByObl[a.obligation_id] = a;
        }
      } catch (e) { /* table may not exist yet */ }
    }

    const nowMs = Date.now();
    const filtered: any[] = [];
    for (const o of obligations) {
      const a = ackByObl[o.id];
      if (!a) { filtered.push(o); continue; }
      if (a.action === "dismissed") continue;
      if (a.action === "completed") continue;
      if (a.action === "snoozed") {
        const until = a.snooze_until ? new Date(a.snooze_until).getTime() : 0;
        if (until > nowMs) continue;
        filtered.push({ ...o, snoozed_until_passed: true, acknowledged: { action: a.action, created_at: a.created_at } });
        continue;
      }
      filtered.push({ ...o, acknowledged: { action: a.action, created_at: a.created_at } });
    }

    filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return new Response(
      JSON.stringify({ obligations: filtered, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-obligations error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
