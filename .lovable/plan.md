# Automatic preview build for sample reports

The truncated-sample machinery is live, but today the preview (first sections / first 2 PDF pages + TOC) is only built when someone clicks in the admin screen. Since the real sample documents have not been generated yet, the preview build must be automatic at generation time — never a remembered manual step.

## Principle

The public `/samples` pages read only the preview columns. A published row without a preview shows nothing. So:

1. Any write that changes a sample's content must rebuild the preview in the same operation.
2. Any write that cannot rebuild it must clear the preview (fail closed) rather than leave a stale one.

## Where the hook goes

All content writes go through the `save-sample-report` backend function. The preview build becomes part of that function instead of a separate admin call:

| Action | Behaviour to add |
|---|---|
| `snapshot` (saves document text / report data) | rebuild preview from the new content |
| `attach_pdf` / `generate_pdf` (PDF-backed samples: RoPA, US/EU notices) | rebuild the 2-page preview PDF from the new file |
| `set_status` → published | rebuild if missing or stale (already wired in the admin screen; moves server-side) |
| `backfill_all` | rebuild for every row it touches |
| `delete` | delete the sibling `--preview.pdf` object too |

The build logic itself already exists (shared preview module + `build-sample-preview`); `save-sample-report` calls the same code path so there is exactly one definition of "first 2 pages and TOC".

## Staleness guard

Store a content fingerprint alongside the preview. On publish, if the fingerprint does not match the current document, the row is treated as having no preview: the public page hides it and the admin list flags it "preview stale — rebuild". This makes a forgotten rebuild a visible gap, never a leak of the wrong excerpt.

## Admin visibility

On `/admin/sample-reports`, each card shows preview status (built / stale / none) with the section or page counts kept and withheld, plus the existing manual rebuild buttons as an override. A one-line summary at the top reports how many published samples lack a preview.

## What stays unchanged

Live tools, intake flows, the generators themselves, the document renderers, and the admin full-document views. This work only affects what gets stored as the public excerpt and when it is computed.

## Verification when the real samples land

For each generated sample: confirm the public page shows only the kept sections or 2 PDF pages, the TOC lists the withheld titles, the withheld body text is absent from the page source and network responses, and the preview PDF object contains exactly two pages.
