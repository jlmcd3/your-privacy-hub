
## PP-7a.2 — Group B tool landing pages: classification + rewrite plan

### Task 1 — Group B inventory (from `App.tsx` router)

Group B is the tool landing/intake set. Enumerated directly from `src/App.tsx`:

| # | Route | File | Baseline `grep -o "—" \| wc -l` |
|---|---|---|---|
| 1 | /governance-assessment | src/pages/GovernanceAssessment.tsx | 67 |
| 2 | /dpia-framework | src/pages/DPIAFramework.tsx | 50 |
| 3 | /dpa-generator | src/pages/DPAGenerator.tsx | 43 |
| 4 | /ir-playbook | src/pages/IRPlaybook.tsx | 11 |
| 5 | /li-assessment | src/pages/LIAssessment.tsx | 21 |
| 6 | /biometric-checker | src/pages/BiometricChecker.tsx | 15 |
| 7 | /cppa | src/pages/CPPAHub.tsx | 4 |
| 8 | /cppa-scope-checker | src/pages/CPPAScopeChecker.tsx | 37 |
| 9 | /cppa-risk-assessment | src/pages/CPPARiskAssessment.tsx | 92 |
| 10 | /cppa-cybersecurity | src/pages/CPPACybersecurity.tsx | 17 |
| 11 | /cppa-admt-checker | src/pages/admt/ADMTChecker.tsx | 68 |
| 12 | /ropa-builder | src/pages/ropa/RopaLanding.tsx | 11 |
| 13 | /us-notice-builder | src/pages/us-notices/USNoticeLanding.tsx | 14 |
| 14 | /eu-global-notice-builder | src/pages/eu-notices/EUNoticeLanding.tsx | 5 |
| 15 | /notice-builder | src/pages/NoticeBuilderLanding.tsx | 11 |
| 16 | /registration-manager | src/pages/RegistrationLanding.tsx | 20 |
| 17 | /legitimate-interest-tracker | src/pages/LegitimateInterestTracker.tsx | 8 |
| 18 | /notices-ropa | src/pages/NoticesRopaHub.tsx | 2 |

**Total: 18 files, 496 em-dash occurrences.** Methodology: `grep -o "—" <file> | wc -l`.

### Task 2 — Class-A rewritable set (strict boundary)

Under the ratified boundary ("doubt → B; Class A iff only product/pricing/access, no legal assertion; sample-report-style output → B; enum values contract-bound → B; comments Class-C untouchable"), the Class-A set on Group B is small and confined to five sub-categories:

**a) Pricing/CTA button labels** — pure product+price tokens
- Governance L754/756/759; DPA L129; Biometric L141/144; CPPAScope L708/713/718; CPPARisk L1336/1340; CPPACyber L361/365; ADMT L1554/1555

**b) `preRunHint` product-mechanic strings** — "…fixed once you first generate — everything else stays editable across your included revision runs." (5 files: Gov L514, DPIA L523, LIA L339, Biometric L215, CPPARisk L758, CPPACyber L271, ADMT L590)

**c) `<title>` document titles** — pure product identifiers (statute name identifies product per ruling)
- DPIA L461, CPPAScope L214, CPPARisk L676, CPPACyber L185, ADMT L508, Ropa L24

**d) Step / section product headings** — "Step N — <label>", H3 module labels
- CPPARisk L776/849/883/895/918/949; CPPAHub L202; DPA L258/275

**e) Access/subscription messaging and product-guidance form prompts with no legal assertion**
- Gov L649; LIA L247/371/375/429/507; Biometric L274; CPPAScope L404/680/684/760; CPPARisk L710/792/1306; ADMT L544; Ropa L32/42/87/124/226/302/307; USNotice L53/88/94/95/151/173/179/219/282; EUNotice L44/51/104/115; NoticeBuilder L64/71/72/110/122/194/212; Registration L35/39/47/79/120/121/221/230; CPPAHub L138

**Estimated Class-A total: ~90 strings (~18% of 496).** Everything else — statutory citations, RequirementBadge law-assertions, InfoPopover/StatutePopover text, sample-report bullets, contract-bound `<option value=…>` enums, and Class-C comments — stays put.

### Task 3 — Connector distribution target (no connector > 80%)

Planned mix across the ~90 rewrites:
- Parentheses (buttons/pricing): ~28%
- Colon (headings, labels, product prompts): ~26%
- Period / sentence split (long product-mechanic sentences): ~22%
- Comma (short access clauses): ~18%
- " · " / drop-dash (titles, taglines): ~6%

### Task 4 — H1 pass

Group B page H1s already surveyed: none contain em-dashes at HEAD (spot-check: Gov "A structured review…", DPIA "Impact Assessment Builder", CPPARisk "CPPA Privacy Risk Assessment", CPPACyber "CPPA Cybersecurity Audit Readiness", Ropa "Build an audit-ready Record…", ADMT "ADMT Compliance Assessment", NoticeBuilder "Generate your privacy notices…" ← the `<title>` attribute passed to a hero component is on my rewrite list because it renders as an H1 in that component's shell). H1 ban satisfied.

### Task 5 — Frozen invariants

- Revision-claim arithmetic: no rewrite touches a claim-bearing string (no counts, no PROFESSIONAL_ANNUAL_FREE_RUN_VALUE_DISPLAY strings on Group B landings; verified by scan).
- Pricing tokens: `PRICING`, `PRICING_REGISTRY`, `INTELLIGENCE_PRICING` interpolations preserved verbatim inside rewritten templates.
- Contract-bound enum values (DPA `retentionChoice` / `auditRightsChoice`, Governance/CPPARisk Radio option strings used in equality checks): **not touched**.
- Class-D `"—"` placeholder tokens (NoticesRopaHub, LegitimateInterestTracker fallback): **not touched**.
- Class-C code comments: **not touched**.
- Zero admin/**, zero supabase/, zero edge deploys, frontend strings only.

### Task 6 — Report shape (delivered on completion)

- Full 18-file inventory table with pre / post occurrence counts (grep -o methodology)
- Single before/after string table (~90 rows) grouped by file
- Survivors list per file (Class-B/C/D with one-line reason each)
- Connector distribution table (actual vs. planned)
- Task-status closeout covering all PP-7a tasks (7a.1a, 7a.1b, 7a.1b-FIX, 7a.1b-2, 7a.2)
- Deviations list

### Deferred out of PP-7a.2 (by prompt scope)

- REV-1 claim alignment
- Any file outside the 18 above (e.g. `/samples`, `/tools`, admin/**)
- Result-page components (`*Result.tsx`) — these are report renderers, not landing pages
- Sub-components on the intake shells (RailEntries, InlinePricingBadge, etc.) — untouched; sweep is confined to the page files themselves

### Ready to execute

On approval, I execute all ~90 rewrites in one dispatch, run `grep -o "—" | wc -l` per file for post-edit proof, and produce the full report. Stop after reporting.
