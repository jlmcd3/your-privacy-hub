// CHECKOUT-1 acceptance tests: create-checkout-session's subscriber gate
// must be env-scoped. A user with ONLY a live entitlement must be allowed
// to proceed with a sandbox checkout (no block, no portal redirect). A
// user with an active sandbox entitlement must be routed via the
// portal-fallback path (alreadySubscribed=true).

import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveSubscribedInEnv } from "../create-checkout-session/index.ts";

type Row = Record<string, unknown> | null;

function makeMock(opts: { entRows?: Record<string, Row>; profile?: Row }) {
  // entRows keyed by environment ("sandbox" | "live").
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain: any = {
        select() { return chain; },
        eq(col: string, val: unknown) { filters[col] = val; return chain; },
        maybeSingle() {
          if (table === "user_entitlements") {
            const env = filters["environment"] as string;
            return Promise.resolve({ data: (opts.entRows ?? {})[env] ?? null, error: null });
          }
          if (table === "profiles") {
            return Promise.resolve({ data: opts.profile ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
}

Deno.test("sandbox request: live-only entitlement does NOT block sandbox checkout", async () => {
  const supabase = makeMock({
    entRows: { live: { is_premium: true, is_pro: false } },
    profile: { is_premium: true, is_pro: false }, // shouldn't be consulted for sandbox
  });
  const result = await resolveSubscribedInEnv(supabase, "user-1", "sandbox");
  assertEquals(result, false);
});

Deno.test("sandbox request: active sandbox entitlement → alreadySubscribed=true (portal path)", async () => {
  const supabase = makeMock({
    entRows: { sandbox: { is_premium: true, is_pro: false } },
  });
  const result = await resolveSubscribedInEnv(supabase, "user-2", "sandbox");
  assertEquals(result, true);
});

Deno.test("sandbox request: no row anywhere → not subscribed (no fallback)", async () => {
  const supabase = makeMock({
    entRows: {},
    profile: { is_premium: true, is_pro: true }, // must NOT be used for sandbox
  });
  const result = await resolveSubscribedInEnv(supabase, "user-3", "sandbox");
  assertEquals(result, false);
});

Deno.test("live request: no ent row → falls back to profiles (rollout safety)", async () => {
  const supabase = makeMock({
    entRows: {},
    profile: { is_premium: true, is_pro: false },
  });
  const result = await resolveSubscribedInEnv(supabase, "user-4", "live");
  assertEquals(result, true);
});

Deno.test("live request: ent row false wins over profile true (source of truth)", async () => {
  const supabase = makeMock({
    entRows: { live: { is_premium: false, is_pro: false } },
    profile: { is_premium: true, is_pro: true },
  });
  const result = await resolveSubscribedInEnv(supabase, "user-5", "live");
  assertEquals(result, false);
});
