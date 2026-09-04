# Truncated Sample Documents — Scope

Public sample pages show only the opening portion of each document, followed by a table of contents for the remaining sections. The withheld content never reaches the browser. No excerpt callouts.

## What the visitor sees

1. Existing sample page header (title, scenario summary, citation-verification line) — unchanged.
2. The first 1–2 "pages" of the document (see cut rule below).
3. A boundary strip: "This sample continues for N more sections."
4. A table of contents listing every remaining section heading (titles only, no body text, not links).
5. A CTA block matching the intake gate copy, linking to the product's intake.

No blur. Withheld text is absent from the DOM and absent from the API response.

## The cut rule

One rule for every product, applied at publish time:

- Skeleton/structured documents: keep whole top-level sections until the kept text exceeds a target character budget (~4,500 chars ≈ two printed pages), minimum 1 section, maximum 3. Never cut mid-section.
- Prose documents (DPA, IR Playbook, Biometric): same budget, splitting on the existing heading detection already used by `AssessmentReport` / `SampleReportBody`.
- PDF-backed samples (RoPA, US Notice, EU Notice): a separate preview PDF containing the first 2 pages, stored alongside the full PDF.

TOC entries are the headings of every section after the cut, in order, taken from the same parse.

## Server-side enforcement (the part that actually protects)

Today `SampleReport.tsx` and `SampleReportView.tsx` select `document_text, report_data, pdf_path` straight from `sample_reports` as anon. Truncating in React would leave the full text in the network response. So:

1. Migration adds nullable preview columns to `sample_reports`: `preview_document_text`, `preview_report_data` (jsonb), `preview_toc` (jsonb array of `{ title, index }`), `preview_pdf_path`, `withheld_section_count`.
2. Migration creates a security-invoker view `public.sample_reports_public` exposing only: id, tool_slug, variant, title, scenario_summary, verification, published_at, the five preview columns. `GRANT SELECT` on the view to `anon` and `authenticated`.
3. Revoke `anon` SELECT on the base `sample_reports` table (keep `authenticated` reads for the admin surface, which is already role-gated). Storage: keep the anon policy on the sample-reports bucket scoped to `preview_pdf_path` objects only.
4. Both public pages switch their query to the view and render preview fields.

## Populating the previews

A publish-time step, not a runtime one:

- New admin-only edge function `build-sample-preview` takes a sample row, applies the cut rule, and writes the preview columns (and, for PDF-backed samples, renders a 2-page preview PDF via the existing PDF path and stores it).
- `AdminSampleReports.tsx` calls it on publish and offers a "Rebuild preview" action, so previews cannot drift from the full document.
- Rows with no preview yet render nothing publicly rather than falling back to the full text — fail closed.

## Front-end changes

- `SampleToolReport` gains a `truncated` mode: renders `preview_report_data` / `preview_document_text` through the same renderers it uses today, then the boundary strip and TOC below.
- New `SampleTocPanel` component: heading list, count line, CTA. Styled with existing brand tokens.
- `SamplePdfEmbed` points at `preview_pdf_path`; the "open the PDF" link is replaced by the CTA.
- Sample links already wired into `AuthGateModal` need no change.

## SEO note

Preview text plus the TOC is indexable and substantive — better for AdSense review than a blurred wall, and the TOC headings carry the section keywords without exposing the reasoning.

## Out of scope

- Excerpt callouts (explicitly excluded).
- Generating the sample documents themselves — previews are built from whatever is published, when it is published.
- Any change to live result pages, generators, or the intake gates.

## Verification

- Confirm the anon network response for `/samples/<slug>` contains no withheld section text (browser check, not just visual).
- Confirm each of the 13 slugs renders preview + TOC, and that a row with no preview renders the fail-closed state.
- Typecheck and the existing sample-report test (`sampleToolReport.panel.test.tsx`), extended for truncated mode.
