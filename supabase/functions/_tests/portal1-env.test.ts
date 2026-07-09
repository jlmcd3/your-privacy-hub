// PORTAL-1: create-portal-session must honor a client-provided env
// override and only use env-var presence as a fallback. Regression:
// after live provisioning, detectEnv() always returned "live" and
// sandbox portal requests hit the live gateway → "no such customer".
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { detectEnv } from "../create-portal-session/index.ts";

Deno.test("detectEnv: explicit sandbox override wins even if live key present", () => {
  Deno.env.set("STRIPE_LIVE_API_KEY", "sk_live_dummy");
  Deno.env.set("STRIPE_SANDBOX_API_KEY", "sk_test_dummy");
  assertEquals(detectEnv("sandbox"), "sandbox");
});

Deno.test("detectEnv: explicit live override honored", () => {
  assertEquals(detectEnv("live"), "live");
});

Deno.test("detectEnv: no override falls back to sandbox when sandbox key exists", () => {
  Deno.env.set("STRIPE_LIVE_API_KEY", "sk_live_dummy");
  Deno.env.set("STRIPE_SANDBOX_API_KEY", "sk_test_dummy");
  assertEquals(detectEnv(), "sandbox");
});

Deno.test("detectEnv: invalid override string falls back", () => {
  Deno.env.set("STRIPE_SANDBOX_API_KEY", "sk_test_dummy");
  assertEquals(detectEnv("garbage"), "sandbox");
});
