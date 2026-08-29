// FREEZE FIX (2026-08-30) — invokeWithTimeout is the guarantee that no
// `supabase.functions.invoke` await in the /admin/all-products-test pipeline
// can hang a batch loop forever. These tests pin the contract:
//   1. a response inside the window passes through untouched;
//   2. a function error inside the window passes through as error;
//   3. silence past the window resolves with timedOut=true and a message
//      naming the function and the elapsed seconds — it NEVER rejects;
//   4. a late rejection after the race never surfaces as unhandled.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { invokeWithTimeout } from "@/lib/sampleGenerators";

describe("invokeWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes a timely response through untouched", async () => {
    invokeMock.mockResolvedValue({ data: { id: "abc" }, error: null });
    const res = await invokeWithTimeout("some-fn", { x: 1 }, 5_000);
    expect(res).toEqual({ data: { id: "abc" }, error: null, timedOut: false });
    expect(invokeMock).toHaveBeenCalledWith("some-fn", { body: { x: 1 } });
  });

  it("passes a timely function error through as error, not timeout", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await invokeWithTimeout("some-fn", {}, 5_000);
    expect(res.timedOut).toBe(false);
    expect(res.error?.message).toBe("boom");
  });

  it("resolves timedOut=true after the window instead of hanging", async () => {
    invokeMock.mockReturnValue(new Promise(() => {})); // never settles
    const p = invokeWithTimeout("hung-fn", {}, 30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    const res = await p;
    expect(res.timedOut).toBe(true);
    expect(res.data).toBeNull();
    expect(res.error?.message).toContain("hung-fn");
    expect(res.error?.message).toContain("30s");
    expect(res.error?.message).toContain("client-side timeout");
  });

  it("a late rejection after the timeout never becomes an unhandled rejection", async () => {
    let rejectLate: (e: Error) => void = () => {};
    invokeMock.mockReturnValue(new Promise((_, rej) => { rejectLate = rej; }));
    const unhandled: unknown[] = [];
    const onUnhandled = (e: PromiseRejectionEvent) => unhandled.push(e.reason);
    window.addEventListener("unhandledrejection", onUnhandled);
    try {
      const p = invokeWithTimeout("late-fail-fn", {}, 10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      const res = await p;
      expect(res.timedOut).toBe(true);
      rejectLate(new Error("network died later"));
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      expect(unhandled).toEqual([]);
    } finally {
      window.removeEventListener("unhandledrejection", onUnhandled);
    }
  });
});
