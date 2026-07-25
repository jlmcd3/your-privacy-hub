# W24-ADMT-H6-GOVERNING-ANCHOR — 2026-07-25

**Dispatch:** W24-ADMT-H6-GOVERNING-ANCHOR-2026-07-25 (controller tick 18:53Z; five-lens TEAM-REVIEWED; review gate delegated to controller per CEO ruling 2026-07-25 #9).
**Function:** `run-admt-checker` (deploy turn, ONLY).
**BUILD_STAMP:** `w24-admt-h6@2026-07-25T19:01:28Z` (fresh `date -u` read immediately before build).
**Prior BUILD_STAMP:** `w24-admt-audit@2026-07-25T18:39:43Z`.
**Deploy:** 2026-07-25T19:02:26Z (well before 19:25Z hard cutoff; wave-25 window ~19:45Z untouched).

---

## 1. Finding closed

`h6_admt_governing_anchor` (deterministic HIGH, recurring). Definitional provisions of 11 CCR § 7001 (observed subdivisions: § 7001(e), § 7001(e)(1), § 7001(ddd)) were cited as the SOLE governing anchor on action/duty items on the customer surface. A definition may SUPPORT a duty but cannot GOVERN it — the governing anchor must be a duty-imposing ADMT-subchapter provision.

### Evidence pins

| Doc | Wave | Shape observed | This turn's outcome |
|---|---|---|---|
| `731689ba` | 21 | action entry, sole citation `11 CCR § 7001(e)(1)`, `proposition_key = ra_trigger_admt` | PROMOTED → `11 CCR § 7150(b)(3)` with byte-exact registry quote; `_va_stamp.promoted_from = ["11 CCR § 7001(e)(1)"]` |
| `731689ba` | 21 | action entry, sole citation `11 CCR § 7001(ddd)`, no resolvable `proposition_key` | INFO-NEEDED — anchors cleared, `_va_stamp_unresolved.reason = "h6_sole_7001_governing_anchor_unresolvable"`, prose untouched |
| `eefadb3f` | earlier | deadline_table entry, sole citation `11 CCR § 7001(e)`, `proposition_key = notice_optout` | PROMOTED → `11 CCR § 7220(c)(2)` with byte-exact registry quote |

---

## 2. Delivered artifacts

- **NEW** `supabase/functions/run-admt-checker/_w24_admt_h6.ts` — helpers `isSection7001`, `collectAnchors`, `hasSole7001Anchor`, `resolveDutyAnchor`; orchestrator `applyW24AdmtH6`; export `W24_ADMT_H6_STAMP`; `_internals` surface.
- **NEW** `supabase/functions/run-admt-checker/_w24_admt_h6.test.ts` — 20 colocated tests (regression pins, promotion, info-needed routing, immutability, idempotency, fail-open, stamp-echo).
- **EDIT** `supabase/functions/run-admt-checker/index.ts` — `BUILD_STAMP` bump; import of `applyW24AdmtH6`/`W24_ADMT_H6_STAMP`; wire seam AFTER `applyW24AdmtAudit` and BEFORE the LEAK-PREV-P1 emit gate, wrapped in `try/catch` with structured `evt=_w24_admt_h6` log.
- **DOCS** `docs/pipeline-state.md` — item 78 appended in §8, header restamped to `2026-07-25T19:02:39Z`.
- **DOCS** this courier.

Zero edits to prompts, rubrics, graders, goldens, contracts, fixtures, samples, registries, or corpus tables. Registry is READ-ONLY input; instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) remains FROZEN.

---

## 3. Design summary (per-entry contract)

For every entry in the duty/action buckets:

```
DUTY_BUCKETS = [
  top_3_actions, priority_actions, deadline_table,
  opt_out_gaps, notice_gaps, access_gaps, documentation_to_maintain
]
```

1. Collect anchors from `citation`, `regulatory_citation`, `subsection`, `_va_stamp.subsection`, and every string/object in `citations[]`.
2. **Sole-§7001 test:** ≥ 1 anchor present AND every anchor matches `§ 7001` (any subdivision). Otherwise: no-op (tagged `_w24_h6_ran`).
3. On hit, `resolveDutyAnchor(entry.proposition_key)` looks up the ADMT verified-authority registry. **The registry is READ-ONLY here.** If the row's top-level `citation` is § 7001, treat as unresolvable (definitional rows never promote themselves).
4. **PROMOTE** (registry row present, duty-imposing): install the row's byte-exact `subsection` into `citation` / `regulatory_citation` / `subsection`, the row's byte-exact `verbatim_quote` into `verbatim_quote`, and stamp `_va_stamp = { proposition_key, citation, subsection, verbatim_quote, promoted_from, source: "w24_admt_h6" }`.
5. **INFO-NEEDED** (unresolvable): clear the citation-bearing fields, drop `_va_stamp`, clear `citations`, stamp `_va_stamp_unresolved = { proposition_key, reason: "h6_sole_7001_governing_anchor_unresolvable", message: renderMessage("unresolved.authority") }`. Prose fields (`action`, `description`, etc.) are **not modified** — § 7001 mentions remain as definitional support in narrative.
6. Tag `_w24_h6_ran = true`. Second call is a no-op (see idempotency test).

Fail-open at every helper (try/catch + `console.warn`) and at the orchestrator; availability is never blocked. Telemetry lands ONLY under `_meta.internal.admt_h6` (whitelist serializer preserves `_meta.internal` verbatim — item-32 gate satisfied). Per-run `evt=_w24_admt_h6` structured log emitted from `index.ts`.

---

## 4. Test paste (20/20 green)

```
running 20 tests from ./_w24_admt_h6.test.ts
stamp format ... ok (0ms)
isSection7001 matches all § 7001 subdivisions ... ok (0ms)
collectAnchors pulls scalar + stamp + citations[] ... ok (0ms)
hasSole7001Anchor true when every anchor is § 7001 ... ok (0ms)
hasSole7001Anchor false when any anchor is duty-imposing ... ok (0ms)
hasSole7001Anchor false when no anchors present (no-op path) ... ok (0ms)
resolveDutyAnchor promotes duty-imposing row (ra_trigger_admt → § 7150) ... ok (0ms)
resolveDutyAnchor refuses § 7001-definitional rows (admt_def) ... ok (0ms)
resolveDutyAnchor null on unknown key (never fabricates) ... ok (0ms)
regression pin 731689ba — sole § 7001(e)(1) anchor with resolvable key → PROMOTED ... ok (0ms)
regression pin 731689ba — sole § 7001(ddd) anchor with NO key → INFO-NEEDED (never fabricated) ... ok (0ms)
regression pin eefadb3f — sole § 7001(e) anchor on deadline_table with resolvable key → PROMOTED ... ok (0ms)
duty entry with proper subchapter pinpoint UNTOUCHED ... ok (0ms)
§ 7001 as SECONDARY support alongside subchapter anchor UNTOUCHED ... ok (0ms)
idempotency: second call is a no-op beyond stamp echo ... ok (0ms)
fail-open on null / malformed report ... ok (0ms)
empty report is a no-op and does not crash ... ok (0ms)
anchor keys in OTHER buckets untouched (non-duty buckets ignored) ... ok (0ms)
stamp echo lands on _meta.internal.admt_h6 ... ok (0ms)
_internals surface exports for auditability ... ok (0ms)

ok | 20 passed | 0 failed (15ms)
```

---

## 5. Pre-deploy lock snapshot (2026-07-25T19:01:34Z)

```
active_qb   pending_admt
0           0
```

(quality_batch_runs in {running, pending} = 0; cppa_assessments with NULL `report_data` and `created_at > now() - 15m` = 0. Re-checked immediately before deploy.)

---

## 6. Boot-log build_stamp proof (post-deploy)

```
2026-07-25T19:02:26Z INFO {"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w24-admt-h6@2026-07-25T19:01:28Z","va_version":"admt-va-w8-2026-07-24","va_rows":34}
2026-07-25T19:02:26Z INFO [run-admt-checker] boot admt_attr_w24_stamp=w24-admt-attr@2026-07-25T18:28:00Z
2026-07-25T19:02:26Z INFO [run-admt-checker] boot build_stamp=w24-admt-h6@2026-07-25T19:01:28Z
2026-07-25T19:02:26Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w24-admt-h6@2026-07-25T19:01:28Z"}
```

---

## 7. Constraints honored

- Instrument s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN — zero edits to prompts/rubrics/graders/goldens/contracts/fixtures/samples/registries/corpus. Registry used strictly as READ-ONLY input.
- No Fable-5; no pricing/payment/design-token/customer-revision/signup surfaces; no sample regeneration; no intake-contract changes.
- h7_admt_blanket_range NOT touched (remains QUEUED for its own turn).
- LEAK-PREV P0-P2 intact; no schema edits (telemetry rides `_meta.internal` per the whitelist-serializer preservation clause).
- Anchor-key immutability: this module is the sole sanctioned writer of citation-bearing anchors and only on a confirmed sole-§7001 hit; every other field is untouched.
- Idempotent (`_w24_h6_ran` tag); fail-open at every helper and the orchestrator.
- Fresh sandbox clock (`date -u`) read immediately before BUILD_STAMP composition; echoed in boot log.

---

## 8. Queue posture after this turn

- `h7_admt_blanket_range` — QUEUED (its own turn; not started).
- No other dispatch authorized by the 18:53Z message.
