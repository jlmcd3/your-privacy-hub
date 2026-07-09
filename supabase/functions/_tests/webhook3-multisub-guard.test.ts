// WEBHOOK-3 acceptance tests. Reproduces the observed interleaving:
//   1. sub_NEW (created LATER) fires subscription.updated → row written.
//   2. sub_OLD (created EARLIER, now canceling) fires
//      subscription.updated → MUST NOT overwrite the row that already
//      belongs to sub_NEW. Prior behavior: last-writer-wins → row
//      silently overwritten by the stale, canceling subscription.
//
// Also verifies the pure decision function directly for all documented
// branches (same-sub, empty row, inactive-vs-live, created tiebreaker).

import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decideSubscriptionWrite,
  handleSubscriptionEvent,
} from "../payments-webhook/index.ts";

type Write = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload?: unknown;
  filters?: Record<string, unknown>;
};

function makeMockClient(existingEntitlement: Record<string, unknown> | null) {
  const writes: Write[] = [];
  let ent = existingEntitlement;

  function from(table: string) {
    const filters: Record<string, unknown> = {};
    const chain: any = {
      select() { return chain; },
      eq(col: string, val: unknown) { filters[col] = val; return chain; },
      order() { return chain; },
      limit() { return chain; },
      maybeSingle() {
        writes.push({ table, op: "select", filters: { ...filters } });
        if (table === "profiles" && filters["stripe_customer_id"]) {
          return Promise.resolve({ data: { id: "user-john-uuid" }, error: null });
        }
        if (table === "user_entitlements") {
          return Promise.resolve({ data: ent, error: null });
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
        // Reflect the write back into the "existing" row so a subsequent
        // subscription event in the same test sees the updated state.
        ent = payload as Record<string, unknown>;
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }

  return { client: { from } as any, writes, getRow: () => ent };
}

function sub(id: string, createdSec: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    customer: "cus_test_john",
    status: "trialing",
    cancel_at_period_end: false,
    trial_end: createdSec + 10 * 86400,
    created: createdSec,
    metadata: { user_id: "user-john-uuid" },
    items: {
      data: [{
        current_period_start: createdSec,
        current_period_end: createdSec + 10 * 86400,
        price: { lookup_key: "intelligence_monthly", product: "prod_intel" },
      }],
    },
    ...overrides,
  };
}

Deno.test("WEBHOOK-3 unit: same sub id → accept", () => {
  const d = decideSubscriptionWrite(
    { stripe_subscription_id: "sub_A", stripe_subscription_created_at: "2026-07-09T00:00:00Z", is_premium: true, cancel_at_period_end: false },
    { id: "sub_A", status: "trialing", created: 1_783_570_000 },
  );
  assertEquals(d.accept, true);
  assertStrictEquals(d.reason, "same_sub");
});

Deno.test("WEBHOOK-3 unit: empty row → accept", () => {
  const d = decideSubscriptionWrite(null, { id: "sub_A", status: "trialing", created: 1 });
  assertEquals(d.accept, true);
  assertStrictEquals(d.reason, "no_existing_sub");
});

Deno.test("WEBHOOK-3 unit: incoming canceling + existing live-other → SKIP", () => {
  const d = decideSubscriptionWrite(
    { stripe_subscription_id: "sub_NEW", stripe_subscription_created_at: "2026-07-09T01:08:54Z", is_premium: true, cancel_at_period_end: false },
    { id: "sub_OLD", status: "canceled", created: 1_783_557_840 },
  );
  assertEquals(d.accept, false);
  assertStrictEquals(d.reason, "incoming_inactive_existing_live");
});

Deno.test("WEBHOOK-3 unit: incoming older active + existing newer → SKIP by created tiebreaker", () => {
  const d = decideSubscriptionWrite(
    { stripe_subscription_id: "sub_NEW", stripe_subscription_created_at: "2026-07-09T01:08:54Z", is_premium: true, cancel_at_period_end: false },
    { id: "sub_OLD", status: "trialing", created: 1_783_557_840 /* older */ },
  );
  assertEquals(d.accept, false);
  assertStrictEquals(d.reason, "incoming_older_than_existing");
});

Deno.test("WEBHOOK-3 unit: incoming newer active + existing older → accept", () => {
  const d = decideSubscriptionWrite(
    { stripe_subscription_id: "sub_OLD", stripe_subscription_created_at: "2026-07-09T00:04:00Z", is_premium: true, cancel_at_period_end: false },
    { id: "sub_NEW", status: "trialing", created: 1_783_570_000 /* newer */ },
  );
  assertEquals(d.accept, true);
});

Deno.test("WEBHOOK-3 integration: stale canceling event from OLDER sub must NOT overwrite row owned by NEWER active sub", async () => {
  // Timings mirror the john.mcd.3 sandbox reproduction:
  //   sub_OLD (1Tr64M) created 2026-07-09T00:04:00Z (unix 1783557840)
  //   sub_NEW (1Tr75A) created 2026-07-09T01:08:54Z (unix 1783561734)
  const OLD_CREATED = 1_783_557_840;
  const NEW_CREATED = 1_783_561_734;

  const mock = makeMockClient(null);

  // Step 1: sub_NEW active event → row should reflect sub_NEW.
  await handleSubscriptionEvent(mock.client, sub("sub_NEW", NEW_CREATED), "sandbox");
  const rowAfterNew = mock.getRow() as any;
  assertStrictEquals(rowAfterNew.stripe_subscription_id, "sub_NEW");
  assertStrictEquals(rowAfterNew.is_premium, true);
  assertStrictEquals(rowAfterNew.cancel_at_period_end, false);

  // Step 2: sub_OLD updated event arrives late with cancel_at_period_end=true.
  // Guard must skip it — row must still show sub_NEW state.
  await handleSubscriptionEvent(
    mock.client,
    sub("sub_OLD", OLD_CREATED, { cancel_at_period_end: true }),
    "sandbox",
  );
  const rowAfterOld = mock.getRow() as any;
  assertStrictEquals(
    rowAfterOld.stripe_subscription_id,
    "sub_NEW",
    "stale event from older sub must not overwrite row",
  );
  assertStrictEquals(rowAfterOld.cancel_at_period_end, false, "must not flip cancel flag");

  // Only one upsert should have landed (from step 1).
  const upserts = mock.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(upserts.length, 1, "expected exactly one entitlement upsert; stale event must be skipped");
});

Deno.test("WEBHOOK-3 integration: canceling event from the SAME sub still applies", async () => {
  const mock = makeMockClient(null);
  await handleSubscriptionEvent(mock.client, sub("sub_ONLY", 1_783_570_000), "sandbox");
  await handleSubscriptionEvent(
    mock.client,
    sub("sub_ONLY", 1_783_570_000, { cancel_at_period_end: true }),
    "sandbox",
  );
  const row = mock.getRow() as any;
  assertStrictEquals(row.stripe_subscription_id, "sub_ONLY");
  assertStrictEquals(row.cancel_at_period_end, true);
  const upserts = mock.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(upserts.length, 2);
});
