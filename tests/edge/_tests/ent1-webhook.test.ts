// ENT-1 acceptance tests: the payments-webhook subscription handler must
// keep sandbox and live entitlement writes strictly isolated.
//
// (a) A sandbox subscription upserts user_entitlements(env='sandbox') and
//     performs ZERO writes against public.profiles.
// (b) A live subscription upserts user_entitlements(env='live') AND
//     dual-writes the profiles row.
//
// These tests exercise the extracted handleSubscriptionEvent handler with
// an in-memory mock supabase client, bypassing verifyWebhook (which is
// covered separately by signature-verification tests).

import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleSubscriptionEvent } from "../../../supabase/functions/payments-webhook/index.ts";

type Write = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload?: unknown;
  filters?: Record<string, unknown>;
};

interface MockOpts {
  /** profiles row returned when profileIdForCustomer queries by customer id */
  profileByCustomer?: { id: string } | null;
  /** existing user_entitlements row for the (user, env) key */
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
        const updateChain = {
          eq(col: string, val: unknown) {
            writes.push({
              table,
              op: "update",
              payload,
              filters: { ...filters, [col]: val },
            });
            return Promise.resolve({ data: null, error: null });
          },
        };
        return updateChain;
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

  return {
    client: { from } as any,
    writes,
  };
}

const nowSec = Math.floor(Date.now() / 1000);

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_test_intel_monthly",
    customer: "cus_test_john",
    status: "active",
    cancel_at_period_end: false,
    trial_end: null,
    items: {
      data: [{
        current_period_start: nowSec,
        current_period_end: nowSec + 30 * 86400,
        price: {
          lookup_key: "intelligence_monthly",
          product: "prod_test_intel",
        },
      }],
    },
    ...overrides,
  };
}

Deno.test("ENT-1 (a): sandbox event upserts user_entitlements(env='sandbox') and does NOT touch profiles", async () => {
  const mock = makeMockClient({
    profileByCustomer: { id: "user-john-uuid" },
  });

  await handleSubscriptionEvent(mock.client, makeSub(), "sandbox");

  const profileWrites = mock.writes.filter(
    (w) => w.table === "profiles" && w.op !== "select",
  );
  assertEquals(
    profileWrites.length,
    0,
    "sandbox event must not write to profiles; got: " + JSON.stringify(profileWrites),
  );

  const entWrites = mock.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(entWrites.length, 1, "expected exactly one user_entitlements upsert");
  const payload = entWrites[0].payload as Record<string, unknown>;
  assertStrictEquals(payload.environment, "sandbox");
  assertStrictEquals(payload.user_id, "user-john-uuid");
  assertStrictEquals(payload.is_premium, true);
  assertStrictEquals(payload.subscription_type, "monthly");
});

Deno.test("ENT-1 (b): live event upserts user_entitlements(env='live') AND updates profiles", async () => {
  const mock = makeMockClient({
    profileByCustomer: { id: "user-john-uuid" },
  });

  await handleSubscriptionEvent(mock.client, makeSub(), "live");

  const entWrites = mock.writes.filter(
    (w) => w.table === "user_entitlements" && w.op === "upsert",
  );
  assertEquals(entWrites.length, 1);
  const entPayload = entWrites[0].payload as Record<string, unknown>;
  assertStrictEquals(entPayload.environment, "live");
  assertStrictEquals(entPayload.is_premium, true);

  const profileUpdates = mock.writes.filter(
    (w) => w.table === "profiles" && w.op === "update",
  );
  assertEquals(profileUpdates.length, 1, "expected one profiles update on live");
  const profPayload = profileUpdates[0].payload as Record<string, unknown>;
  assertStrictEquals(profPayload.is_premium, true);
  assertStrictEquals(profPayload.subscription_type, "monthly");
  assertEquals(profileUpdates[0].filters?.stripe_customer_id, "cus_test_john");
});

Deno.test("ENT-1: sandbox annual grant writes annual_tool_credits with environment='sandbox'", async () => {
  const mock = makeMockClient({
    profileByCustomer: { id: "user-john-uuid" },
  });

  const annualSub = makeSub({
    id: "sub_test_intel_annual",
    items: {
      data: [{
        current_period_start: nowSec,
        current_period_end: nowSec + 365 * 86400,
        price: { lookup_key: "intelligence_annual", product: "prod_test_intel_annual" },
      }],
    },
  });

  await handleSubscriptionEvent(mock.client, annualSub, "sandbox");

  const creditInserts = mock.writes.filter(
    (w) => w.table === "annual_tool_credits" && w.op === "insert",
  );
  assertEquals(creditInserts.length, 1);
  const rows = creditInserts[0].payload as Array<Record<string, unknown>>;
  assert(Array.isArray(rows) && rows.length === 1, "intelligence annual grants 1 credit");
  assertStrictEquals(rows[0].environment, "sandbox");
});
