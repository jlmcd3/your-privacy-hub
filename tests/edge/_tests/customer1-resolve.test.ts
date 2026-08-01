// CUSTOMER-1 regression: resolveOrCreateCustomer must return the SAME
// customer id when called twice for the same userId — no duplicate
// customer creation on repeat checkout. Also verifies:
//   - email-only match backfills metadata.userId
//   - missing user creates once, then reuses on second call
//
// Uses an in-memory Stripe stub — no gateway calls.

import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveOrCreateCustomer } from "../../../supabase/functions/_shared/stripe.ts";

type FakeCustomer = {
  id: string;
  email?: string;
  metadata: Record<string, string>;
};

function makeFakeStripe() {
  const store: FakeCustomer[] = [];
  let seq = 0;
  const calls = { search: 0, list: 0, update: 0, create: 0 };
  return {
    calls,
    store,
    customers: {
      // eslint-disable-next-line require-await
      search: async ({ query }: { query: string; limit?: number }) => {
        calls.search++;
        const m = query.match(/metadata\['userId'\]:'([^']+)'/);
        if (!m) return { data: [] };
        const uid = m[1];
        return { data: store.filter((c) => c.metadata?.userId === uid) };
      },
      list: async ({ email }: { email?: string; limit?: number }) => {
        calls.list++;
        return { data: store.filter((c) => c.email === email) };
      },
      update: async (id: string, patch: { metadata?: Record<string, string> }) => {
        calls.update++;
        const c = store.find((x) => x.id === id);
        if (!c) throw new Error("no such customer");
        c.metadata = { ...c.metadata, ...(patch.metadata ?? {}) };
        return c;
      },
      create: async (input: { email?: string; metadata?: Record<string, string> }) => {
        calls.create++;
        const c: FakeCustomer = {
          id: `cus_test_${++seq}`,
          email: input.email,
          metadata: input.metadata ?? {},
        };
        store.push(c);
        return c;
      },
    },
  };
}

Deno.test("CUSTOMER-1: repeat checkout resolves same customer id (metadata match)", async () => {
  const stripe = makeFakeStripe();
  const first = await resolveOrCreateCustomer(stripe as any, {
    userId: "user-abc-123",
    email: "a@example.com",
  });
  const second = await resolveOrCreateCustomer(stripe as any, {
    userId: "user-abc-123",
    email: "a@example.com",
  });
  assertStrictEquals(first, second, "customer id must be stable across calls");
  assertEquals(stripe.calls.create, 1, "customers.create called only once");
  assertEquals(stripe.store.length, 1, "only one customer in store");
  assertEquals(stripe.store[0].metadata.userId, "user-abc-123");
});

Deno.test("CUSTOMER-1: email-only match backfills userId metadata and reuses", async () => {
  const stripe = makeFakeStripe();
  // Pre-existing legacy customer with email but no userId metadata.
  stripe.store.push({ id: "cus_legacy", email: "legacy@example.com", metadata: {} });
  const id = await resolveOrCreateCustomer(stripe as any, {
    userId: "user-legacy-1",
    email: "legacy@example.com",
  });
  assertStrictEquals(id, "cus_legacy");
  assertEquals(stripe.calls.create, 0, "must NOT create a new customer");
  assertEquals(stripe.calls.update, 1, "must backfill userId metadata");
  assertEquals(stripe.store[0].metadata.userId, "user-legacy-1");

  // Second call now hits the metadata search branch.
  const id2 = await resolveOrCreateCustomer(stripe as any, {
    userId: "user-legacy-1",
    email: "legacy@example.com",
  });
  assertStrictEquals(id2, "cus_legacy");
  assertEquals(stripe.calls.create, 0);
});

Deno.test("CUSTOMER-1: different userIds get different customers", async () => {
  const stripe = makeFakeStripe();
  const a = await resolveOrCreateCustomer(stripe as any, { userId: "u1", email: "u1@x.com" });
  const b = await resolveOrCreateCustomer(stripe as any, { userId: "u2", email: "u2@x.com" });
  if (a === b) throw new Error("distinct users must get distinct customer ids");
  assertEquals(stripe.calls.create, 2);
});

Deno.test("CUSTOMER-1: invalid userId is rejected", async () => {
  const stripe = makeFakeStripe();
  let threw = false;
  try {
    await resolveOrCreateCustomer(stripe as any, { userId: "bad'id", email: "x@x.com" });
  } catch (_) {
    threw = true;
  }
  if (!threw) throw new Error("expected rejection for unsafe userId");
});
