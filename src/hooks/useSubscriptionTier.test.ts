// ENT-1: useSubscriptionTier must read user_entitlements filtered by the
// build's Stripe environment. A live entitlement row for the same user
// must NOT be surfaced in a sandbox build.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-john-uuid", email: "x@y" }, loading: false }),
}));

const envMock = vi.fn(() => "sandbox" as "sandbox" | "live");
vi.mock("@/lib/env", () => ({
  getStripeEnvironment: () => envMock(),
}));

const rows: Record<string, any> = {};
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const filters: Record<string, unknown> = {};
    const c: any = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters[col] = val; return c; },
      maybeSingle: async () => ({
        data: rows[`${table}:${JSON.stringify(filters)}`] ?? null,
        error: null,
      }),
      single: async () => ({
        data: rows[`${table}:${JSON.stringify(filters)}`] ?? null,
        error: null,
      }),
    };
    return c;
  };
  return { supabase: { from: chain } };
});

import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

beforeEach(() => { for (const k of Object.keys(rows)) delete rows[k]; });
afterEach(() => { vi.clearAllMocks(); });

describe("ENT-1: useSubscriptionTier env selection", () => {
  it("in sandbox build, picks user_entitlements row scoped to 'sandbox'", async () => {
    envMock.mockReturnValue("sandbox");
    rows[`user_entitlements:${JSON.stringify({ user_id: "user-john-uuid", environment: "sandbox" })}`] = {
      is_premium: true, is_pro: false, subscription_type: "monthly", stripe_trial_end: null,
    };
    rows[`user_entitlements:${JSON.stringify({ user_id: "user-john-uuid", environment: "live" })}`] = null;
    rows[`profiles:${JSON.stringify({ id: "user-john-uuid" })}`] = {
      is_premium: true, is_pro: true, subscription_type: "pro_annual", stripe_trial_end: null,
    };

    const { result } = renderHook(() => useSubscriptionTier());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe("monthly");
    expect(result.current.isPro).toBe(false);
  });

  it("in live build, picks user_entitlements row scoped to 'live' (ignores sandbox row)", async () => {
    envMock.mockReturnValue("live");
    rows[`user_entitlements:${JSON.stringify({ user_id: "user-john-uuid", environment: "sandbox" })}`] = {
      is_premium: true, is_pro: false, subscription_type: "monthly", stripe_trial_end: null,
    };
    rows[`user_entitlements:${JSON.stringify({ user_id: "user-john-uuid", environment: "live" })}`] = {
      is_premium: true, is_pro: true, subscription_type: "pro_annual", stripe_trial_end: null,
    };

    const { result } = renderHook(() => useSubscriptionTier());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe("annual");
    expect(result.current.isPro).toBe(true);
  });

  it("in sandbox build with no sandbox entitlement, falls back to 'free' (never leaks live profile)", async () => {
    envMock.mockReturnValue("sandbox");
    rows[`user_entitlements:${JSON.stringify({ user_id: "user-john-uuid", environment: "sandbox" })}`] = null;
    rows[`profiles:${JSON.stringify({ id: "user-john-uuid" })}`] = {
      is_premium: true, is_pro: true, subscription_type: "pro_annual", stripe_trial_end: null,
    };

    const { result } = renderHook(() => useSubscriptionTier());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe("free");
    expect(result.current.isPremium).toBe(false);
  });
});
