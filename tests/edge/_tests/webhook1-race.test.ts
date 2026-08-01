// WEBHOOK-1 acceptance tests: the payments-webhook must NOT emit a partial
// user_entitlements row when subscription.* races ahead of the customer
// mapping, and the checkout.session.completed handler must heal any
// remaining ordering for legacy subscriptions with no metadata.
//
// (a) Race replay: subscription.created carries metadata.user_id and there
//     is NO profiles.stripe_customer_id mapping yet. Handler must still
//     write the full entitlement row (subscription_type / trial_end /
//     period_end / stripe_subscription_id populated).
// (b) Legacy race: subscription.created WITHOUT metadata and no mapping is
//     effectively skipped (no userId → no ent write). Then
//     checkout.session.completed fires with session.subscription carrying
//     trial/period data. The dispatch helper must re-run
//     handleSubscriptionEvent, producing a full row (not partial).

import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  dispatchCheckoutSubscription,
  handleSubscriptionEvent,
} from "../../../supabase/functions/payments-webhook/index.ts";

type Write = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload?: unknown;
  filters?: Record<string, unknown>;
};

function makeMockClient(opts: {
  profileByCustomer?: { id: string } | null;
  existingEntitlement?: Record<string, unknown> | null;
} = {}) {
  const writes: Write[] = [];
  function from(table: string) {
    const filters: Record<string, unknown> = {};
    const chain: any = {
      select() { return chain; },
      eq(col: string, val: unknown) { filters[col] = val; return chain; },
      is(col: string, val: unknown) { filters[`${col}:is`] = val; return chain; },
      order() { return chain; },
      limit() { return chain; },
      maybeSingle() {
        writes.push({ table, op: "select", filters: { ...filters } });
        if (table === "profiles" && filters["stripe_customer_id"]) {
          return Promise.resolve({ data: opts.profileByCustomer ?? null, error: null });
        }
        if (table === "user_entitlements") {
          return Promise.resolve({ data: opts.existingEntitlement ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      update(payload: unknown) {
        return {
          eq(col: string, val: unknown) {
            writes.push({ table, op: "update", payload, filters: { ...filters, [col]: val } });
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      insert(payload: unknown) {
        writes.push({ table, op: "insert", payload });
        return Promise.resolve({ data: null, error: null });
      },
      upsert(payload: unknown, _opts?: unknown) {
        writes.push({ table, op: "upsert", payload });
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }
  return { client: { from } as any, writes };
}

const nowSec = Math.floor(Date.now() / 1000);
const trialEnd = nowSec + 10 * 86400;
const periodEnd = nowSec + 30 * 86400;

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_webhook1_race",
    customer: "cus_webhook1_new",
    status: "trialing",
    cancel_at_period_end: false,
    trial_end: trialEnd,
    items: {
      data: [{
        current_period_start: nowSec,
        current_period_end: periodEnd,
        price: { lookup_key: "intelligence_monthly", product: "prod_intel" },
      }],
    },
    ...overrides,
  };
}

Deno.test("WEBHOOK-1 (a): subscription.created with metadata.user_id and NO customer mapping writes a full entitlement row", async () => {
  // Simulate the race: profileIdForCustomer would return null (no mapping),
  // but metadata carries the user_id — the metadata-first resolve must win.
  const mock = makeMockClient({ profileByCustomer: null });

  const sub = makeSub({ metadata: { user_id: "user-race-uuid" } });
  await handleSubscriptionEvent(mock.client, sub, "sandbox");

  const entWrites = mock.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(entWrites.length, 1, "expected exactly one entitlement upsert");
  const p = entWrites[0].payload as Record<string, unknown>;
  assertStrictEquals(p.user_id, "user-race-uuid");
  assertStrictEquals(p.environment, "sandbox");
  assertStrictEquals(p.is_premium, true);
  assertStrictEquals(p.subscription_type, "monthly");
  assertStrictEquals(p.stripe_subscription_id, "sub_webhook1_race");
  assert(typeof p.stripe_trial_end === "string" && (p.stripe_trial_end as string).length > 0,
    "trial_end must be populated (was: " + String(p.stripe_trial_end) + ")");
  assert(typeof p.subscription_end_date === "string" && (p.subscription_end_date as string).length > 0,
    "period_end must be populated");
});

Deno.test("WEBHOOK-1 (b): legacy race — no metadata, no mapping on subscription.created; checkout.session.completed dispatch heals to a full row", async () => {
  // Step 1: subscription.created without metadata and no profile mapping.
  // With no userId resolvable, no entitlement row should be written.
  const mockLegacy = makeMockClient({ profileByCustomer: null });
  const legacySub = makeSub(); // no metadata
  await handleSubscriptionEvent(mockLegacy.client, legacySub, "sandbox");
  const legacyEntWrites = mockLegacy.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(legacyEntWrites.length, 0, "no metadata + no mapping ⇒ skipped");

  // Step 2: checkout.session.completed fires. Customer mapping is now in
  // place (profiles.stripe_customer_id = cus_webhook1_new → user-legacy).
  // dispatchCheckoutSubscription retrieves the sub and re-runs the full
  // handler — the row must land fully populated.
  const mockHeal = makeMockClient({ profileByCustomer: { id: "user-legacy-uuid" } });
  const session = { subscription: "sub_webhook1_race" };
  await dispatchCheckoutSubscription(
    mockHeal.client,
    session,
    "sandbox",
    async (_id) => legacySub, // stubbed stripe.subscriptions.retrieve
  );

  const healed = mockHeal.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(healed.length, 1, "checkout dispatch must produce one full ent upsert");
  const p = healed[0].payload as Record<string, unknown>;
  assertStrictEquals(p.user_id, "user-legacy-uuid");
  assertStrictEquals(p.environment, "sandbox");
  assertStrictEquals(p.is_premium, true);
  assertStrictEquals(p.subscription_type, "monthly");
  assertStrictEquals(p.stripe_subscription_id, "sub_webhook1_race");
  assert(typeof p.stripe_trial_end === "string" && (p.stripe_trial_end as string).length > 0);
  assert(typeof p.subscription_end_date === "string" && (p.subscription_end_date as string).length > 0);
});
