# Public Pages Audit — End User Privacy
Generated: 2026-07-13

Scope: every public (non-admin, non-authenticated-workspace) route registered in `src/App.tsx`, plus global chrome (Navbar, Topbar, Footer, BreakingNewsBanner).

Method: source-of-truth audit. Typography analysis based on Tailwind classes in the JSX plus the semantic token map in `src/index.css` and `tailwind.config.ts`.

Token reference:
- `.text-hero-h1` / `.text-page-h1` / `.text-section-h2` / `.text-card-title` / `.text-eyebrow` / `.text-meta` / `.text-label-caps` / `.text-cta` / `.text-body` / `.text-body-tiny`
- Fonts: `font-display` / `font-serif` = DM Serif Display; `font-sans` = DM Sans (body 16px); `font-mono` = DM Mono
- Brand colors: `brand-navy #0d2a45`, `brand-ocean #1a4a6e`, `brand-teal #2a9d8f`, `brand-slate-teal #2d7a8a`, `brand-cloud`, `brand-mist`, `brand-steel`; amber-400/500 accent

For each element the audit lists (1) Typography, (2) Messages (with in-element duplicate flags), (3) Recommendations covering copy/voice, typography/token discipline, layout/CTA, and SEO Helmet alignment.

---

# Cross-Page Systemic Findings (read first)

These recur on many pages; fixing them once in the shared components fixes them everywhere:

1. **Hero background color drift.** At least five distinct dark-hero values in use — `bg-[#0d2a45]` (LIA, Governance, RoPA, Registration), `bg-[#1a4a6e]` (CPPA sub-tools), `bg-[#2d7a8a]` (Updates, Calendar, Enforcement list, Glossary, Horizon, IR Playbook, Biometric Checker, Get Intelligence), `bg-slate-900` (shared `PageHero.tsx` → Notice Builder, EU Notice, US Notice), plus `bg-brand-navy` used correctly on the CPPA Hub CTA band and Topbar. All of these are token-equivalent to `brand-navy`, `brand-ocean`, or `brand-slate-teal` and should be swapped to token classes. `#2d7a8a` in particular is used on ~8 pages and matches the documented `--brand-slate-teal` token exactly.
2. **H1 token inconsistency.** `text-hero-h1` is used correctly on ~8 pages (LIA, Governance, Biometric, all CPPA sub-tools, GlobalAuthorities, USPrivacyLaws, Glossary). Bare `font-serif`/`font-display text-white` is used on DPA, IR Playbook, RoPA, Registration Manager, Contact, About, FAQ, Subscribe, JurisdictionsHub, USStateComparison, Get Intelligence, and all `PageHero`-based pages. `CPPAHub` uses a third token (`text-page-h1`). Standardizing `PageHero.tsx` and the bare-`font-serif` H1s would align ~15 pages at once.
3. **Ad-hoc eyebrow implementations.** `.text-eyebrow` exists as a token (12px / 700 / uppercase / letter-spaced) but at least 8 pages reimplement it inline with slight variations: `text-[10px]`, `text-[11px]`, `text-xs font-bold tracking-widest`, `text-xs font-medium rounded-full bg-amber-500/20`, `text-sm font-medium text-muted-foreground`, `.text-meta font-semibold tracking-wider uppercase`, and more. Result: no single eyebrow scale across the site.
4. **Card-title inconsistency.** `.text-card-title` exists but "card title" is implemented at least 4 ways: bare `<h2>` (default fluid), bare `<h3>` (default 17–18px serif), hardcoded `text-[15px]`, and hardcoded `text-lg`. Enforcement, Timelines, Glossary, LegislationTracker, LI Tracker, StartNew and Homepage tool cards each pick a different one.
5. **`<h2>` misused as inline labels.** EnforcementActionDetail ("Key compliance failure", "Violation types", "Data categories", "Violation summary", "Relevant compliance tools" — 5x), GlossaryTerm ("Definition", "Definitions across regimes", "Related Terms"), and Enforcement archive ("Premium archive") mark small uppercase labels as full `<h2>` — visually oversized and polluting the document outline for SEO/AT.
6. **Brand voice violations.** No occurrences of the banned word "gap" were found in scanned copy. "AI-generated" / "AI analysis" / "AI-assisted" DO appear on Homepage "How it fits together" (Monitor column), About "Why EUP" (item 2), FAQ ("AI-assisted analysis"), and Subscribe ("AI investigation prompt on every article"). Convert to "automatically generated" / "enriched with regulatory context" per the voice rule.
7. **Content typos / errors.**
   - LI Tracker upsell footer eyebrow: **"⭐ Intelligence Intelligence"** — duplicated word.
   - LI Assessment intro: **"actionable Intelligence"** with stray mid-sentence capital — reads as a typo, not the brand term.
   - Subscribe H1: **"Two plans. One Mission."** — inconsistent title casing.
   - USPrivacyLaws Recent Developments banner: `text-sm md:text-sm` — no-op responsive class.
   - RegulatorPage Recent Developments card title: **`text-[9px]`** — almost certainly a bug; card titles are unreadable at 9px.
   - EU Notice Landing Helmet title uses **"EndUserPrivacy"** (no spaces); every other page uses **"End User Privacy"** (with spaces).
   - EnforcementActionDetail links back to `/enforcement-intelligence` (and sets canonical to `/enforcement-intelligence/{id}`) while the route is `/enforcement/:id` — broken navigation / bad canonical.
   - Terms of Service still contains Shopify e-commerce boilerplate ("Our store is hosted on Shopify Inc.", "digital downloadable products", "dealers, resellers or distributors") — not customized for the SaaS product.
   - Privacy Policy: Google AdSense mechanism (including opt-out URL) explained twice within ~50 lines (Section 4 and Section 5).
   - USStateComparison JSON-LD hardcodes "20 enacted" while the page counts `states.length` dynamically — drift risk.
   - JurisdictionsHub hero copy tells users to "Switch to Grid view" — no grid view exists on the page.
8. **Chip/H1 literal duplication.** Governance Assessment, IR Playbook, LI Assessment, Scope Checker, About (eyebrow "ABOUT END USER PRIVACY" + H1 "About End User Privacy"), Updates, and Enforcement all echo the H1 verbatim (or with only casing changed) in the eyebrow chip.
9. **Response-time SLA inconsistency.** About page says "within one business day"; Contact page says "typically respond within 24 hours".
10. **Canonical URL formatting.** JurisdictionPage, GlobalAuthorities, RegulatorPage, USStateLawPage use absolute canonicals (`https://enduserprivacy.com/...`); BreachNotification and CrossBorderTransfers use relative paths (`/breach-notification`). Standardize to absolute.
11. **Free-tool upsell banner copy-pasted.** Calendar and Timelines both hand-render the same amber banner instead of using a shared `<FreeToolUpsell/>` component.
12. **Mixed shadcn/brand token vocabularies on the same page.** USStateComparison and CookieConsent mix `text-foreground`/`text-muted-foreground`/`text-accent` (shadcn semantic) with `brand-navy`/`text-slate`/`brand-teal-text` (brand tokens) in the same file.
13. **BreakingNewsBanner** uses inline `style={{ backgroundColor: "hsl(var(--navy))", fontFamily: "'DM Sans', sans-serif" }}` — bypasses the Tailwind token system for both color and font.

---

# 1. Marketing & Core Pages

(sub_an3044he)

## `/` — Home
File: `src/pages/Index.tsx`

### Elements

- **Helmet (SEO)**
  - **Typography**: n/a
  - **Messages**: Title "Global Privacy Law, Tracked Daily | End User Privacy"; meta description repeats pricing block also shown in hero and pricing strip.
  - **Recommendations**:
    - Title aligns with visible H1 ("Global privacy law — tracked daily.") — good.
    - Meta description duplicates copy already present verbatim in `SearchFirstHero` and `HomepagePricingStrip` — acceptable for SEO but confirm it doesn't read as stale if pricing changes (uses `PRICING` config, so fine).

- **SearchFirstHero**
  - **Typography**:
    - H1 "Global privacy law — tracked daily." → `.text-hero-h1 text-white` (DM Serif Display, fluid 40–56px, white — hardcoded, but intentional per dark-hero convention).
    - Sub-eyebrow line → `text-xl md:text-2xl font-semibold tracking-widest uppercase text-blue-300` — large (20-24px) uppercase eyebrow; unusually large for an "eyebrow" role and uses raw Tailwind `blue-300` instead of `brand-*`/`text-eyebrow` token.
    - Secondary headline → `font-display text-3xl md:text-4xl text-white/95` — a second serif "headline," not tokenized (should map to `text-section-h2`).
    - Body paragraph → `text-blue-100 text-sm md:text-base` — hardcoded Tailwind blue instead of `brand-mist`/`brand-cloud`.
    - CTA buttons → plain Tailwind (`font-semibold`), no `.text-cta` token; primary CTA bg `#C8922A` hardcoded hex instead of `amber-400/500` or `brand-*` token.
    - Pricing note → `text-white/95 text-meta`.
  - **Messages**: "Global privacy law — tracked daily." (H1); "California's CPPA deadlines are here" / EU variant (eyebrow); "Find out which CPPA rules apply to you — free." / EU variant (sub-headline); paragraph repeating CPPA/DPIA detail; CTA "Run the free CPPA Scope Checker →"; "View a sample report →"; pricing note.
    - Flag: H1 talks broadly ("Global privacy law"), while eyebrow + subhead + paragraph all pivot immediately to a single geography-specific promotion (CPPA or EDPB) — three consecutive statements re-pitch the same CPPA/DPIA CTA (eyebrow, subhead, paragraph, and button all reference CPPA/DPIA) — redundant emphasis, diluting the "global" positioning of the H1.
  - **Recommendations**:
    - Copy: eyebrow/sub-headline/paragraph triple-state the same single-geography pitch — cut to one clear statement + one CTA; consider whether a "global" H1 immediately narrowing to one country reads as bait-and-switch above the fold.
    - Typography: eyebrow (`text-xl/2xl` uppercase) is oversized for an eyebrow role — should use `.text-eyebrow` (12px) token; the "sub-headline" duplicates H1's serif treatment without using `.text-section-h2`; multiple hardcoded Tailwind colors (`blue-300`, `blue-100`, `#C8922A`) should be replaced with `brand-mist`, `brand-cloud`, `amber-400/500` tokens for consistency and future maintainability.
    - Layout/CTA: two competing CTAs (tool-specific + "sample report") is reasonable, but the tertiary "pricing note" beneath adds a third message before any scroll — consider consolidating trust signals.
    - SEO: H1 matches Helmet title well.

- **HomeGeographyPaths**
  - **Typography**:
    - Card eyebrows → `.text-eyebrow text-red-800` / `.text-eyebrow text-brand-teal-text` — one uses a raw Tailwind red, not a brand/severity token (should be `severity-critical` or similar) for consistency.
    - Card H2s → `text-brand-navy font-display text-xl` — bypasses `.text-section-h2`/`.text-card-title` tokens, custom size.
    - Body → `text-sm text-slate`.
    - CTA → `text-sm font-semibold` inline styles, not `.text-cta`.
    - Footer trust line → `.text-meta text-slate italic`.
  - **Messages**: "California CPPA deadlines" / "EU GDPR compliance" (two parallel path cards); "Check your CPPA scope" / "Start GDPR Governance Assessment" CTAs; "View a sample report →" (both cards, identical wording — acceptable as parallel structure, not a flaw); trust line "Primary-source cited. Outputs support your legal review — they do not replace legal judgment."
  - **Recommendations**:
    - Copy: This section repeats the CPPA message already delivered in the Hero (for non-EU visitors) and will repeat again in `CPPADeadlineStrip` immediately below — three consecutive CPPA mentions before any other content. Consolidate Hero + this section's CPPA card, or drop the redundant CPPA card here since the deadline strip covers it.
    - Typography: card headings should use `.text-card-title`/`.text-section-h2` tokens rather than ad hoc `text-xl`; `text-red-800` eyebrow should map to a severity/brand token.
    - Layout: three CPPA-focused elements stacked (Hero → this → CPPADeadlineStrip) is repetitive above the fold; consider merging into one strong geography-routing module.

- **CPPADeadlineStrip**
  - **Typography**: "CPPA's Audits Division is active." → plain `font-semibold` (no size class, inherits ~14px body); date chips → `text-xs`; CTA "Check your scope free →" → `text-brand-teal-on-navy font-semibold` inline, no `.text-cta`.
  - **Messages**: "CPPA's Audits Division is active."; 3 deadline chips (ADMT disclosures, Risk-assessment lookback, First audit certifications); CTA "Check your scope free →" — this is the fourth CPPA-scope CTA on the page (Hero, HomeGeographyPaths, this strip, and again in HomepageToolsSection catalogue).
  - **Recommendations**:
    - Copy: redundant with Hero and HomeGeographyPaths — by this point the visitor has seen "CPPA scope checker" messaging 3 times in a row. Recommend collapsing into a single authoritative CPPA module or moving this strip to a less repetitive position (e.g., only for jurisdiction-relevant returning visitors).
    - Typography: strip uses no semantic token classes at all (raw Tailwind sizes) — bring into line with `.text-meta`/`.text-cta` conventions used elsewhere.
    - Layout: a third consecutive navy/dark band (Hero is dark, this strip is dark navy) creates visual monotony without an intervening light section — consider spacing/contrast variation.

- **HomepageFeedSection** (via `SectionShell`)
  - **Typography**: Eyebrow "Privacy Intelligence Feed" → `.text-eyebrow !text-sm text-[hsl(var(--cobalt))]` (overriding default eyebrow size with `!text-sm`, an escape-hatch pattern that fights the token). Headline "Daily developments, with analysis beneath the story" → `.text-section-h2 text-brand-navy`. Subline → `text-base text-slate`. CTA "Open feed →" → `.text-cta` token used correctly.
  - **Messages**: eyebrow/headline/subline describe the same feed concept from three angles — acceptable but headline and subline both essentially say "live data + analysis," bordering on redundant.
  - **Recommendations**:
    - Typography: the `!text-sm` override on `.text-eyebrow` inside `SectionShell` (used by all Section components) suggests the token's default size doesn't fit this usage — either adjust the token or remove the override pattern site-wide to avoid drift.
    - Copy: tighten subline to avoid restating headline's "analysis" concept.
    - Good: this is the only section using `.text-cta` consistently — a positive model for the rest of the page.

- **HomepageBriefSection**
  - **Typography**: same `SectionShell` tokens (eyebrow/section-h2/subline/cta) — consistent.
  - **Messages**: "Weekly Privacy Intelligence Report" / "Build a sample brief for your role" / "Choose your jurisdiction, responsibilities, and topic tracks to preview the Monday brief format." — headline and subline overlap slightly ("brief for your role" vs. "preview...format") but distinguishable (action vs. explanation).
  - **Recommendations**:
    - CTA `ctaHref="/subscribe"` labeled "See plans →" while the module's actual affordance is the embedded BriefBuilder (build-a-sample) — CTA text/destination mismatch versus the section's stated action; consider aligning CTA to preview/build language or to `/get-intelligence` (the dedicated sample-builder page) instead of jumping straight to pricing.

- **"How it fits together" section** (inline in Index.tsx)
  - **Typography**:
    - Eyebrow "How it fits together" → `.text-eyebrow !text-sm text-brand-steel` (again `!text-sm` override).
    - H2 "From intelligence to action — in the same platform." → `.text-section-h2 text-brand-navy`.
    - Column H3s ("Monitor"/"Analyse"/"Act") → bare `<h3 className="text-brand-navy mb-1">`, relying only on global `h3` CSS (17–18px serif) — no semantic utility class, inconsistent with card-title/section patterns used elsewhere.
    - Body → `text-sm text-gray-600` — hardcoded Tailwind gray instead of `text-slate`/`brand-steel` token used throughout rest of site.
  - **Messages**: "Monitor" — daily worldwide tracking + AI enrichment; "Analyse" — weekly report; "Act" — 13 compliance tools, 4 generations included. These three restate, almost verbatim, the "monitoring layer / intelligence layer / action layer" structure used in the Subscribe page's comparison table — consistent narrative across pages, good, but within this element itself no redundancy.
  - **Recommendations**:
    - Copy: "AI analysis" phrase in the Monitor column conflicts with brand voice guidance (should read "automatically generated"/"enriched" not "AI analysis"/"AI-generated").
    - Typography: replace bare `<h3>` with `.text-card-title` for consistency; replace `text-gray-600` with `text-slate` or `brand-steel` to stop hardcoded-color drift.
    - Layout: this section is sandwiched between Feed and Tools sections without a `SectionShell` card wrapper, breaking the otherwise consistent white-card rhythm of the page — consider wrapping in `SectionShell` for visual consistency.

- **HomepageToolsSection**
  - **Typography**: Uses `SectionShell` tokens correctly for eyebrow/headline/subline/cta. Trust-strip row → `text-meta text-slate-500` (hardcoded Tailwind `slate-500` vs. token `slate`/`brand-steel`). Column labels ("Assessments"/"Compliance documents") → `.text-eyebrow text-[hsl(var(--cobalt))]`. Card titles → bare `<h3 className="text-brand-navy mb-1">` (again unstyled semantic h3, no card-title token). Card blurbs → `.text-meta text-slate`.
  - **Messages**: subline restates "enforcement decisions" theme already used 3+ times on this page (Hero paragraph, How-it-fits-together "Act" column, this section) — consistent but highly repetitive phrase ("calibrated/enforcement decisions") across nearly every section of the homepage.
  - **Recommendations**:
    - Copy: the enforcement-citation claim appears in at least 4 separate homepage sections; vary phrasing to avoid the page reading as one repeated marketing line.
    - Typography: card titles should use `.text-card-title`, not bare `<h3>`; `text-slate-500` should be replaced with a token.
    - CTA: "Browse tools →" is good and matches destination `/tools`.

- **HomepagePricingStrip**
  - **Typography**: Eyebrow "Subscription options" → `.text-eyebrow text-brand-teal-on-navy`. H2 → `.text-section-h2 text-white`. Body → `text-sm text-blue-100/80` (hardcoded blue vs. `brand-mist`/`brand-cloud`). CTA "See plans →" → plain Tailwind, not `.text-cta`.
  - **Messages**: pricing line duplicates, near-verbatim, the pricing note already shown in `SearchFirstHero` ("Intelligence from $X/month · Professional from $Y/month + $Z/client/year · Tools available standalone") and in the Helmet meta description — same sentence appears 3 times across the page.
  - **Recommendations**:
    - Copy: strong redundancy — the exact pricing sentence is repeated at top of page, in meta description, and at the bottom; consider varying the framing at the footer strip (e.g., emphasize trial/urgency instead of restating the same figures).
    - Typography: `text-blue-100/80` should be a brand token; CTA text should use `.text-cta`.
    - Layout: good placement as a closing CTA band immediately before Footer — appropriate above/below-the-fold logic for a closer.

- **Footer**
  - Not itself requested in detail, but note global footer appears after pricing strip on every page — consistent site pattern, no page-specific issue found here.

---

## `/about` — About
File: `src/pages/About.tsx`

### Elements

- **Hero**
  - **Typography**: Eyebrow "ABOUT END USER PRIVACY" → `.text-meta font-semibold tracking-wider uppercase text-brand-mist` — combines `.text-meta` (13px, weight 400) with `font-semibold` override, then adds tracking/uppercase manually instead of using `.text-eyebrow` token, which already encodes uppercase/tracking/weight — token misuse/duplication.
  - H1 "About End User Privacy" → `font-display text-white` (relies on global `h1` sizing, not `.text-hero-h1`) — inconsistent with Home/Contact/FAQ hero pattern which also use `font-display` bare h1, but differs from Index's `.text-hero-h1` on a dark background — inconsistent hero H1 treatment across pages.
  - Subhead → `text-blue-200/80 text-base md:text-lg` — hardcoded Tailwind blue instead of `brand-mist`.
  - **Messages**: "About End User Privacy" (H1, literally repeats the eyebrow's text almost verbatim: "ABOUT END USER PRIVACY" eyebrow → H1 "About End User Privacy" — direct duplication of wording within the same hero element). "Monitoring regulatory authorities across the world, updated daily." (subhead).
  - **Recommendations**:
    - Copy: eyebrow directly restates the H1 with only casing changed — remove redundancy; eyebrow should preview or contextualize, not repeat, the H1.
    - Typography: use `.text-eyebrow` instead of manually reconstructing uppercase+tracking+meta; align H1 with `.text-hero-h1` (dark background) per the token map's stated pattern for dark hero sections.
    - Color: `text-blue-200/80` hardcoded — replace with `brand-mist`/`brand-cloud`.

- **Stats row**
  - **Typography**: Values ("Global"/"Worldwide"/"Daily"/"Free") → `font-display text-[36px] md:text-[44px] font-bold text-brand-navy` — arbitrary pixel values instead of `.text-display-hero`/`.text-page-h1` tokens; `font-bold` on a serif display face is atypical (brand type scale specifies weight 400 for display).
  - Labels → `text-sm text-slate font-medium`.
  - **Messages**: "Global / Regulatory Authorities", "Worldwide / Coverage", "Daily / Update Frequency", "Free / To Browse" — "Global" and "Worldwide" as adjacent stat values are near-synonyms describing overlapping claims — borderline redundant pairing.
  - **Recommendations**:
    - Copy: "Global" and "Worldwide" used as two separate "stat" values in the same row reads as padding rather than real metrics — consider replacing with an actual quantified metric (e.g., "150+ jurisdictions") for credibility, especially since the page elsewhere says "150+ jurisdictions" in the Free Tools list.
    - Typography: use type-scale tokens instead of arbitrary px values; drop `font-bold` on serif display to match brand weight-400 guideline, or intentionally document the exception.

- **Mission block**
  - **Typography**: Eyebrow "Our mission" → `.text-meta font-semibold tracking-wider uppercase text-brand-steel` (same non-token eyebrow pattern as hero). Blockquote → `font-display text-[22px] md:text-[28px] font-bold text-brand-navy` (arbitrary size, again `font-bold` on serif). Body → `text-[15px] text-slate`.
  - **Messages**: Mission quote about professionals spending time on expertise, not monitoring; paragraph below restates the same idea in different words ("monitors...enriches...delivers...for professionals who need to act") — the paragraph directly re-explains the blockquote's point, creating redundancy within one element.
  - **Recommendations**:
    - Copy: blockquote and following paragraph both make the identical "we do the manual work so you can act" claim — merge or clearly differentiate (e.g., blockquote = philosophy, paragraph = concrete mechanism only, trimming overlap).
    - Typography: arbitrary `text-[22px]/[28px]` should map to `.text-section-h2` or a new `.text-blockquote` token; remove ad hoc eyebrow reconstruction.

- **"What we cover" stat cards**
  - **Typography**: same arbitrary `text-[28px]/[36px] font-bold text-brand-navy` pattern as stats row.
  - **Messages**: "Global / Regulatory authorities monitored worldwide", "Daily / Jurisdictions covered, updated continuously", "Daily / Updated, enriched with regulatory context" — two of three cards use the identical value "Daily" with near-identical labels — clear internal redundancy within this element (2 of 3 cards say the same thing).
  - **Recommendations**:
    - Copy: consolidate the two "Daily" cards into one, and add a genuinely distinct third stat (e.g., jurisdiction count, enforcement decisions count already referenced elsewhere as "3,700+") — current set reads as filler duplicating the stats row above it.
    - Typography: same token-misuse issue as stats row.

- **"Why End User Privacy" section**
  - **Typography**: Eyebrow → `.text-eyebrow text-slate-400` (correct use of token here, inconsistent with other sections on same page that hand-roll eyebrow styles — internal inconsistency). H2 → `.text-section-h2 text-brand-navy` (correct token). Item H3s → bare `<h3 className="text-brand-navy mb-1">` (unstyled). Body → `text-sm text-gray-600` (hardcoded gray, inconsistent with `text-slate` used elsewhere on this same page).
  - **Messages**: Four differentiators — "Enforcement-calibrated, not statute-summarising"; "Intelligence, not aggregation"; "Intelligence and compliance tools in one platform"; "Personalised to your professional context." Items 1 and 3 both use "Intelligence" as a hook — mild lexical overlap but distinct claims.
  - **Recommendations**:
    - Copy: item 2 says "enriched with three layers of AI analysis" — flag brand-voice violation; should read "automatically generated analysis" / avoid "AI analysis" per style guide.
    - Typography: standardize eyebrow styling across the page and fix the `text-gray-600` vs `text-slate` inconsistency introduced within the same page.

- **Contact callout**
  - **Typography**: Body → `text-[15px] text-brand-navy`. Link → `text-brand-mist font-semibold` — a light/muted brand color used as a link on a light `bg-brand-teal/5` card is a likely contrast problem (brand-mist is designed for text on navy per token comments, not on a near-white teal-wash background).
  - **Messages**: "Questions about coverage, methodology, or your subscription? ... we respond within one business day." This duplicates the page's final "Contact" section below ("Have questions or feedback? Reach us at...") — two separate contact CTAs with slightly different response-time claims ("within one business day" vs. no timeframe in the second) appear on the same page.
  - **Recommendations**:
    - Copy: two separate "contact us" blocks with overlapping purpose exist on this single page — merge into one, or differentiate roles.
    - Typography/Contrast: `text-brand-mist` link color on a light `brand-teal/5` background likely fails contrast — replace with `brand-teal-text`.

- **Legacy prose block (mission, free tools, contact)**
  - **Typography**: Headings → `font-display text-brand-navy` bare h2, no section-h2 token, inconsistent with the "What we cover"/"Why EUP" H2s above which do use `.text-section-h2`. Body → `text-[15px] text-slate`.
  - **Messages**: This entire block substantially restates the page's opening hero/mission-block content — nearly identical to the hero subhead and mission blockquote already delivered earlier in the same page. "Our Mission" heading repeats the "Our mission" eyebrow/blockquote already presented above under a different visual treatment — duplicate section with an almost identical H2 label.
  - **Recommendations**:
    - Copy: This appears to be legacy/duplicate content left in the page after a redesign. Strongly recommend removing this trailing prose block entirely, or merging its unique bits (Free Tools list) into the structured sections above, since ~80% duplicates earlier content on the same page.
    - Typography: standardize on `.text-section-h2` for all H2s if the block is retained.

---

## `/contact` — Contact
File: `src/pages/Contact.tsx`

### Elements

- **Hero**
  - **Typography**: Eyebrow "✉️ CONTACT" → `text-[11px] font-semibold tracking-wider uppercase text-brand-mist` (arbitrary `text-[11px]` instead of `.text-eyebrow`). H1 "Get in Touch" → bare `font-display text-white`. Subhead → `.text-brand-mist text-[15px]`.
  - **Messages**: "Get in Touch" (H1); "We'd love to hear from you. Reach out with questions, feedback, or partnership inquiries." (subhead).
  - **Recommendations**:
    - Typography: replace hand-rolled eyebrow with `.text-eyebrow`; use `.text-hero-h1` for consistency with the sitewide dark-hero pattern.
    - SEO: H1 "Get in Touch" doesn't contain the brand/keyword term ("Contact End User Privacy") present in the Helmet title — consider aligning H1 text closer to page title (e.g., "Contact End User Privacy").

- **Email Us card**
  - **Typography**: H2 "Email Us" → bare `font-display text-brand-navy`. Body → `text-[14px] text-slate`. CTA link → `px-6 py-3 bg-brand-navy text-white font-semibold ... text-[14px]` (arbitrary size, no `.text-cta`).
  - **Messages**: "Email Us" / "Our team typically responds within 24 hours." / "hello@enduserprivacy.com →" — the "24 hours" claim differs from About page's callout claiming "within one business day" — cross-page SLA inconsistency.
  - **Recommendations**:
    - Copy: reconcile "24 hours" (Contact) vs. "one business day" (About) response-time claims sitewide.
    - Layout: single-CTA, single-card contact page is minimal but appropriate above-the-fold; no other action competes for attention — good hierarchy.
    - Typography: use `.text-cta` for CTA text and `.text-card-title`/`.text-section-h2` for "Email Us" heading.

---

## `/faq` — FAQ
File: `src/pages/FAQ.tsx`

### Elements

- **Hero**
  - **Typography**: Eyebrow "❓ FREQUENTLY ASKED QUESTIONS" → `text-[11px] font-bold tracking-widest uppercase text-accent-light bg-accent-light/10` (hand-rolled again, third instance across About/Contact/FAQ). H1 "Everything you need to know" → bare `font-display text-white`. Subhead → `.text-brand-mist text-[15px]`.
  - **Messages**: "Everything you need to know" (H1) doesn't mention "FAQ" — relies on eyebrow for context; "Can't find your answer? Email us at hello@enduserprivacy.com."
  - **Recommendations**:
    - SEO: H1 "Everything you need to know" is generic and doesn't reinforce target keywords present in Helmet title — consider a more descriptive H1 like "Frequently Asked Questions" for on-page keyword alignment.
    - Typography: standardize hero eyebrow via `.text-eyebrow` (three different hand-rolled "eyebrow" implementations across About/Contact/FAQ is clear token-drift).

- **Accordion (general FAQs)**
  - **Typography**: Question → `font-medium text-brand-navy text-[15px]`. Answer → `text-[14px] text-slate leading-relaxed`.
  - **Messages**: 10 general FAQs. "How is the analysis produced?" and "What are the enforcement citations in tool outputs?" both explain the citation/verification mechanism from slightly different angles — some conceptual repetition between adjacent FAQ entries.
  - **Recommendations**:
    - Copy: "Who writes the analysis?" and "How is the analysis produced?" are two separate FAQ entries answering closely related questions — consider merging.
    - Copy (brand voice): "AI-assisted analysis" appears in the "What does Intelligence add?" answer — check against brand voice rule to prefer "automatically generated"; other answers on the same page correctly avoid this ("Professionally curated with a built-in verification pass"), so the platform's own voice is inconsistent within one page.
    - Typography: unify question/answer text sizes to `.text-body`/`.text-meta` tokens instead of arbitrary `text-[15px]`/`text-[14px]`.

- **Pricing FAQs**
  - **Typography**: Same accordion styling.
  - **Messages**: "How much does End User Privacy cost?" and "What is included in Professional?" both restate Professional's price and Smart Tool run entitlement nearly verbatim — direct duplication of specific figures across two adjacent FAQ answers.
  - **Recommendations**:
    - Copy: consolidate repeated Professional pricing details so they appear fully in one answer and are cross-referenced in the other.
    - Good: pricing figures pulled from shared `PRICING`/`INTELLIGENCE_PRICING` config rather than hardcoded — reduces drift.

- **Bottom CTA**
  - **Typography**: H2 "Still have questions?" → bare `font-display text-white`. Body → `.text-brand-mist text-[14px]`. CTA → `bg-white text-brand-navy font-semibold ... text-[14px]`.
  - **Messages**: "Still have questions? We're happy to help." / "Email us →" — third distinct "contact us via email" CTA across /faq, /about, and /contact.
  - **Recommendations**:
    - Copy: within this single page, the hero subhead ("Can't find your answer? Email us...") and this bottom CTA duplicate the same message/action at top and bottom — acceptable as bookending.
    - Typography: use `.text-cta` and `.text-section-h2` tokens.

---

## `/terms` — Terms of Service
File: `src/pages/Terms.tsx`

### Elements

- **Page header**
  - **Typography**: H1 "EndUserPrivacy Terms of Service" → bare `font-display text-foreground` (uses global h1 clamp, not `.text-page-h1`). "Last updated" → `text-sm text-muted-foreground`.
  - **Messages**: single, clear statement.
  - **Recommendations**:
    - Typography: use `.text-page-h1` explicitly per the documented light-background page-header convention.
    - SEO: H1 matches Helmet title well.

- **Body sections**
  - **Typography**: All H2s → bare `font-display text-foreground`; one H3 → bare `h3`. Body → default `prose prose-sm` plus `text-foreground/90`, not the site's `.text-body` tokens — this legal page opts out of the semantic type scale.
  - **Messages**: Legal boilerplate. Some structural redundancy is inherent to the genre — e.g., "we reserve the right to change/modify/discontinue" is repeated across "The Site," "Orders & Pricing," and "Third Parties" sections almost verbatim three times.
  - **Recommendations**:
    - Copy: consolidate the 3+ repeated "we reserve the right to change X without notice" clauses.
    - Copy: this page (a Shopify/e-commerce boilerplate template — mentions "Our store is hosted on Shopify Inc.") appears to be an unedited generic terms template not customized for EUP's actual SaaS/subscription business model — references to "shipping," "digital downloadable products," "dealers, resellers or distributors" don't match a privacy-intelligence SaaS product. Flag for content accuracy review.
    - Typography: standardize headings to `.text-section-h2`/`.text-page-h1`.

---

## `/privacy-policy` — Privacy Policy
File: `src/pages/PrivacyPolicy.tsx`

### Elements

- **Page header**
  - **Typography**: H1 "Privacy Policy" → bare `font-display text-foreground`. "Last updated" → `text-sm text-muted-foreground`.
  - **Recommendations**:
    - Typography: same as Terms — apply `.text-page-h1` explicitly.
    - SEO: H1 matches Helmet title — good alignment.

- **Introduction / Who We Are**
  - **Typography**: H2s → bare `font-display text-foreground`; body → default prose + `text-foreground/90`.
  - **Messages**: standard policy preview text.
  - **Recommendations**: Typography — use `.text-page-h1`/`.text-section-h2` explicitly.

- **Information We Collect / How We Use / Third-Party / Advertising / Cookies / Retention / Rights sections**
  - **Typography**: Consistent bare `h2`/`h3` throughout; `ExtLink`/`Mail` components correctly use `text-primary hover:underline`.
  - **Messages**: Section 5 ("Advertising and Google AdSense") substantially repeats content already stated in Section 4's "Google AdSense" subsection (both explain non-personalized ads, cookie usage, opt-out link) — near-duplicate content blocks with overlapping sentences, and the opt-out URL `adssettings.google.com` is repeated twice within a few paragraphs.
  - **Recommendations**:
    - Copy: merge Section 4's "Google AdSense" sub-block with Section 5 — currently the policy explains the same AdSense mechanism twice within ~50 lines.
    - Typography: adopt `.text-section-h2` tokens.

---

## `/tools` — Tools
File: `src/pages/Tools.tsx`

### Elements

- **Section headers (Assessments / Compliance documents / CPPA Suite)**
  - **Typography**: Defined via `SECTION_HEADERS` config using raw Tailwind utility classes (`text-blue-800`, `text-blue-950`, `text-amber-800`, `text-amber-950`, `text-red-800`, `text-red-950`) — entirely hardcoded palette rather than `brand-*`/`severity-*` tokens, despite `severity-critical`/`severity-warning`/`severity-info` existing for this exact use.
  - **Messages**: "Know where you stand — with cited enforcement evidence in every output" (Assessments); "Produce the documents tailored to your jurisdictions and stack" (Documents); "California audit deadline: December 31, 2027 — are you in scope?" (CPPA) — three distinct pitches.
  - **Recommendations**:
    - Typography/token misuse: replace the `blue-*`/`amber-*`/`red-*` hardcoded classes with the existing `severity-info`/`severity-warning`/`severity-critical` tokens.
    - Copy: CPPA header states a Dec 31, 2027 deadline aligned with `CPPADeadlineStrip` — consistent.

- **Differentiators (3-column)**
  - **Typography**: Titles → bare `<h3>`-style text. Check-list items use per-item `checkColor` again hardcoded (`text-brand-navy`, `text-accent`, `text-amber-800`) — mixed token/non-token usage.
  - **Messages**: "Calibrated to enforcement precedent, not just statutory text"; "Assessments ordered by enforcement risk, not by topic area"; "Documents drafted to survive scrutiny, not just satisfy it." Thematically consistent, not redundant.
  - **Recommendations**:
    - Typography: standardize `checkColor` values to brand/severity tokens.

- **Tool cards (assessment/document listings)**
  - **Typography**: Body copy arrays (`body: string[]`) — each tool repeats verbatim: "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy." appears across GDPR Governance, LI Assessment, DPIA, and Biometric Checker card bodies.
  - **Messages**: Identical narrative template across cards — a content-strategy strength, but the literal repetition of the confidentiality sentence 4x in a row within one grid is redundant.
  - **Recommendations**:
    - Copy: move the identical "Your assessments are your Subscriber Confidential Information..." sentence out of each card and into a single shared disclaimer beneath the Assessments grid.

---

## `/start` — Start New (StartNew.tsx)
File: `src/pages/StartNew.tsx`

Note: this is an authenticated dashboard/workspace page (behind `WorkspaceLayout`), audited as requested.

### Elements

- **Page header**
  - **Typography**: H1 "Start new work" → bare `font-display text-brand-navy`. Workspace line → `text-sm text-slate` with inline icon. Helper text → `text-xs text-brand-navy/70`.
  - **Messages**: "Start new work" (H1); "for {workspace name}" (context line); "Pick a tool to begin. New work will be saved under {workspace}." — the context line and helper text both restate the same "which workspace" fact twice in a row — direct redundancy within the same header block.
  - **Recommendations**:
    - Copy: merge the two workspace-context statements into one line.
    - Typography: apply `.text-page-h1` to the H1.

- **Tool list rows**
  - **Typography**: Tool name link → `text-sm font-semibold text-brand-navy`. Blurb → `.text-body-tiny text-slate` (11px — quite small for a primary descriptive line). Status badges → `text-[10px]` via `Badge` component defaults.
  - **Messages**: 14 tool blurbs, each distinct.
  - **Recommendations**:
    - Typography: `.text-body-tiny` (11px) for primary descriptive copy per row is below comfortable reading size — consider `.text-meta` (13px).

- **Footer note**
  - **Messages**: "Looking for tool descriptions, pricing, or samples? See the full tool catalog." — appropriately distinct.

---

## `/subscribe` — Subscribe
File: `src/pages/Subscribe.tsx`

### Elements

- **Hero (two-product)**
  - **Typography**: H1 "Two plans. One Mission." → bare `font-display text-white` (inconsistent capitalization: "One Mission" capitalizes "Mission" but not other words — grammatical inconsistency). Subhead → `text-base text-brand-mist`.
  - **Messages**: acceptable pricing-page repetition of price figures.
  - **Recommendations**:
    - Copy: fix inconsistent capitalization "Two plans. One Mission." → either "Two Plans. One Mission." or "Two plans. One mission."
    - Typography: apply `.text-hero-h1` explicitly.

- **Intelligence pricing card**
  - **Typography**: Eyebrow → `.text-eyebrow text-brand-mist` (correct). Price → `text-white font-display font-bold text-[36px]` (arbitrary size + `font-bold` on serif, deviating from the 400-weight display convention). Feature list → `text-sm text-white` (hardcoded literal `text-white`).
  - **Messages**: "AI investigation prompt on every article" — brand voice violation (should be "automatically generated investigation prompt"); FAQ elsewhere says "automatically assembled," showing inconsistent phrasing for the identical feature. Then "1 free Smart Tool run/year" appears again in the callout below and again in the comparison table further down — cross-element redundancy.
  - **Recommendations**:
    - Copy: rewrite "AI investigation prompt" per brand voice guideline.
    - Typography: replace arbitrary `text-[36px] font-bold` with a display token; replace literal `text-white` bullet copy with a token.

- **Professional pricing card**
  - **Typography**: Price → `text-white font-display font-bold text-[36px]`. Eyebrow → `.text-eyebrow text-amber-300` (raw Tailwind amber shade). Feature bullets → `text-sm text-white`.
  - **Messages**: "3 free Smart Tool runs per year" appears in the main feature list AND again, with added value framing, in the "Go annual" callout immediately below within the same card — direct repetition of the same fact twice in one card.
  - **Recommendations**:
    - Copy: remove duplicate "3 free Smart Tool runs/year" bullet — consolidate into a single mention with the value framing.
    - Typography: standardize `text-amber-300` to a documented `amber-400`/`amber-500` accent token.

- **Registration Manager mention strip**
  - **Messages**: "Need DPO appointments, ROPAs, or AI Act registrations filed? Try Registration Filings →" — distinct.

- **Trust bar**
  - **Messages**: Restates enforcement-calibration claim already made at length elsewhere — appropriate brief reinforcement at decision point.

- **Comparison table**
  - **Messages**: Rows like "Free Smart Tool runs per year" restate benefits already narrated in prose above — expected for a comparison table, but combined with the double-statement inside the Professional card, "free Smart Tool runs/year" appears 4 times on one page; trimming the in-card duplicate would still leave adequate reinforcement via the table.

---

## `/get-intelligence` — Get Intelligence
File: `src/pages/GetIntelligence.tsx`

### Elements

- **Header**
  - **Typography**: Eyebrow → `text-xs font-medium rounded-full bg-amber-500/20 text-amber-200` (fourth unique ad hoc eyebrow across pages). H1 "Build your sample Privacy Intelligence Report" → `font-serif text-white` (uses `font-serif` alias rather than `font-display`). Subhead → `text-slate-300 text-lg` on `bg-[#2d7a8a]` header. `--brand-slate-teal` = `#2d7a8a` exists as a token — clear token-bypass.
  - **Messages**: H1 / subhead / reassurance line are distinct and complementary — no in-element redundancy.
  - **Recommendations**:
    - Typography (critical token misuse): `bg-[#2d7a8a]` should be `bg-brand-slate-teal`; `text-slate-300`/`text-amber-200` should map to `brand-mist`/`amber-400` tokens.
    - Typography: standardize eyebrow to `.text-eyebrow`; use `font-display` alias consistently.
    - SEO: H1 aligns with Helmet title (casing only differs).

- **BriefBuilder (embedded)**
  - This page and the homepage's Brief section both host the *same* `BriefBuilder` component with near-identical purpose — cross-page duplication of the same feature entry point without clear differentiation.
  - **Recommendations**: Clarify why `/get-intelligence` exists as a separate destination from the homepage's identical builder.

- **GetIntelligenceEmailCapture (embedded)**
  - Not expanded in this pass.

---

# 2. Intelligence & Content Pages

(sub_xamgjevy)

## `/updates` — Privacy Intelligence Feed
File: `src/pages/Updates.tsx`

### Elements
- **Hero header** (`bg-[#2d7a8a]` teal band)
  - **Typography**: eyebrow pill `text-xs font-medium` (12px/500, `bg-amber-500/20 text-amber-200`) = "📰 Privacy Intelligence Feed"; H1 `font-serif text-white` (DM Serif Display, dynamic label); subtitle `text-slate-300 text-lg` (18px, gray-300 hardcoded).
  - **Messages**: "📰 Privacy Intelligence Feed" (eyebrow) vs H1 dynamic "Privacy Intelligence Feed" — duplicated string when no filter selected. Subtitle: "Daily intelligence from regulatory and news sources across the world — filter by jurisdiction, topic, date, and source to find what's relevant to your practice." Near-duplicate of Helmet meta description.
  - **Recommendations**: (a) De-duplicate eyebrow/H1 redundancy. (b) `bg-[#2d7a8a]` and `text-slate-300` are hardcoded rather than `brand-slate-teal`/`brand-mist` tokens. (c) Consider surfacing filter count/last-updated inline. (d) Static `<title>` doesn't reflect filtered view; consider syncing to filter for deep links.

- **Jurisdiction subnav / Topics sidebar**
  - **Typography**: `text-eyebrow font-bold underline` labels ("Jurisdiction", "Topics") — inconsistent with `.text-eyebrow` spec (adds `underline underline-offset-4`). Pills: `text-sm font-medium`.
  - **Messages**: filter labels — no duplication.
  - **Recommendations**: (b) Underlining eyebrow-style labels is a hierarchy misuse. (c) Sidebar sticky offset math (`top-32`) is fragile.

- **Upsell / CTA strips** (personalized intelligence, filter gate, Pro upgrade)
  - **Typography**: `text-sm font-semibold` CTA links, mixed inline `text-brand-teal-text`/`text-brand-navy`.
  - **Messages**: "View your latest Privacy Intelligence Report →"; "Get your privacy intelligence — customized and analyzed for your priorities and responsibilities →"; "Register free to filter by your industry and date range"; "Get a personalised Privacy Intelligence Report every Monday — written for your role, jurisdiction, and industry." — four overlapping "get personalized report" messages competing on one page.
  - **Recommendations**: (a) Consolidate near-duplicate personalized-report CTAs. (c) Too many competing bands ATF risk banner-blindness.

- **Search & filters bar**
  - **Messages**: "Search the entire Privacy Intelligence Feed…"; "No exact matches for your filter combination. Showing the closest related updates — we relaxed…" — clear system message.
  - **Recommendations**: (a) Good pattern. (c) Consider persisting filters more visibly as chips.

- **Feed list (TieredFeed component)** — separate component, not audited here.

## `/updates/:id` — Article Detail
File: `src/pages/UpdateDetail.tsx`

### Elements
- **Breadcrumb**
  - **Typography**: `text-meta text-muted-foreground` — correct.

- **Category badge + Title**
  - **Typography**: badge `text-eyebrow`; H1 `font-display text-foreground` with inline `style={{fontSize:'clamp(1.333rem,...,1.833rem)'}}` — **bypasses semantic tokens** with bespoke clamp; H1 tops at 29px vs. standard 44px page H1.
  - **Recommendations**: (b) Replace inline clamp with a semantic class. (d) H1 = article title, matches `<title>` — correct SEO.

- **Meta row + Precedent badge**
  - **Typography**: `text-sm text-muted-foreground`; precedent badge `text-eyebrow` with ad hoc palette pairs (`bg-amber-100 text-amber-800`).
  - **Recommendations**: (b) Migrate to `severity-*` tokens.

- **Anonymous gate ("Why it matters" + lock box)**
  - **Messages**: "The Brief, Next Steps, Watch, and Contextual Record are available to registered users." / "Sign up free to see analysis on every update." / "Sign up free →" — three consecutive sentences repeating the "sign up" ask.
  - **Recommendations**: (a) Tighten to one sentence + CTA. (b) Standardize label styling to `.text-eyebrow`.

- **Signed-in sections: The Brief / Next Steps / Watch / Contextual Record**
  - **Typography**: Section eyebrows `text-eyebrow` (correct) + `text-meta` subtitle; H2s `font-display` render at default fluid scale. Body `text-base leading-relaxed`.
  - **Messages**: Differentiated section labels — no paraphrase duplication. "Drawn from 3,700+ enforcement decisions" — factual, no banned terms.
  - **Recommendations**: (c) Four gated sections stacked vertically is a lot of scroll for free users; consider tabbed layout.

- **Free-registered lock strip (sections 2–4)**
  - **Messages**: Clear tiering — CTA "Upgrade →" vs. anonymous "Sign up free →" — intentional.

- **Related Updates / footer email capture**
  - **Typography**: `h2 className="text-foreground text-[15px]"` — hardcoded arbitrary size instead of `.text-card-title`.

## `/calendar` — Regulatory Key Dates Calendar
File: `src/pages/Calendar.tsx`

### Elements
- **Hero header**
  - **Typography**: eyebrow pill "📅 Reference"; H1 `font-serif text-white`; subtitle `text-slate-300 text-lg`.
  - **Messages**: unique, clear.
  - **Recommendations**: (b) Same hardcoded `bg-[#2d7a8a]`/`text-slate-300` pattern — unify into a shared "intel-header" component.

- **Free-tool upsell banner**
  - **Messages**: "⭐ This tool is free. Get this analysis delivered every Monday, re-written for your industry and jurisdictions." + "Get Intelligence →" — identical banner reused verbatim on Timelines.
  - **Recommendations**: (c) Extract into shared `<FreeToolUpsell/>` component.

- **Filter pills** — fine.

- **Calendar table**
  - **Typography**: header `text-[11px] font-semibold tracking-wider uppercase text-muted-foreground` (matches `.text-label-caps` intent but hardcoded).
  - **Messages**: badge labels distinct; footer disclaimer solid, avoids "AI-generated".
  - **Recommendations**: (b) Replace `text-[11px]` with `.text-label-caps`/`.text-eyebrow`. (c) Table is dense; consider mobile card fallback.

## `/timelines` — Timelines Index
File: `src/pages/Timelines.tsx`

### Elements
- **Header (light card style, differs from other index pages' teal hero)**
  - **Typography**: eyebrow `text-sm font-medium text-muted-foreground` "📜 Reference" — NOT using `.text-eyebrow`; H1 `text-foreground` (default h1); subtitle `text-muted-foreground`.
  - **Messages**: description near-paraphrases Helmet meta description.
  - **Recommendations**: (b) Eyebrow inconsistent with sibling pages. (c) This page uses a light header instead of the teal/navy dark hero used by Calendar/Glossary/Enforcement/Horizon/LI-Tracker — visual inconsistency across "Reference"-tier index pages.

- **Free-tool upsell banner** — identical to Calendar; extract to shared component.

- **Timeline cards**
  - **Typography**: `h2 className="text-foreground"` (default h2, ~26-32px serif) as card title — unusually large; `text-sm text-muted-foreground leading-relaxed` for description.
  - **Recommendations**: (b) Use `.text-card-title` instead of serif H2.

## `/timelines/:slug` — Timeline Detail
File: `src/pages/TimelineDetail.tsx`

### Elements
- **Header**
  - **Typography**: back link `text-xs font-medium text-muted-foreground`; H1 `text-foreground` (default serif) = "{icon} {title}"; description `text-muted-foreground`.
  - **Messages**: Description differs slightly from parent Timelines list description — inconsistent paraphrased duplicate.
  - **Recommendations**: (a) Reconcile the two description variants to a single source of truth.

- **Legend row** — fine.

- **Timeline entries**
  - **Typography**: multiple `text-[11px]` arbitrary values scattered instead of tokens.

## `/enforcement` — Enforcement Tracker (list) & `/enforcement/:id` — Detail
Files: `src/pages/Enforcement.tsx`, `src/pages/EnforcementActionDetail.tsx`

### Enforcement.tsx (list)
- **Hero header**
  - **Typography**: eyebrow pill "🗄️ Enforcement Tracker" (amber, hardcoded); H1 `font-serif text-white` dynamic; subtitle `text-slate-300 text-lg`.
  - **Messages**: eyebrow duplicates H1 verbatim in default view — same redundancy as Updates.
  - **Recommendations**: (a) Differentiate eyebrow copy from H1. (b) Same hardcoded `bg-[#2d7a8a]`/`text-slate-300`.

- **View toggle (Recent / Full archive)**
  - **Messages**: distinct, clear. Cross-link "Forecast view: Enforcement Forecast Intelligence →".

- **Archive premium gate card**
  - **Typography**: `h2 className=""` (empty class — inherits default oversized H2) for "Premium archive".
  - **Recommendations**: (b) Should use `.text-card-title`.

- **Filters card** — well structured, consistent shadcn use.

- **Results list**
  - **Typography**: `h3` no explicit size (default ~17-18px) — inconsistent with other card-title implementations across site.
  - **Recommendations**: (b) Standardize card-title typography (`.text-card-title`).

### EnforcementActionDetail.tsx (detail)
- **Header**
  - **Typography**: back link `text-sm text-muted-foreground`; H1 `font-serif` (no size override) = action subject; meta row `text-sm text-muted-foreground`.
  - **Recommendation (d)**: Link back target is `/enforcement-intelligence` and canonical URL references `enforcement-intelligence/${id}`, but the route is `/enforcement/:id` — **inconsistent internal linking/canonical mismatch**.

- **Fine / significance stat block**
  - **Typography**: `text-2xl font-semibold font-mono` fine amount — good mono for numerals.

- **Compliance failure / preventive measures cards**
  - **Typography**: `h2 className="uppercase tracking-wide text-muted-foreground"` — visually oversized uppercase label rather than a proper section heading; effectively misusing `<h2>` as a label. Same issue repeats for "Violation types," "Data categories," "Violation summary," "Relevant compliance tools" — five instances in one file.
  - **Recommendations**: (b) Should be `.text-eyebrow` spans, not `<h2>`.

- **Registration Manager cross-sell card**
  - **Messages**: Well-written, no banned terms, appropriately hedged.

## `/gdpr-enforcement` — GDPR vs UK GDPR
File: `src/pages/GDPREnforcement.tsx`

### Elements
- **Page header (via ResearchPageLayout)**
  - **Messages**: strong, non-duplicated framing.

- **Comparison table (EU vs UK GDPR)**
  - **Typography**: header row `text-meta uppercase tracking-wider font-semibold` on `bg-brand-navy text-white` — correct token usage; row dimension label `text-eyebrow text-slate uppercase`.
  - **Messages**: Six dimension rows well-differentiated, citation-rich (Art. 3, Art. 6, Art. 83).
  - **Recommendations**: none significant — good token discipline.

- **Divergence Tracker**
  - **Typography**: item title `font-display text-brand-navy text-base` (display font at body-sized 16px — unusual pairing).
  - **Messages**: 6 divergence items — all unique and well-cited.

- **Recent Enforcement (details/summary accordion)**
  - **Messages**: factual, well-sourced, properly delegates via link.

- **Legitimate Interest & Framework sections**
  - **Messages**: precise citations, no vague "AI-generated"/"gap" language. Structured data (`Article` schema) present in Helmet.

## `/legislation-tracker` — Legislation Tracker
File: `src/pages/LegislationTracker.tsx`

### Elements
- **Page header (ResearchPageHeader)** — precise, credible copy.

- **Stale-data disclaimer**
  - **Typography**: `text-[11px] text-brand-mist` — hardcoded.
  - **Recommendations**: (b) swap `text-[11px]` for token class.

- **Region/Stage filter pills** — fine.

- **Section headers**
  - **Typography**: `h2 className="font-display text-brand-navy leading-tight"` — correct.
  - **Messages**: four tracks distinct, no paraphrase overlap — strong editorial clarity.

- **BillCard**
  - **Typography**: title `h3 className="text-brand-navy text-[15px]"` — hardcoded 15px, third distinct implementation of "card title" across site.
  - **Messages**: "What to do now" callout consistent with EnforcementActionDetail tone.
  - **Recommendations**: (b) Consolidate card-title sizing site-wide.

## `/legitimate-interest-tracker` — Legitimate Interest Tracker
File: `src/pages/LegitimateInterestTracker.tsx`

### Elements
- **Hero header** (`bg-[#0d2a45]` — matches `--brand-navy` but hardcoded)
  - **Typography**: eyebrow "⚖️ Intelligence Guide" pill; H1 `font-serif text-white` "Legitimate Interest Tracker"; subtitle `text-slate-300 text-lg` "Global privacy law, tracked daily."
  - **Messages**: Subtitle is a generic site-wide-sounding tagline that doesn't specifically describe this tracker — a missed differentiation opportunity.
  - **Recommendations**: (a) Replace generic subtitle with LI-tracker-specific copy. (b) `bg-[#0d2a45]` should be `bg-brand-navy`.

- **3-Part Test cards**
  - **Messages**: Purpose / Necessity / Balancing — clear, well-written.

- **Trend summary card**
  - **Messages**: Broadly Accepted / Consistently Rejected / Contested — well-differentiated.

- **Signal-type legend**
  - **Typography**: `text-[12px] text-slate` — should be `.text-meta`.

- **Entry cards**
  - **Typography**: recurring `text-[11px]` cluster.

- **Premium upsell footer**
  - **Typography**: eyebrow "⭐ Intelligence Intelligence" — **typo/duplicated word**, likely meant "⭐ Go Premium".
  - **Messages**: "Get full intelligence" reads awkwardly.
  - **Recommendations**: (a) **Fix "⭐ Intelligence Intelligence" duplicated-word eyebrow typo** — clear copy bug.

## `/glossary` — Glossary Index
File: `src/pages/Glossary.tsx`

### Elements
- **Hero header**
  - **Typography**: eyebrow "📖 Reference"; H1 explicitly uses `text-hero-h1 text-white` (correct — one of the only pages that does); subtitle `text-slate-300 text-lg`.
  - **Messages**: "Plain-English definitions..." + dynamic count — clear.
  - **Recommendations**: (b) Same `bg-[#2d7a8a]`/`text-slate-300` hardcoded issue.

- **Search bar**
  - **Messages**: minor gap in feedback consistency — themed sections silently disappear on search with no "no themed matches" message; only A-Z shows one.
  - **Recommendations**: (c) Add consistent zero-results message.

- **Theme accordion sections**
  - **Typography**: `h2 className="text-brand-navy text-lg mb-0.5"` (hardcoded `text-lg`, overriding fluid h2 scale).
  - **Messages**: Four distinct theme framings — well done.

- **Term cards**
  - **Typography**: "Regulated in:"/"Related:" labels `text-meta uppercase tracking-wider font-semibold text-brand-mist` — **correctly uses `.text-meta`, good example of proper token use** vs other pages' arbitrary `text-[11px]`. Use as reference pattern when refactoring others.

- **A–Z index** — fine.

## `/glossary/:slug` — Glossary Term Detail
File: `src/pages/GlossaryTerm.tsx`

### Elements
- **Header (light card style, distinct from index's teal hero)**
  - **Recommendations**: (c) Same design inconsistency as Timelines: index dark, detail light.

- **Definition card**
  - **Typography**: `h2 className="text-foreground"` "Definition" (default h2, ~26-32px) — oversized for compact card content.

- **Definitions across regimes**
  - **Messages**: hedged, responsible copy.

- **Related Terms**
  - **Typography**: Three `<h2>`s all oversized relative to content — consider demoting.

- **Upsell block** — distinct tone, acceptable.

## `/horizon` — Enforcement Forecast Intelligence
File: `src/pages/Horizon.tsx`

### Elements
- **Hero header**
  - **Typography**: eyebrow pill with pricing info inline — unusually long/dense for eyebrow role.
  - **Messages**: "synthesized from primary regulator output" — good phrasing.
  - **Recommendations**: (c) Move pricing/subscribe CTA out of eyebrow. (b) Same `bg-[#2d7a8a]` hardcoded.

- **Watchlist controls bar**
  - **Typography**: `text-[11px]` again vs. token.

- **Cross-link cards (Enforcement Intelligence / Registration Manager)**
  - **Messages**: differentiated, action-oriented — good cross-sell discipline.

- **HorizonCard (premium view)**
  - **Typography**: `h2 className="font-display text-brand-navy leading-snug"` per card — many H2s per page but visually consistent.

- **Non-premium locked teaser cards**
  - **Messages**: paywall messaging repeated in intro card AND per locked card — mild redundancy.
  - **Recommendations**: (a) Shorten per-card repeated sentence.

---

# 3. Jurisdictions, Regulators & Topic Pages

(sub_reagz39k)

## `/jurisdictions` — Global Privacy Law Map
File: `src/pages/JurisdictionsHub.tsx`

### Elements

- **Header (hero)**
  - **Typography**: `font-serif text-white` h1 (no `text-hero-h1`); eyebrow raw `text-xs font-medium` pill; body `text-slate-300 text-lg`.
  - **Messages**: "🌐 Jurisdictions"; "Global Privacy Law Map"; "150+ jurisdictions tracked. Click any country on the map... Switch to Grid view to browse or filter by region."
  - **Recommendations**: (a) **"Switch to Grid view" referenced but no grid view/toggle exists** — dead instruction. (b) Replace `font-serif`/raw pill with `text-hero-h1`/`text-eyebrow` tokens. (c) Hero has no CTA; add text link. (d) Confirm "150+" claim matches live count.

- **Map disclaimer**
  - **Messages**: Again references "Grid view" that doesn't exist.
  - **Recommendations**: (a) Remove or build referenced feature.

- **Recently Updated Jurisdictions strip**
  - **Typography**: `text-brand-navy uppercase tracking-wider` h2 — should be `text-section-h2`.
  - **Recommendations**: (c) Horizontal scroll strip has no visible affordance.

## `/jurisdiction/:slug` — Jurisdiction Profile
File: `src/pages/JurisdictionPage.tsx`

### Elements

- **Breadcrumb** — fine; add `BreadcrumbList` JSON-LD.

- **Hero**
  - **Typography**: eyebrow `text-blue-300 text-xs font-bold uppercase tracking-widest` (raw); background `bg-gradient-to-br from-brand-ocean to-brand-slate-teal` (correct token use).
  - **Messages**: Auto-generated overview sentence formulaic across all 150+ pages ("X privacy regulation is primarily governed by Y. The primary regulatory authority is Z.") — thin/duplicate-content risk at scale.
  - **Recommendations**: (a) Vary phrasing per jurisdiction. (d) Title/description use jurisdiction name well; canonical present.

- **Not Found / Loading states**
  - **Recommendations**: (c) Add link back to `/jurisdictions` map. (d) Not-found should be marked `noindex`.

- **Tiered feed sections (TieredFeed)**
  - **Recommendations**: (d) Much of page is templated overview + generic authority list — risk of thin-content SEO across many slugs.

## `/global-privacy-authorities` — Global Privacy Authorities
File: `src/pages/GlobalAuthorities.tsx`

### Elements

- **Header**
  - **Typography**: h1 correctly uses `text-hero-h1 text-white`; eyebrow raw pill.
  - **Messages**: good action-oriented copy.
  - **Recommendations**: (b) standardize eyebrow. (d) Helmet + ItemList JSON-LD present, count matches dynamic — good.

- **Sticky filter/search bar** — good; verify no z-index collision with AdBanner.

- **Legend + result count row**
  - **Messages**: "Tier 1 authorities are under active enforcement monitoring in our intelligence pipeline."
  - **Recommendations**: (a) "Tier 1" jargon needs a tooltip/methodology link.

- **Authority cards grid**
  - **Typography**: badges `text-[10px] font-semibold uppercase` — arbitrary.
  - **Messages**: consistent.

## `/regulator/:slug` — Regulator Profile
File: `src/pages/RegulatorPage.tsx`

### Elements

- **Hero**
  - **Typography**: eyebrow `text-meta font-semibold tracking-widest uppercase text-brand-mist` (correct meta token, unlike other pages); h1 `font-display text-white` (should be `text-hero-h1`).
  - **Messages**: fine.
  - **Recommendations**: (b) h1 inconsistent vs GlobalAuthorities/USPrivacyLaws. (d) Helmet good; `GovernmentOrganization` JSON-LD present.

- **Key info card**
  - **Typography**: labels `text-meta font-semibold tracking-wider uppercase text-slate`; values `text-[15px] text-brand-navy font-medium` (arbitrary size).

- **Recent Intelligence (paywall teaser)**
  - **Messages**: "Intelligence subscribers get weekly intelligence" is redundantly worded (repeats "Intelligence" twice).
  - **Recommendations**: (a) Tighten to "Subscribers get weekly intelligence briefings for every regulator they follow." (c) Good paywall placement.

- **Recent Developments**
  - **Typography**: title `text-[9px] font-semibold text-brand-navy` — **critically small, likely a typo**; should be `text-sm` (~14px).
  - **Recommendations**: (b) **Fix `text-[9px]` — almost certainly a bug** (contrast/legibility issue).

- **Related Resources**
  - **Messages**: "GDPR Enforcement" link shown for every regulator regardless of relevance (e.g., non-EU regulators).
  - **Recommendations**: (a) Make conditional.

## `/us-privacy-laws` — U.S. Privacy Laws
File: `src/pages/USPrivacyLaws.tsx`

### Elements

- **Header + tab nav**
  - **Typography**: h1 `font-serif text-white` (should be `text-hero-h1`); tabs `text-meta font-semibold`.
  - **Messages**: comprehensive, no dupes.
  - **Recommendations**: (d) Helmet + og:title/description + Dataset JSON-LD all present and aligned — good example page.

- **Stat strip** — good token usage.

- **Recent Developments CTA banner**
  - **Typography**: `text-sm md:text-sm text-brand-navy font-bold` — **redundant responsive class `md:text-sm` is a no-op**.
  - **Recommendations**: (b) remove redundant `md:text-sm`.

- **Federal Authorities cards**
  - **Typography**: `text-[17px]` arbitrary alongside `text-base` breakpoint — minor inconsistency.

- **State Authority Directory + sticky Compare CTA**
  - **Recommendations**: (c) Good ATF placement of compare CTA before long state grid.

## `/us-privacy-laws/:slug` — State Privacy Law Detail
File: `src/pages/USStateLawPage.tsx`

### Elements

- **Breadcrumb** — fine; add `BreadcrumbList` JSON-LD.

- **Hero**
  - **Typography**: h1 `font-display text-white` (not `text-hero-h1`); subtitle `text-lg text-brand-mist font-display`.
  - **Messages**: concise CTA above the fold — good.
  - **Recommendations**: (d) canonical + Article JSON-LD good; `mainEntityOfPage` included.

- **"The law" / "Regulator & enforcement" sections** — clear structure; fallback for missing statute italicized.

- **Comparison highlights / Active bills**
  - **Typography**: **Bill stage pills use raw inline hex styles (`STAGE_CONFIG` colors) instead of design tokens** — token misuse; won't respect dark mode.
  - **Recommendations**: (b) Map STAGE_CONFIG to Tailwind theme colors.

## `/global-privacy-laws` — Global Privacy Laws
File: `src/pages/GlobalPrivacyLaws.tsx`

### Elements

- **Header (via ResearchPageLayout)**
  - **Typography**: h1 `text-hero-h1 text-white` on `bg-slate-900` (deviates from other hero gradients).
  - **Messages**: **Description embeds raw URLs as plain text** ("For U.S. law see /us-privacy-laws; for EU/GDPR see /gdpr-enforcement") instead of hyperlinks.
  - **Recommendations**: (a) Convert to inline links or remove. (b) `bg-slate-900` inconsistent with brand-navy/ocean elsewhere. (d) Helmet defined both in page-level `<Helmet>` and via `metaTitle`/`metaDescription` props — verify no duplicate tags render.

- **Stats strip**
  - **Typography**: `font-serif text-[28px]` value, `text-[10px] tracking-[0.12em] uppercase text-slate-400` label (arbitrary).
  - **Messages**: "Global / Global regulators tracked worldwide" is vague/non-quantified — weak data point.

- **Regional sections (APAC/LatAm/MEA/Cross-border/Enforcement)**
  - **Messages**: Formulaic pattern repeated on AI/Health/Biometric pages ("X's [Law] ... enforced by the [Regulator] ..., held EU adequacy since...").
  - **Recommendations**: (a) Vary sentence rhythm.

## `/compare/us-states` — U.S. State Comparison
File: `src/pages/USStateComparison.tsx`

### Elements

- **Header**
  - **Typography**: h1 `font-serif text-white` (inconsistent).
  - **Messages**: task-oriented, good.
  - **Recommendations**: (d) **JSON-LD `Dataset` hardcodes "20 enacted" while page copy uses dynamic `{states.length}`** — drift risk.

- **Upsell banner** — compact, acceptable.

- **Comparison table**
  - **Typography**: **Mixed token vocabularies** — table uses `text-foreground`/`text-muted-foreground`/`text-accent` (shadcn) while rest of page uses `brand-navy`/`text-slate` (brand). `font-mono text-xs` in tooltip citations correct.
  - **Messages**: fine.
  - **Recommendations**: (b) unify token vocabulary. (c) Table only shows "enacted" states — consider toggle for pending/proposed.

- **Footer note row** — good trust-building.

## `/ai-privacy-regulations` — AI Privacy Regulations
File: `src/pages/AIPrivacyRegulations.tsx`

### Elements

- **Header + intro callout**
  - **Typography**: standard ResearchPageHeader; intro `text-[11px] font-bold tracking-wider uppercase text-brand-teal-text`.
  - **Messages**: Good, specific (EDPB Opinion 28/2024, EU AI Act, CPPA ADMT rules).
  - **Recommendations**: (a) "expected H2 2026" risks going stale — add "last verified" note. (d) Description duplicated near-verbatim between `<Helmet>` and `metaDescription` prop.

- **Sections: EU AI Act / GDPR AI Training / ADMT / Enforcement / National AI Strategies**
  - **Messages**: "AI–privacy intersection" reused 3+ times across sections.
  - **Recommendations**: (a) Vary language. (c) `toolCtaPlacement:"top"` good.

## `/health-data-privacy` — Health Data Privacy
File: `src/pages/HealthDataPrivacy.tsx`

### Elements

- **Track overview (3-card intro)**
  - **Typography**: arbitrary `text-[10px]` / `text-xs` — no tokens.
  - **Messages**: Excellent decision-tree framing — clear voice, no dupes.
  - **Recommendations**: (c) Strong ATF pattern.

- **HIPAA / Consumer health / State health track sections**
  - **Messages**: statutory detail (GoodRx $1.5M, BetterHelp $7.8M, MHMDA, Nevada SB 370, CT SB 3) — credible.

- **Breach comparison table**
  - **Typography**: `text-[11px]` arbitrary.
  - **Recommendations**: (c) Verify mobile legibility of 4-column dense table.

## `/biometric-privacy` — Biometric Privacy
File: `src/pages/BiometricPrivacy.tsx`

### Elements

- **Tiered state law cards (Illinois/Texas-Washington/Others)**
  - **Typography**: color-coded severity (rose/amber/slate) — good semantic use though not tokenized to brand.
  - **Messages**: Strong differentiated voice per tier.
  - **Recommendations**: (b) Consider documenting as accepted severity exception.

- **Enforcement history table**
  - **Messages**: Meta $1.4B, BNSF $228M, Google $100M, Facebook $650M, Clearview €20M+ — factual.

- **GDPR/EU AI Act + Workplace sections**
  - **Messages**: Good nuance (Clearview overturned in UK).

## `/breach-notification` — Data Breach Notification
File: `src/pages/BreachNotification.tsx`

### Elements

- **GDPR / US States / Sector-specific / International sections**
  - **Messages**: 72 hours GDPR; state timing variance; sector list; international list — non-duplicated per-regime specificity.
  - **Recommendations**: (c) Sticky rail useful; verify no overlap with CTA/AdBanner on small viewports. (d) **Helmet canonical uses relative path `/breach-notification` while other pages use absolute URLs** — inconsistent canonical format.

## `/cross-border-transfers` — Cross-Border Data Transfers
File: `src/pages/CrossBorderTransfers.tsx`

### Elements

- **Mechanism / Adequacy tables**
  - **Typography**: color-coded effort badges (emerald/amber/rose) — consistent with Biometric/CookieConsent.
  - **Messages**: Clear decision-support voice.
  - **Recommendations**: (c) `<TransferMechanismSelector />` above fold — good engagement pattern. (d) canonical relative — same inconsistency.

- **DPF / TIA / Derogations / APAC / Enforcement sections**
  - **Messages**: "Schrems III" used as stat label and inline text — no such formally-named CJEU case; may confuse readers.
  - **Recommendations**: (a) Verify accepted industry shorthand vs. real citation.

## `/cookie-consent` — Cookie Consent Requirements
File: `src/pages/CookieConsent.tsx`

### Elements

- **Requirements matrix table**
  - **Typography**: colored pill badges (rose=Required, amber=Recommended, slate=Not required) — clear semantic coding.
  - **Messages**: no duplication.

- **"What your banner must do" checklist**
  - **Typography**: `text-accent` (shadcn) alongside `brand-teal`/`brand-navy` (brand) elsewhere on same page — **mixed token vocabularies within one page**.
  - **Messages**: 10-step actionable checklist — strong element.

- **Per-jurisdiction `<details>` accordions**
  - **Recommendations**: (c) Accordions below the fold with no anchor links from matrix rows — add per-row "Details ↓" links.

- **Enforcement list** — fine, no dupes.

---

# 4. Tool Landing Pages

(sub_p9532rqb)

## `/li-assessment` — Legitimate Interest Assessment
File: `src/pages/LIAssessment.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#0d2a45]` hardcoded (same as `brand-navy`); eyebrow chip `text-xs font-medium rounded-full bg-amber-500/20 text-amber-200`; `h1.text-hero-h1 text-white`; body `text-slate-300 text-lg`; fine print `text-slate-400 text-xs italic`.
  - **Messages**: "⚖️ Legitimate Interest Assessment · Free preliminary signal · Full assessment $X" (chip); "Legitimate Interest Assessment" (H1, duplicates chip text); "Get an instant indication... We cannot provide legal advice, but we can provide actionable Intelligence." — **capital "Intelligence" mid-sentence looks like a stray product-name capitalization typo**.
  - **Recommendations**: (a) Fix "actionable Intelligence" capitalization. (b) Replace `bg-[#0d2a45]` with `bg-brand-navy`. (c) H1 essentially repeats the chip verbatim — tighten. (d) Helmet aligns with H1.

- **"Why you need this" section**
  - **Typography**: `text-eyebrow text-brand-mist`; `h2` uses bare `font-display text-brand-navy` (not `text-section-h2`); body `text-sm text-brand-navy max-w-[70ch]`.
  - **Recommendations**: (b) Standardize h2 on `text-section-h2` token.

- **"How it works" 3-step strip + disclaimer**
  - **Typography**: disclaimer box `bg-amber-50 border-amber-400 text-amber-900` (hardcoded amber shades).
  - **Messages**: "Not legal advice..." — appropriately hedged.
  - **Recommendations**: (b) Swap hardcoded amber utilities for the defined amber accent token.

## `/governance-assessment` — GDPR Governance Assessment
File: `src/pages/GovernanceAssessment.tsx`

### Elements
- **Header banner**
  - **Typography**: same `bg-[#0d2a45]`; `h1.text-hero-h1`; `INCLUDED_GENERATIONS_COPY` in `text-slate-400 text-xs italic`.
  - **Messages**: "⚖️ GDPR Governance Assessment · $X" (chip) vs H1 "GDPR Governance Assessment" — exact duplicate string.
  - **Recommendations**: (a) Vary chip vs H1 copy. (b) Hardcoded navy hex.

- **Multi-step form section headers (Steps 1–6)**
  - **Typography**: `<h2 className="">` — empty className, falls back to default browser styling.
  - **Messages**: "Gateway Questions", "Data and Processing Profile", "Governance Infrastructure", "Training and Technical Controls", "Transfer and Compliance", "Review your answers" — clear.
  - **Recommendations**: (b) Add `text-section-h2 text-brand-navy` classes.

## `/dpia-framework` — DPIA Framework
File: `src/pages/DPIAFramework.tsx`

### Elements
- **Header banner** (pattern consistent with sibling assessments)
  - **Recommendations**: (c) Confirm header CTA parity with LIA/Governance; keep ATF to headline + one CTA row.

- **DPIA trigger detection widget**
  - **Messages**: "Large-scale processing of special category data", "Systematic and extensive profiling with significant effects", "Processing children's data — heightened obligations apply" — distinct.
  - **Recommendations**: (d) Confirm article citations use `font-mono` per token guide.

## `/dpa-generator` — Custom DPA Generator
File: `src/pages/DPAGenerator.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#0d2a45]`; H1 uses **`font-serif`** directly rather than `text-hero-h1` — inconsistent sizing vs sibling tools.
  - **Messages**: chip "📄 Custom DPA Generator · $X"; H1 "Custom Data Processing Agreement" — different phrasing (acceptable).
  - **Recommendations**: (b) Replace `font-serif` H1 with `text-hero-h1`. (d) Helmet title "Custom DPA Generator" vs H1 "Custom Data Processing Agreement" — align wording.

- **Step progress indicator**
  - **Typography**: dot coloring uses inline `style` with raw `hsl(var(--accent))` bypassing Tailwind classes.
  - **Recommendations**: (b) Convert to `bg-accent`/`bg-border` classes.

- **Sample preview block**
  - **Messages**: "[Section 3 onwards continues — full DPA available after generation]" — reasonable teaser.

## `/ir-playbook` — Incident Response Playbook
File: `src/pages/IRPlaybook.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#2d7a8a]` — undocumented in relation to `brand-navy #0d2a45`/`brand-ocean #1a4a6e`; H1 uses `font-serif` (not `text-hero-h1`).
  - **Messages**: chip "🚨 Incident Response Playbook · $X"; H1 "Incident Response Playbook" — literal duplicate.
  - **Recommendations**: (b) `#2d7a8a` matches `brand-slate-teal` token but isn't referenced by class name. (a) De-duplicate chip vs H1. (b) Standardize H1 class to `text-hero-h1`.

## `/biometric-checker` — Biometric Privacy Compliance Assessment
File: `src/pages/BiometricChecker.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#2d7a8a]` again; H1 correctly uses `text-hero-h1 text-white`.
  - **Messages**: chip "🧬 Biometric Compliance Assessment · $X" vs H1 "Biometric Privacy Compliance Assessment" — slight variation.
  - **Recommendations**: (b) Same hardcoded hex. (d) Helmet matches H1 well.

## `/cppa` — CPPA Audit Readiness Suite
File: `src/pages/CPPAHub.tsx`

### Elements
- **Header (no dark banner — breaks the pattern)**
  - **Typography**: `h1.text-page-h1` — a **third distinct H1 token** (`text-page-h1` vs `text-hero-h1` vs bare `font-serif`).
  - **Messages**: eyebrow "California Privacy Protection Agency"; H1 "CPPA Audit Readiness Suite"; intro about "three deadlines on the clock."
  - **Recommendations**: (c) This hub lacks the dark hero band used by every sibling tool — align to `PageHero` convention or document as intentional distinction. (d) Standardize H1 token.

- **"Run the CPPA Scope Checker" CTA band**
  - **Typography**: `bg-brand-navy` (correct token usage, unlike hex-coded headers elsewhere); `h2.font-serif text-3xl md:text-4xl` — bypasses `text-section-h2`.
  - **Messages**: clear single CTA.
  - **Recommendations**: (b) Use `text-section-h2` token; this page's `bg-brand-navy` usage is the correct pattern to back-port to LIA/Governance/DPA/IR/Biometric.

- **Module cards + FAQ** — standard, no dupes.

## `/cppa-scope-checker` — CPPA Scope Checker
File: `src/pages/CPPAScopeChecker.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#1a4a6e]` (matches `brand-ocean` token); H1 `text-hero-h1 text-white`.
  - **Messages**: chip "🛡️ CPPA Scope Checker · Free · No account required"; H1 "CPPA Scope Checker"; body "Find out whether... Takes 2 minutes."; "The CPPA Audits Division stood up in February 2026. Enforcement is active."
  - **Recommendations**: (b) Use `bg-brand-ocean`. (a) Verify "February 2026" dateline is currency-appropriate and set for periodic content review.

## `/cppa-admt` — ADMT Compliance Assessment
File: `src/pages/admt/ADMTChecker.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#1a4a6e]`; H1 `text-hero-h1 text-white`.
  - **Messages**: chip "CPPA AUDIT READINESS · MODULE 3 · $X" (**all-caps, no emoji, inconsistent with sibling chip voice**).
  - **Recommendations**: (a) Standardize casing/emoji convention across CPPA module chips. (b) Same hex-vs-token issue.

## `/cppa-risk-assessment` — CPPA Privacy Risk Assessment
File: `src/pages/CPPARiskAssessment.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#1a4a6e]`; H1 `text-hero-h1 text-white`.
  - **Messages**: H1 "CPPA Privacy Risk Assessment"; RequirementBadge tier "conditional" with "§ 7150", deadline "December 31, 2027."
  - **Recommendations**: (b) Same hex-vs-token. (d) Helmet title includes "Module 1" not in H1 — align.

- **Step headers**
  - **Typography**: bare `<h2>` no className.
  - **Recommendations**: (b) Apply consistent `text-section-h2` styling.

## `/cppa-cybersecurity` — CPPA Cybersecurity Audit Readiness
File: `src/pages/CPPACybersecurity.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#1a4a6e]`; H1 `text-hero-h1 text-white`.
  - **Messages**: H1 "CPPA Cybersecurity Audit Readiness"; RequirementBadge "April 1, 2028 for businesses over $100M in revenue."
  - **Recommendations**: (b) Same hex issue. (d) Helmet title says "Module 2" — absent from visible H1.

## `/ropa-builder` — RoPA Builder
File: `src/pages/ropa/RopaLanding.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#0d2a45]`; H1 `font-serif` (not `text-hero-h1`).
  - **Messages**: chip "📚 RoPA Builder · Included with any subscription"; H1 "Build an audit-ready Record of Processing Activities (RoPA) in minutes" — good differentiation.
  - **Recommendations**: (b) Standardize H1 token. (c) Three CTAs stacked (plans, sample document, SampleReportLink) — consider demoting one to reduce redundancy.

- **Trust bar** — good.

## `/notice-builder` — Notice Builder Landing
File: `src/pages/NoticeBuilderLanding.tsx`

### Elements
- **PageHero** (`bg-slate-900` — another distinct dark shade)
  - **Typography**: `PageHero` internal `font-serif mb-3 text-white` (no `text-hero-h1` token) — every page using `PageHero` inherits this non-token styling.
  - **Messages**: chip "🌍 Privacy Notice Builder · US & EU/Global · Included with any subscription"; H1 "Generate your privacy notices — US states and EU/Global frameworks, in one place." — distinct from chip.
  - **Recommendations**: (b) **Fix `PageHero.tsx` to use `bg-brand-navy` and `text-hero-h1`** — resolves the same drift across three pages simultaneously. (c) Four interactive elements ATF; two `SampleReportLink`s already subordinated via `variant="link"` — acceptable.

- **"Pick your flow" cards** — differentiated by RequirementBadge; no dupes.

## `/eu-global-notice-builder` — EU & Global Notice Builder
File: `src/pages/eu-notices/EUNoticeLanding.tsx`

### Elements
- **PageHero**
  - **Messages**: chip "🌐 EU & Global Notice Builder · Included with any subscription"; H1 "EU & Global Privacy Notice Builder" — near-duplicate.
  - **Recommendations**: (a) Tighten chip vs H1 overlap. (d) **Helmet title uses "EndUserPrivacy" (no spaces)** vs. "End User Privacy" (with spaces) elsewhere — brand-name inconsistency.

## `/us-notices` (landing) — US Privacy Notice Builder
File: `src/pages/us-notices/USNoticeLanding.tsx`

### Elements
- **PageHero**
  - **Messages**: chip "📋 US Privacy Notice Builder · Included with any subscription"; H1 "Generate US privacy notices for all 20 states — in one session." — good.
  - **Recommendations**: (b) Same `PageHero` fix. (d) Helmet/meta set imperatively via `useEffect`+`document.title` rather than `react-helmet-async` used by every sibling — inconsistent SEO implementation.

- **Trust bar** — fine.

## `/registration-manager` — Registration Manager
File: `src/pages/RegistrationLanding.tsx`

### Elements
- **Header banner**
  - **Typography**: `bg-[#0d2a45]`; H1 `font-serif` (not `text-hero-h1`).
  - **Messages**: chip "📂 Registration Manager · $X per filing"; H1 "Privacy registration filings, drafted and tracked" — good.
  - **Recommendations**: (b) Standardize.

- **CTA row**
  - **Messages**: "Start free assessment" (primary) / "How it works" (secondary anchor); "Free assessment · No card required · Pay only when you generate documents."
  - **Recommendations**: (c) Clear single primary CTA — good pattern to emulate on other tool pages.

- **Problem section**
  - **Typography**: icons `text-amber-600` (hardcoded).
  - **Recommendations**: (b) Replace with amber accent token.

---

# 5. Samples, Auth & Global Chrome

(sub_vtjfsdqa)

## `/samples` — SamplesHub
File: `src/pages/SamplesHub.tsx`

### Elements
- **Hero (navy header)**
  - **Typography**: `text-xs uppercase tracking-[0.18em] text-brand-cloud` eyebrow; `font-display text-4xl md:text-5xl text-white` H1; `text-slate-300 text-lg` subhead. Not using `text-eyebrow`/`text-meta` tokens.
  - **Messages**: "Sample Reports" (eyebrow), "See exactly what you'll get" (H1), body copy, CTA "Generate your own report →".
  - **Recommendations**: (a) Trim subhead. (b) Standardize to `text-eyebrow`. (d) Helmet title "Sample Reports — See what you'll get" doesn't exactly match H1 "See exactly what you'll get" — align.

- **Filter chips**
  - **Messages**: "Filter by tool", "Filter by jurisdiction", "All tools", "All types".
  - **Recommendations**: (a) **"All types" inconsistent with "Filter by jurisdiction" label** — rename to "All jurisdictions".

- **Sample cards grid**
  - **Typography**: `font-display text-xl md:text-2xl text-brand-navy` card title; `text-sm text-muted-foreground` scenario copy.
  - **Messages**: "View sample", "Start your own →" per card (expected). Empty states distinct.
  - **Recommendations**: (c) Two competing link CTAs per card — differentiate weight; make "View sample" the primary visual anchor.

## `/samples/:toolSlug` — SampleReport
File: `src/pages/SampleReport.tsx`

### Elements
- **Breadcrumb + back link**
  - **Messages**: "Home / Sample Reports / {tool}", "← All samples".
  - **Recommendations**: (a) Two "go back" affordances stacked is duplicative — remove one.

- **Page header**
  - **Typography**: `font-display text-3xl md:text-4xl text-brand-navy` H1.
  - **Messages**: H1 "Sample {tool} report"; body; CTA "Start your own {tool}".

- **Per-report article cards**
  - **Typography**: amber pill "SAMPLE — fictional scenario"; H2 title; `font-mono text-xs uppercase text-muted-foreground` meta.
  - **Messages**: "Start your own {displayName}" CTA appears at header + per-article + footer — up to 3x on one page.
  - **Recommendations**: (a) Consolidate to header + single bottom CTA. (c) Collapse header CTA when only one sample article exists.

- **Legal disclaimer** — good.

## `/samples/:toolSlug/:variant` — SampleReportView
File: `src/pages/SampleReportView.tsx`

### Elements
- **Breadcrumb + back link** — same duplication pattern as SampleReport.

- **Report header**
  - **Typography**: amber pill; H1 = report title (not tool name); `text-sm text-muted-foreground` meta.
  - **Messages**: H1 uses fictional report title while parent uses generic descriptive H1 — inconsistent H1 strategy across closely related pages.
  - **Recommendations**: (d) Consider prefixing H1 with tool name for SEO/search-intent alignment.

- **Sidebar (About this sample / TOC)**
  - **Messages**: "Start your own →" appears in sidebar AND main content AND header — three instances.
  - **Recommendations**: (a) Reduce to two.

- **Prev/Next variant nav** — good.

## `/notices-ropa` — NoticesRopaHub
File: `src/pages/NoticesRopaHub.tsx`

### Elements
- **Header**
  - **Typography**: `font-display text-brand-navy` H1 (no explicit size); `text-sm text-slate` subline; `text-xs text-brand-mist` description.
  - **Messages**: dynamic client-name H1; workspace context.
  - **Recommendations**: (d) Helmet title "Notices & RoPA | End User Privacy" is generic and doesn't reflect active client name shown in H1 — align dynamically. (c) "Back to dashboard" uses `ArrowRight` rotated 180° — import `ArrowLeft` directly instead.

- **Action buttons (US Notice / EU Notice / RoPA)** — clear.

- **Document table/list**
  - **Typography**: header row `text-[11px] font-semibold uppercase tracking-wide text-slate`.
  - **Messages**: Empty state clear. Status badges: "Generated", "In progress", raw status fallback shows uncapitalized DB string.
  - **Recommendations**: (b) Normalize status label casing. (c) "View" link duplicated per row (title link + explicit button).

## `/login` — Login
File: `src/pages/Login.tsx`

### Elements
- **Left marketing panel (desktop only)**
  - **Typography**: `text-amber-400 text-[11px] font-bold uppercase tracking-widest` eyebrow (raw palette); `font-display text-white` H2; `text-blue-200 text-[14px]` list items.
  - **Messages**: "Global privacy law, tracked daily." echoed as prefix in the right-panel form subtitle — literal repetition across adjacent panels.
  - **Recommendations**: (a) Vary right-panel subtitle. (b) Swap raw Tailwind palette classes for brand tokens.

- **Sign-in form**
  - **Typography**: `text-sm font-medium text-brand-navy` labels; `text-[14px]` inputs; submit `text-[14px] font-semibold text-white`.
  - **Messages**: Dynamic subtitle (4 redirect-param variants) — good personalization. Error banner shows raw Supabase `error.message`.
  - **Recommendations**: (a) Map common auth errors to friendly copy. (c) Password field's exfiltration-blocking (`onCopy`/`onCut`/`onDrop`) is unusual UX friction — verify intentional; may confuse password managers.

- **Footer links / disclaimer**
  - **Messages**: "Signing in here will sign you out on any other device." — clearly disclosed near action.

## `/signup` — Signup
File: `src/pages/Signup.tsx`

### Elements
- **Paused-signup card**
  - **Typography**: `font-display text-brand-navy` H1; `text-sm text-slate` body.
  - **Messages**: H1 "Account creation paused"; "Create a free account to save reports..." — advertises benefit for a disabled action, contradictory framing; "End User Privacy is currently in private beta..."
  - **Recommendations**: (a) Reorder or cut the pitch line since it undercuts the "paused" message. (d) Helmet title + `noindex` appropriate.

## `/forgot-password` — ForgotPassword
File: `src/pages/ForgotPassword.tsx`

### Elements
- **Request form**
  - **Typography**: `font-display text-brand-navy` H1 "Reset Password".
  - **Messages**: H1 "Reset Password" is the same as `/reset-password`'s actual reset step.
  - **Recommendations**: (d) Rename this H1 to "Forgot your password?" to differentiate from ResetPassword.

- **Sent-confirmation state**
  - **Typography**: `font-display text-brand-navy` H2 "Check your inbox"; emoji `📧` (inconsistent with lucide-react icons used elsewhere).
  - **Recommendations**: (b) Replace emoji with `Mail`/`CheckCircle` lucide icons for consistency.

## `/reset-password` — ResetPassword
File: `src/pages/ResetPassword.tsx`

### Elements
- **Verifying state** — clear escape hatch.

- **Set-new-password form**
  - **Messages**: H1 "Set New Password" + submit button "Set New Password →" — button label duplicates H1 verbatim.
  - **Recommendations**: (a) Change button to "Save password" or "Update Password".

- **Success state**
  - **Typography**: emoji `✅` — same inconsistency.

## `/check-email` — CheckEmail
File: `src/pages/CheckEmail.tsx`

### Elements
- **Confirmation card**
  - **Typography**: emoji `📧`; H1 "Check your inbox".
  - **Messages**: H1 identical to ForgotPassword's sent-confirmation H2.
  - **Recommendations**: (a) Differentiate to "Confirm your account" / "Verify your email". (d) Helmet title "Check Your Email" doesn't exactly match H1 "Check your inbox". (b) Replace emoji with lucide icon.

- **"Didn't get it?" tips box** — clear.

## `/` (global chrome) — Navbar
File: `src/components/Navbar.tsx`

### Elements
- **Top-level nav items**
  - **Typography**: default nav styling — no explicit `text-*` classes shown; verify contrast on navy.
  - **Messages**: "Feed", "Intelligence", "CPPA", "Tools", "Research" — clear.
  - **Recommendations**: (c) Verify keyboard/mobile parity for five mega-menus.

- **Mega-menu sections**
  - **Typography**: section headers use inline `headerColor` hex/token strings (`text-[#185FA5]`, `text-brand-mist`) — mixing raw hex with tokens.
  - **Messages**: subs like "No account required" vs "Free · no account needed" — same idea, inconsistent wording.
  - **Recommendations**: (a) Standardize "no account required/needed" sitewide. (b) Replace raw hex color classes with brand tokens.

- **UserMenu (logged-in)** — standard.

## `/` (global chrome) — Topbar
File: `src/components/Topbar.tsx`

### Elements
- **Utility strip**
  - **Typography**: `text-meta tracking-wide text-brand-mist` on `bg-brand-navy` — correct token use.
  - **Messages**: "Last update: {time}", "Latest Privacy Intelligence Report: {dateRange}", "About", "Contact", "Log In".
  - **Recommendations**: (c) `hidden md:block` — mobile loses utility links; confirm reachable via Navbar mobile menu.

## `/` (global chrome) — Footer
File: `src/components/Footer.tsx`

### Elements
- **Brand column**
  - **Typography**: social icons plain text glyphs ("in", "𝕏") vs lucide `Mail` icon in same row.
  - **Recommendations**: (b) Replace text glyphs with SVG icon components.

- **Product / Company link columns**
  - **Typography**: `text-[11px] font-bold tracking-[0.09em] uppercase text-silver` headers (should use `text-eyebrow`).
  - **Messages**: "Newsfeed" in Footer vs "Feed" in Navbar for the same destination.
  - **Recommendations**: (b) Consolidate to `.text-eyebrow`. (a) Unify terminology.

- **Bottom bar** — standard legal row.

## `/` (global chrome) — BreakingNewsBanner
File: `src/components/BreakingNewsBanner.tsx`

### Elements
- **Breaking news bar**
  - **Typography**: inline styles bypass Tailwind tokens (`backgroundColor: hsl(var(--navy))`, hardcoded font-family).
  - **Messages**: "Breaking" + headline + "Dismiss ×" — minimal.
  - **Recommendations**: (b) Use `bg-brand-navy` and `font-sans` utility classes. (c) `hidden md:flex` — confirm intentional mobile-hidden pattern.

---

# Priority Fix List

## Highest-impact (fix once, apply everywhere)
1. `src/components/home/PageHero.tsx` — switch `bg-slate-900` → `bg-brand-navy` and `font-serif` → `text-hero-h1`. Fixes NoticeBuilderLanding, EUNoticeLanding, USNoticeLanding H1/hero drift.
2. Introduce a shared `<IntelHero />` (or extend `PageHero`) using `bg-brand-slate-teal`, `.text-eyebrow` amber pill, `.text-hero-h1`, `.text-brand-mist` subtitle. Replace hardcoded hex hero backgrounds on Updates, Calendar, Enforcement, GDPREnforcement (already close), Glossary, Horizon, Get Intelligence, LI Tracker, IR Playbook, Biometric Checker, LI Assessment, Governance, DPA, RoPA, Registration Manager.
3. Extract `<FreeToolUpsell />` used by Calendar + Timelines + USStateComparison — copy currently pasted.
4. Sweep `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[14px]`, `text-[15px]`, `text-[17px]`, `text-[22px]`, `text-[28px]`, `text-[36px]`, `text-[44px]` → map to existing `.text-body-tiny`, `.text-meta`, `.text-label-caps`, `.text-body`, `.text-card-title`, `.text-section-h2`, `.text-page-h1`, `.text-hero-h1` tokens.
5. Fix `RegulatorPage.tsx` `text-[9px]` bug — almost certainly meant `text-sm`.

## Copy bugs (fix immediately)
- LI Tracker premium footer: "⭐ Intelligence Intelligence" → "⭐ Go Premium".
- LI Assessment intro: "actionable Intelligence" → "actionable intelligence".
- Subscribe H1: "Two plans. One Mission." → consistent casing.
- USPrivacyLaws: remove `md:text-sm` no-op.
- EU Notice Landing Helmet: "EndUserPrivacy" → "End User Privacy".
- JurisdictionsHub hero + map disclaimer: remove references to non-existent "Grid view".
- EnforcementActionDetail: canonical + back link use `/enforcement-intelligence` — fix to `/enforcement`.
- USStateComparison JSON-LD: "20 enacted" → derive from `states.length`.
- Homepage "How it fits together" (Monitor col) + About "Why EUP" + FAQ + Subscribe: replace "AI analysis" / "AI-assisted" / "AI investigation prompt" with "automatically generated" phrasing per brand voice.
- About / Contact: reconcile "within one business day" vs "within 24 hours" SLA.
- Terms of Service: replace Shopify boilerplate with SaaS-appropriate copy.
- Privacy Policy: merge duplicated Google AdSense sub-block (Section 4) into Section 5.

## Structural / IA
- Homepage: 4× consecutive CPPA-scope CTAs (Hero, HomeGeographyPaths, CPPADeadlineStrip, HomepageToolsSection). Consolidate.
- Updates: 4× overlapping "personalized report" CTAs. Consolidate.
- Subscribe: "3 free Smart Tool runs/year" appears 4× on one page. Trim in-card duplicate.
- About: remove legacy prose block that duplicates hero + mission earlier on the same page.
- Samples: 3× "Start your own {tool}" per page. Trim.
- Ropa Landing / Notice Builder: 3–4 competing CTAs ATF. Demote secondary sample links.
- Timelines index vs Calendar: unify header treatment (both are "Reference" tier, currently one is light, one is teal).
- EnforcementActionDetail: five `<h2>` labels ("Key compliance failure", "Violation types", etc.) → convert to `<span class="text-eyebrow">`.
- GlossaryTerm: three oversized `<h2>` section labels → same treatment.

## SEO
- Add `BreadcrumbList` JSON-LD on JurisdictionPage and USStateLawPage (breadcrumbs visible but not in schema).
- Standardize canonical URLs to absolute (`https://enduserprivacy.com/...`) — currently mixed with relative paths on BreachNotification, CrossBorderTransfers.
- Mark 404 states (`JurisdictionPage` not-found) `noindex`.
- Add meta description to `/start` if it's ever indexed.
- Confirm no duplicate `<meta name="description">` tags render on GlobalPrivacyLaws and AIPrivacyRegulations (defined in both `<Helmet>` and layout props).
- Migrate US Notices landing from imperative `document.title` to `<Helmet>` for consistency and to avoid FOUC.
