# CORPUS TAGGING TAXONOMY (proposal — sweep v2)

**Status:** DRAFT for CEO decision. Extends `corpus_sweep_results` (sweep v1) with the
attribute set needed to bucket every ingested record for downstream products
(enforcement archive, LIA precedent library, guidance corpus, news digest, briefs).

Design rule: **one record can carry many uses**. `record_class` answers "what is this
document?" (single-valued). `usable_for` answers "which product buckets may draw on it?"
(multi-valued). Every other attribute is an independent axis so a later pass can filter
without re-reading the text.

---

## Axis 1 — `record_class` (what the document IS) — single value

| Value | Definition |
|---|---|
| `enforcement_decision` | Regulator's final decision imposing a sanction, order, reprimand or undertaking |
| `enforcement_procedural` | Regulator step short of a final decision (opening of inquiry, statement of objections, referral) |
| `regulator_guidance` | Guidelines, opinions, recommendations, FAQs, toolkits issued by a regulator/EDPB |
| `statutory_code` | Codes of practice with "must take into account" status |
| `legislation_or_provision` | Statute/regulation text or amendment |
| `court_judgment` | Court or tribunal ruling (incl. CJEU, appeals from regulators) |
| `litigation_matter` | Private/class litigation not yet a judgment |
| `breach_notification` | Incident/breach report or breach statistics |
| `news_or_press` | Journalism, press release, regulator newsroom item |
| `consultation_draft` | Draft under public consultation (not settled authority) |
| `site_boilerplate` | Cookie/privacy/about/sitemap pages captured by the crawler |
| `junk_asset` | Images, CSS, JS, fonts, binaries |
| `insufficient_content` | Real page but too little text to be usable |
| `unclassified_document` | Deterministic rules could not decide |

## Axis 2 — `usable_for` (product buckets) — multi-value

`enforcement_database`, `li_precedent_candidate`, `guidance_corpus`,
`authority_rules_source`, `news_digest`, `weekly_brief`, `breach_intelligence`,
`litigation_watch`, `legislation_tracker`, `training_context_only`, `needs_triage`,
`discard`.

`training_context_only` = readable and true but not citable (press summaries,
secondary reporting). Nothing tagged that way may ever be pinned in a report.

## Axis 3 — Authority weight (drives whether a product may cite it)

- `authority_tier`: `binding` | `statutory_code` | `guidance` | `analogy` | `persuasive` | `non_authority`
- `settledness`: `final` | `under_appeal` | `annulled` | `superseded` | `consultation_draft` | `unknown`
- `citability`: `citable_verbatim` | `citable_summary_only` | `not_citable`
  (requires stored source text + hash + reachable URL for `citable_verbatim`)

## Axis 4 — Legal subject matter (what the matter is ABOUT) — multi-value `topic_tags`

`legitimate_interests`, `consent`, `transparency`, `data_minimisation`, `security_art32`,
`breach_notification`, `dsar_rights`, `international_transfers`, `direct_marketing_pecr`,
`cookies_tracking`, `adtech_profiling`, `admt_ai`, `biometrics`, `children`,
`employee_monitoring`, `special_category`, `dpo_governance`, `ropa_records`,
`dpia_required`, `processor_contracts`, `retention`, `credit_fraud_scoring`.

**LIA-specific sub-axis** (the "is this a Legitimate Interest matter?" question):
- `li_relevance`: `direct` (LI was the pleaded/decided basis) | `adjacent` (balancing,
  expectations or necessity reasoning without an LI holding) | `none`
- `li_factor_tags`: `purpose_legitimacy`, `necessity`, `balancing`, `reasonable_expectations`,
  `less_intrusive_means`, `safeguards`, `opt_out`, `children_vulnerability`, `special_category_bar`
- `li_posture`: `upheld` | `rejected` | `conditional` | `not_reached`

## Axis 5 — Provenance & jurisdiction

- `regulator_canonical` (normalised authority id), `jurisdiction_code` (e.g. `EU_GDPR`, `UK_GDPR`, `US_CA`)
- `forum`: `regulator` | `court` | `legislature` | `media` | `industry`
- `source_type`: `regulator_primary` | `regulator_secondary` | `aggregator` | `media` | `unknown`
- `language_original` + `translation_state`: `english_native` | `translated` | `untranslated`

## Axis 6 — Evidence quality (already partly in v1)

- `content_score` 0-100, `text_len`, `has_subject`, `has_date`, `has_fine`
- `has_source_document` (stored text), `has_source_hash`, `url_reachable_at_sweep`
- `pin_ready` = stored text ≥ 400 chars AND hash present AND URL present
- `dedupe_signature` (regulator + subject + date + fine hash) → `duplicate_of` pointer

## Axis 7 — Workflow state

- `confidence` 0-1 and `tagged_by`: `deterministic` | `model` | `human`
- `needs_ai_review` (missing subject/class only), `review_state`:
  `untouched` | `auto_tagged` | `needs_human` | `ratified` | `rejected`
- `ratified_by` / `ratified_at` / `ledger_ref` — nothing reaches a customer surface
  without a ratification stamp, matching the LIA rules discipline.

---

## Pass order (cheap → expensive)

1. **Sweep v2 (SQL, zero credits)** — Axes 1, 2, 5, 6, plus deterministic parts of 3 and 4
   (URL/regulator/keyword driven), dedupe signatures, `pin_ready`.
2. **Cheap model pass (background trickle)** — only rows where v2 left
   `unclassified_document`, missing subject, or `li_relevance = unknown`. Batch of 6 per tick,
   resumable cursor, results into the shadow table with `tagged_by='model'`, confidence.
3. **Human ratification** — only for rows a product will actually cite
   (LI precedent candidates, guidance corpus, authority rules).
4. **Promotion** — a separate, reversible step writes approved tags onto
   `enforcement_actions` / surface gating. Nothing live changes before then.
