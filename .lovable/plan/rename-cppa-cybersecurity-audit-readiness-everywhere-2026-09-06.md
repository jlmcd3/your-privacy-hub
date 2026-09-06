# Rename CPPA Cybersecurity Audit Readiness everywhere

## Goal
Use **CPPA Cybersecurity Audit Readiness** as the canonical product name everywhere customers encounter it, including generated reports and documents. Use **CPPA Cybersecurity Audit Readiness Report** where a formal report title is required.

## Changes
- Update navigation, homepage, product catalogue, pricing, subscription comparisons, sample-report labels, account/report history, CPPA hub and scope-checker references.
- Update the product landing and intake experience, status/loading text, cross-links, admin labels, and shared product registries.
- Update customer-facing names and descriptions in frontend and backend pricing registries, while preserving prices, lookup keys, routes, slugs, table names, and internal tool identifiers.
- Update generated PDF/report headings, fallback report titles, suite-module headings, Word-conversion labels, handoff documents, and other generated product references.
- Update assertions, snapshots, and fixtures whose expected text intentionally tracks the product name.
- Retain ordinary statutory/descriptive uses of “cybersecurity audit” where they refer to the legally required independent audit rather than the product.

## Verification
- Scan the full application and function code for the superseded product labels: **CPPA Cybersecurity Readiness**, **CPPA Cybersecurity Audit**, and product-specific standalone **Cybersecurity Audit Readiness**.
- Confirm every remaining shorter phrase is either an internal identifier or a genuine generic/statutory reference, not a product label.
- Run TypeScript checks and focused frontend/report-generation tests, including the CPPA cybersecurity document-title tests.
- Deploy every affected customer-facing function, then verify the live product page and a generated/report rendering path use the canonical name.

## Technical details
- Canonical product name: `CPPA Cybersecurity Audit Readiness`
- Formal report name: `CPPA Cybersecurity Audit Readiness Report`
- No route, slug, database key, payment lookup key, price, entitlement, or assessment logic changes.
