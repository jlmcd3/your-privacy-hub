// REVOKE-1 acceptance tests: entitlement must be revoked immediately on
// customer.subscription.deleted, even when current_period_end is still
// in the future. The graceful cancel-at-period-end path (an "updated"
// event on an otherwise-active subscription) MUST retain access — that
// case is not a delete and must not be affected by this change.
//
// Tests exercise the extracted handleSubscriptionDeleted and
// handleSubscriptionEvent handlers with the same in-memory mock client
// pattern used by ENT-1.

import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleSubscriptionDeleted,
  handleSubscriptionEvent,
} from "../payments-webhook/index.ts";

type Write = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload?: unknown;
  filters?: Record<string, unknown>;
};

interface MockOpts {
  profileByCustomer?: { id: string } | null;
  existingEntitlement?: Record<string, unknown> | null;
}

function makeMockClient(opts: MockOpts) {
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
      upsert(payload: unknown) {
        writes.push({ table, op: "upsert", payload });
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }
  return { client: { from } as any, writes };
}

const nowSec = Math.floor(Date.now() / 1000);
const FUTURE = nowSec + 30 * 86400;

Deno.test(
  "REVOKE-1 (a): customer.subscription.deleted with future period_end ⇒ row REVOKED",
  async () => {
    const mock = makeMockClient({ profileByCustomer: { id: "user-john-uuid" } });
    const deletedSub = {
      id: "sub_test_deleted",
      customer: "cus_test_john",
      status: "canceled",
      cancel_at_period_end: false,
      current_period_end: FUTURE, // still in the future
      items: {
        data: [{
          current_period_end: FUTURE,
          price: { lookup_key: "intelligence_monthly" },
        }],
      },
      metadata: { user_id: "user-john-uuid" },
    };

    await handleSubscriptionDeleted(mock.client, deletedSub, "sandbox");

    const entUpserts = mock.writes.filter(
      (w) => w.table === "user_entitlements" && w.op === "upsert",
    );
    assertEquals(entUpserts.length, 1, "expected one entitlement upsert on delete");
    const p = entUpserts[0].payload as Record<string, unknown>;
    assertStrictEquals(p.is_premium, false, "is_premium must be revoked");
    assertStrictEquals(p.is_pro, false, "is_pro must be revoked");
    assertStrictEquals(p.cancel_at_period_end, false);
    assertStrictEquals(p.subscription_end_date, null, "grace date must be cleared");
    assertStrictEquals(p.subscription_type, null);
    assertStrictEquals(p.stripe_trial_end, null);

    // Sandbox must NOT touch profiles.
    const profWrites = mock.writes.filter(
      (w) => w.table === "profiles" && w.op !== "select",
    );
    assertEquals(profWrites.length, 0, "sandbox delete must not touch profiles");
  },
);

Deno.test(
  "REVOKE-1 (a-live): live delete ALSO clears profiles row (is_premium=false)",
  async () => {
    const mock = makeMockClient({ profileByCustomer: { id: "user-john-uuid" } });
    const deletedSub = {
      id: "sub_test_deleted_live",
      customer: "cus_live_john",
      status: "canceled",
      current_period_end: FUTURE,
      items: { data: [{ current_period_end: FUTURE, price: { lookup_key: "intelligence_monthly" } }] },
      metadata: { user_id: "user-john-uuid" },
    };
    await handleSubscriptionDeleted(mock.client, deletedSub, "live");

    const profUpdates = mock.writes.filter(
      (w) => w.table === "profiles" && w.op === "update",
    );
    assertEquals(profUpdates.length, 1);
    const p = profUpdates[0].payload as Record<string, unknown>;
    assertStrictEquals(p.is_premium, false);
    assertStrictEquals(p.is_pro, false);
    assertStrictEquals(p.subscription_end_date, null);
  },
);

Deno.test(
  "REVOKE-1 (b): subscription.updated with cancel_at_period_end=true + future period_end ⇒ access RETAINED (unchanged)",
  async () => {
    const mock = makeMockClient({ profileByCustomer: { id: "user-john-uuid" } });
    const cancelingSub = {
      id: "sub_test_cape",
      customer: "cus_test_john",
      status: "active", // still active — Stripe will fire delete at period end
      cancel_at_period_end: true,
      current_period_end: FUTURE,
      items: {
        data: [{
          current_period_start: nowSec,
          current_period_end: FUTURE,
          price: { lookup_key: "intelligence_monthly" },
        }],
      },
      metadata: { user_id: "user-john-uuid" },
    };

    await handleSubscriptionEvent(mock.client, cancelingSub, "sandbox");

    const entUpserts = mock.writes.filter(
      (w) => w.table === "user_entitlements" && w.op === "upsert",
    );
    assertEquals(entUpserts.length, 1);
    const p = entUpserts[0].payload as Record<string, unknown>;
    // Access retained — subscription is still active, only flagged to cancel.
    assertStrictEquals(p.is_premium, true, "cancel-at-period-end must NOT revoke while active");
    assertStrictEquals(p.cancel_at_period_end, true, "the flag itself must be carried through");
    // subscription_end_date preserved (used by client to show 'access until' banner).
    assertEquals(
      p.subscription_end_date,
      new Date(FUTURE * 1000).toISOString(),
      "grace end date must remain populated",
    );
  },
);
