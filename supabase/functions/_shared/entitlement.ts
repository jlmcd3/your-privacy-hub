// Shared server-side entitlement gate for paid generators.
//
// verifyCaller answers "who is calling"; requireEntitlement answers
// "is this caller allowed to generate THIS product against THIS row for
// free / at the price they've paid". It never trusts client-supplied flags
// (is_subscriber_credit, purchased_as_standalone, purchase_price_cents) or
// a client-declared price of 0. Entitlement evidence comes from:
//
//   (a) service-role invocation — payments-webhook, cron, harness (trusted);
//   (b) row.stripe_payment_intent_id populated by the Stripe webhook — the
//       only proof of payment we accept for a paid generation; or
//   (c) an active PROFESSIONAL subscription in profiles for products that the
//       pricing registry marks as included with Professional (v13:
//       ir_playbook, biometric_checker, dpa_generator); or
//   (d) the Biometric first-run-free quota (profiles.biometric_free_run_claimed
//       set by claim_biometric_free_run) against a row the client marked
//       is_free_tier, once per user.
//
// The row's own is_subscriber_credit / purchased_as_standalone booleans are
// never used as entitlement evidence — they are bookkeeping labels that a
// non-service-role INSERT cannot set (see lock_paywall_columns trigger).
//
// Products intentionally NOT wired to this helper are lead-gen surfaces
// that must remain free:
//   - run-admt-checker (ADMT lead-gen surface; paid variant only reachable
//     via stripe checkout path)
//   - cppa scope checker (no generator function)
// Every other paid generator MUST call requireEntitlement immediately
// after verifyCaller.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { CallerResult } from "./verify-caller.ts";

export type EntitlementProduct =
  | "governance_assessment"
  | "dpia_framework"
  | "li_assessment"
  | "dpa_generator"
  | "ir_playbook"
  | "biometric_checker"
  | "cppa_risk_assessment"
  | "cppa_cybersecurity";

// Table each product's row lives on. Keep in lockstep with PRODUCT_DISPATCH
// in _shared/generation-policy.ts.
const PRODUCT_TABLE: Record<EntitlementProduct, string> = {
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  li_assessment: "li_assessments",
  dpa_generator: "dpa_documents",
  ir_playbook: "ir_playbooks",
  biometric_checker: "biometric_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

// Products included FREE with a PROFESSIONAL subscription (v13). Mirrors
// PROFESSIONAL_INCLUDED_TOOLS in _shared/pricing.ts. Any drift here is a
// pricing bug — keep the two lists identical.
const SUBSCRIBER_FREE: Set<EntitlementProduct> = new Set([
  "ir_playbook",
  "biometric_checker",
  "dpa_generator",
]);

export interface EntitlementResult {
  ok: boolean;
  status?: number;
  error?: string;
  reason?: string;
}

let _adminClient: SupabaseClient | null = null;
function adminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  _adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  return _adminClient;
}

/**
 * Gate a paid generation invocation. Call immediately after verifyCaller.
 *
 *   const caller = await verifyCaller(req);
 *   if (!caller.ok) return json({ error: caller.error }, caller.status ?? 401);
 *   const ent = await requireEntitlement(caller, "governance_assessment", { rowId: assessment_id });
 *   if (!ent.ok) return json({ error: "forbidden" }, ent.status ?? 403);
 *
 * A generic 403 body is returned — never leak the specific reason to the
 * client. The `reason` field is for server-side logs only.
 */
export async function requireEntitlement(
  caller: CallerResult,
  product: EntitlementProduct,
  opts: { rowId: string },
): Promise<EntitlementResult> {
  // (a) service-role callers are always trusted (webhook / cron / harness).
  if (caller.internal) return { ok: true };

  if (!caller.userId) {
    return { ok: false, status: 401, error: "unauthenticated", reason: "no_user_id" };
  }
  if (!opts.rowId) {
    return { ok: false, status: 400, error: "missing_row", reason: "row_id_required" };
  }

  const admin = adminClient();

  // (a2) admin caller — trusted for /admin/sample-reports regeneration and
  // ops replays. Role is checked server-side against user_roles via the
  // security-definer has_role RPC; client-supplied flags never grant this.
  try {
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: caller.userId,
      _role: "admin",
    });
    if (isAdmin === true) {
      console.log(JSON.stringify({
        evt: "entitlement_admin_bypass",
        product,
        user_id: caller.userId,
        row_id: opts.rowId,
      }));
      return { ok: true, reason: "admin_bypass" };
    }
  } catch (_e) {
    // fall through to standard evidence checks
  }

  const table = PRODUCT_TABLE[product];

  const { data: row, error: rowErr } = await admin
    .from(table)
    .select("id, user_id, stripe_payment_intent_id")
    .eq("id", opts.rowId)
    .maybeSingle();

  if (rowErr || !row) {
    return { ok: false, status: 403, error: "forbidden", reason: "row_not_found" };
  }

  // (b) ownership — user callers must own the row.
  if ((row as any).user_id !== caller.userId) {
    return { ok: false, status: 403, error: "forbidden", reason: "row_not_owned" };
  }

  // (c) proof-of-payment via Stripe webhook write.
  if ((row as any).stripe_payment_intent_id) {
    return { ok: true, reason: "stripe_paid" };
  }

  // (d) subscriber-included product? Consult profiles server-side.
  // v13 (2026-08-29, LAUNCH REPRICING): DPA / IR Playbook / Biometric are
  // included for PROFESSIONAL subscribers only — create-tool-checkout's
  // bypass and get-tool-price's is_included both gate on is_pro. QA batch
  // 2026-09-05: this gate still granted them to ANY subscriber, so a client
  // that inserted its own pending row could generate for free on an
  // Intelligence plan. Aligned to is_pro.
  if (SUBSCRIBER_FREE.has(product)) {
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium, is_pro, biometric_free_run_claimed")
      .eq("id", caller.userId)
      .maybeSingle();
    if ((profile as any)?.is_pro === true) return { ok: true, reason: "subscriber_included" };

    // (e) Biometric first-run-free (ITEM 360): the client claims the quota
    // atomically through claim_biometric_free_run(), then inserts a row with
    // is_free_tier = true and invokes with that row. The row alone proves
    // nothing (any authenticated insert can set is_free_tier); the evidence
    // is the claimed quota on the profile AND no earlier completed free-tier
    // row for this user.
    if (product === "biometric_checker" && (profile as any)?.biometric_free_run_claimed === true) {
      const { data: bioRow } = await admin
        .from("biometric_assessments")
        .select("id, is_free_tier, status")
        .eq("id", opts.rowId)
        .maybeSingle();
      if ((bioRow as any)?.is_free_tier === true) {
        const { count } = await admin
          .from("biometric_assessments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", caller.userId)
          .eq("is_free_tier", true)
          .eq("status", "complete")
          .neq("id", opts.rowId);
        if ((count ?? 0) === 0) return { ok: true, reason: "biometric_free_run" };
        return { ok: false, status: 403, error: "forbidden", reason: "free_run_already_used" };
      }
    }

    return {
      ok: false,
      status: 403,
      error: "forbidden",
      reason: (profile as any)?.is_premium ? "professional_required" : "subscriber_required",
    };
  }

  // Paid product, no payment intent, not subscriber-included → deny.
  return { ok: false, status: 403, error: "forbidden", reason: "no_payment_evidence" };
}
