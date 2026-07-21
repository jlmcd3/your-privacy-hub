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
//   (c) an active subscription in profiles for products that the pricing
//       registry marks as INCLUDED free with any active subscription
//       (ir_playbook, biometric_checker, dpa_generator).
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

// Products included FREE with any active subscription. Mirrors
// SUBSCRIBER_FREE_TOOLS in get-tool-price/index.ts. Any drift here is a
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
  if (SUBSCRIBER_FREE.has(product)) {
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium, is_pro")
      .eq("id", caller.userId)
      .maybeSingle();
    const included = !!((profile as any)?.is_premium || (profile as any)?.is_pro);
    if (included) return { ok: true, reason: "subscriber_included" };
    return { ok: false, status: 403, error: "forbidden", reason: "subscriber_required" };
  }

  // Paid product, no payment intent, not subscriber-included → deny.
  return { ok: false, status: 403, error: "forbidden", reason: "no_payment_evidence" };
}
