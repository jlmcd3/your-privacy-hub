// QA batch 2026-09-05 (LIA 01) — the free preview labelled an account-takeover
// prevention use case "Contractual administration" and surfaced marketing
// precedents, because the security keyword list had no authentication
// vocabulary and the contractual list's generic words ("account", "customer")
// outvoted it.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyLiaUseCase } from "../../../supabase/functions/_shared/lia/lia-use-case-classifier.ts";

Deno.test("LIA 01 — the QA pass-1 description classifies as IT security, not contractual administration", () => {
  const description =
    "Account-takeover prevention: we analyse device fingerprints, IP addresses and failed-login logs to detect " +
    "unauthorised access attempts against customer accounts. Alerts are reviewed by a human analyst. " +
    "Around 5,000 German adult customers; logs deleted after 30 days; no advertising use.";
  assertEquals(classifyLiaUseCase(description), "it_security");
});

Deno.test("LIA 01 — credential / login / takeover vocabulary alone reaches IT security", () => {
  assertEquals(classifyLiaUseCase("Monitoring login attempts and credential stuffing against user accounts"), "it_security");
  assertEquals(classifyLiaUseCase("Protecting customers from account takeover using IP reputation"), "it_security");
});

Deno.test("LIA 01 — genuine contractual administration still classifies as such", () => {
  assertEquals(
    classifyLiaUseCase("Managing customer accounts, billing and invoicing, and providing support for service delivery"),
    "contractual_administration",
  );
});

Deno.test("LIA 01 — the other classes are unchanged", () => {
  assertEquals(classifyLiaUseCase("Sending a monthly marketing newsletter to subscribers"), "direct_marketing");
  assertEquals(classifyLiaUseCase("Fraud detection and anti-money laundering (AML/KYC) screening"), "fraud_prevention");
  assertEquals(classifyLiaUseCase("Monitoring employee workplace productivity"), "employee_monitoring");
  assertEquals(classifyLiaUseCase("Usage analytics and product research insights"), "research_analytics");
  assertEquals(classifyLiaUseCase("Something entirely unrelated"), "other");
});
