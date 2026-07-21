# UX-2b — Copy Pack Rollout Plan

## Rules (from courier)
- Heroes ≤ 2 sentences.
- No statutory citation inside H1 or subline. Mono microline above H1 is OK (e.g. `CAL. CIV. CODE § 1798.100`).
- Price shown in the primary CTA on every product page.
- "You / your" buyer voice; no "we help organizations…"; no "users can…".
- Dates rendered as dates (e.g. "January 1, 2026"), not "effective 1/1/26" or bare years.

## Untouchable (leave exact wording alone)
1. `src/pages/CPPARiskAssessment.tsx` hero (ratified UX-1c).
2. `src/components/home/SearchFirstHero.tsx` US + EU/UK heroes (ratified UX-2a).
3. Legal disclaimer line: "Outputs support your legal review — they do not replace legal judgment." and its equivalents — wording is frozen everywhere it appears.

## Pages in scope (product/tool landings + marketing)
Product tool landings/intakes:
- CPPACybersecurity, CPPAScopeChecker, CPPAHub, CPPASuiteResult (hero only)
- ADMTChecker (landing/intake hero)
- DPIAFramework, LIAssessment, LIAssessmentIntake
- GovernanceAssessment, IRPlaybook, DPAGenerator, BiometricChecker
- RopaLanding, EUNoticeLanding, NoticeBuilderLanding, NoticesRopaHub
- BreachNotification, CrossBorderTransfers, HealthDataPrivacy, BiometricPrivacy, AIPrivacyRegulations
- GetIntelligence
- Pricing (verify CTA prices)

Marketing/context:
- About, FAQ, Contact (heroes only)
- GDPREnforcement, Enforcement, JurisdictionsHub, GlobalPrivacyLaws, USStatePrivacyLaws, USFederalPrivacyLaw, GlobalAuthorities, USStateAuthorities (heroes only, no citations in H1)

## Method
For each page:
1. Read hero block (H1, subline, primary CTA).
2. If untouchable → skip and log.
3. Otherwise rewrite H1+subline to ≤2 sentences, remove statutory citations from those two elements (relocate to mono microline above H1 if the citation is load-bearing), rewrite in "you/your" voice, and format any date literally.
4. Ensure primary CTA on product pages includes the price (pulled from `@/config/pricing`, not hardcoded).
5. Leave disclaimer strings untouched anywhere they appear.
6. Record before/after in the report table.

## Deliverable
Single response with:
- Page-by-page before/after copy table (H1 / subline / primary CTA).
- Explicit list of pages left untouched (the three ratified heroes + disclaimer line confirmation).
- Deviations list per standing terms.

## Ask before executing
This is ~25 pages of hero + CTA rewrites. Two clarifications before I start:
1. **Mono microline** — is the format `CAL. CIV. CODE § 1798.100` (uppercase, DM Mono) acceptable as the standard, or is there a ratified pattern I should mirror from CPPARiskAssessment?
2. **CTA price format** — should product page primary CTAs read literally "Start CPPA Risk Assessment — $149" (em-dash + price, matching the ratified EU/UK homepage pattern), or a different convention?

If both defaults are fine, reply "proceed with defaults" and I will execute the sweep and report in one turn.
