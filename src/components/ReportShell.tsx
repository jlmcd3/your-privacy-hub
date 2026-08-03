// ReportShell — law-firm-grade report chrome for assessment-result pages.
//
// Design: Cravath annual review crossed with Stripe docs — restrained,
// typographic, no emoji. DM Serif Display headings, DM Sans body. Navy
// cover, accents only via hsl(var(--gold)) and hsl(var(--cobalt)).
//
// PART 1 of 2: cover block + section system. Footnote/methodology
// components arrive in part 2. All existing props remain backward
// compatible so the 7 current result-page usages render unchanged.
//
// Print-first: CSS/SVG only, no canvas, no chart libraries — so the
// render-html-to-pdf pipeline reproduces the chrome faithfully.

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import ReportDisclaimer from "@/components/ReportDisclaimer";

export interface ReportShellProps {
  /** Page title shown inside the navy cover */
  title: string;
  /** Optional small line under the title, e.g. "Generated April 30 · United Kingdom" */
  meta?: ReactNode;
  /** Optional action buttons (e.g. download PDF, copy) — rendered top-right of the cover */
  actions?: ReactNode;
  /** Main report body */
  children: ReactNode;
  /** Optional callout (e.g. BIPA risk) shown between the disclaimer and report */
  callout?: ReactNode;
  /** Footer "Back" link target — defaults to /dashboard/reports */
  backHref?: string;
  /** Footer "Back" label */
  backLabel?: string;
  /** Optional tool-specific tail sentence appended to the bottom ToolDisclaimer */
  disclaimerAddition?: string;
  /** Optional override for the top disclaimer banner body */
  topDisclaimer?: ReactNode;
  /** Optional override for the bold lead-in label of the top disclaimer */
  topDisclaimerLead?: string;

  // ---- New optional props (all backward compatible) ----
  /** Client/org name shown on the cover matter grid */
  preparedFor?: string;
  /** Version label shown on the cover matter grid */
  version?: string;
  /** Confidentiality line at the bottom of the cover */
  confidentiality?: string;
  /** When true, suppress EUP logo and any EndUserPrivacy branding */
  whiteLabel?: boolean;
  /** Cover eyebrow label — "Compliance Assessment" vs "Legal Instrument" */
  toolCategory?: "assessment" | "instrument";
}

const DEFAULT_CONFIDENTIALITY =
  "Confidential — prepared for internal compliance use";

export default function ReportShell({
  title,
  meta,
  actions,
  children,
  callout,
  backHref = "/dashboard/reports",
  backLabel = "← Back to My Reports",
  disclaimerAddition,
  topDisclaimer,
  topDisclaimerLead = "Not legal advice.",
  preparedFor,
  version,
  confidentiality = DEFAULT_CONFIDENTIALITY,
  whiteLabel = false,
  toolCategory = "assessment",
}: ReportShellProps) {
  const eyebrow =
    toolCategory === "instrument" ? "Legal Instrument" : "Compliance Assessment";

  // Matter-style meta rows — render only those with values.
  const matterRows: Array<{ label: string; value: ReactNode }> = [];
  if (preparedFor) matterRows.push({ label: "Prepared for", value: preparedFor });
  if (version) matterRows.push({ label: "Version", value: version });

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Cover block */}
      <header
        className="bg-brand-navy text-white px-6 py-10 sm:px-8 sm:py-12"
        style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
      >
        {!whiteLabel && (
          <Link to="/" className="inline-block mb-6">
            <img
              src="/brand/logo-dark.svg"
              alt="End User Privacy"
              className="h-10 w-auto shrink-0 object-contain"
            />
          </Link>
        )}

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "hsl(var(--gold))" }}
            >
              {eyebrow}
            </p>
            <h1 className="font-display leading-tight text-white mt-2 text-3xl sm:text-4xl">
              {title}
            </h1>
            {meta && (
              <p className="mt-3 text-[12px] text-slate-300">{meta}</p>
            )}

            {matterRows.length > 0 && (
              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[12px] text-slate-300 max-w-xl">
                {matterRows.map((row) => (
                  <div key={row.label} className="flex gap-2">
                    <dt className="font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                      {row.label}:
                    </dt>
                    <dd className="min-w-0">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {actions && (
            <div className="flex gap-2 flex-wrap items-center">{actions}</div>
          )}
        </div>

        <div
          className="mt-8 pt-4 border-t"
          style={{ borderColor: "hsl(var(--gold) / 0.6)" }}
        >
          <p className="text-[11px] italic text-slate-300">{confidentiality}</p>
        </div>
      </header>

      {/* Body */}
      <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-5">
        {callout}

        {children}

        <ReportDisclaimer />

        <div className="pt-2">
          <Link
            to={backHref}
            className="inline-flex items-center text-sm text-slate hover:text-brand-navy no-underline"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportSection — document-style numbered section primitive.
//
// Renders a baseline-aligned header row:
//   § {num}        {title}                              {statute}
// followed by an optional serif pull quote and the section body.
// No card borders, no rounded boxes — this is a legal document, not a
// dashboard. Sections are spaced mt-10 and marked break-inside: avoid for
// faithful PDF pagination.
// ---------------------------------------------------------------------------

export interface ReportSectionProps {
  num: string;
  title: string;
  statute?: string;
  pullQuote?: string;
  children?: ReactNode;
}

export function ReportSection({
  num,
  title,
  statute,
  pullQuote,
  children,
}: ReportSectionProps) {
  return (
    <section
      className="mt-10"
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="flex items-baseline gap-4 flex-wrap">
        <span
          className="font-display text-xl shrink-0"
          style={{ color: "hsl(var(--gold))" }}
        >
          § {num}
        </span>
        <h2 className="font-display text-brand-navy text-xl leading-tight flex-1 min-w-0">
          {title}
        </h2>
        {statute && (
          <span className="font-mono text-[11px] text-muted-foreground text-right shrink-0">
            {statute}
          </span>
        )}
      </div>

      {pullQuote && (
        <blockquote className="mt-4 border-l-2 border-[hsl(var(--gold))] pl-4 italic font-display text-lg text-brand-navy">
          {pullQuote}
        </blockquote>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fn — inline superscript citation marker.
// ---------------------------------------------------------------------------

export function Fn({ n }: { n: number }) {
  return (
    <sup>
      <a
        href={`#fn-${n}`}
        className="no-underline text-[0.7em] font-semibold"
        style={{ color: "hsl(var(--cobalt))" }}
      >
        {n}
      </a>
    </sup>
  );
}

// ---------------------------------------------------------------------------
// FootnoteList — compact numbered footnotes under a thin top border.
// ---------------------------------------------------------------------------

export interface FootnoteItem {
  n: number;
  text: string;
  cite?: string;
  verbatim?: boolean;
}

export function FootnoteList({ notes }: { notes: FootnoteItem[] }) {
  return (
    <div className="border-t pt-3 mt-6">
      <ol className="list-none space-y-1">
        {notes.map((note) => (
          <li
            key={note.n}
            id={`fn-${note.n}`}
            className="text-[12px] leading-snug"
          >
            <span className="font-semibold">{note.n}.</span>{" "}
            {note.text}
            {note.cite && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {" "}
                {note.cite}
                {note.verbatim === true
                  ? " (verbatim)"
                  : note.verbatim === false
                    ? " (summary)"
                    : ""}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuthoritiesAppendix — closing section listing relied-upon authorities.
// ---------------------------------------------------------------------------

export interface AuthorityGroup {
  heading: string;
  items: Array<{ cite: string; detail?: string; href?: string }>;
}

export function AuthoritiesAppendix({ groups }: { groups: AuthorityGroup[] }) {
  return (
    <ReportSection num="A" title="Authorities Relied Upon">
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              {group.heading}
            </p>
            <ul className="space-y-1">
              {group.items.map((item, idx) => (
                <li key={idx} className="text-[12px] leading-snug">
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="font-mono no-underline"
                      style={{ color: "hsl(var(--cobalt))" }}
                    >
                      {item.cite}
                    </Link>
                  ) : (
                    <span className="font-mono">{item.cite}</span>
                  )}
                  {item.detail && (
                    <span className="text-[11px] text-muted-foreground">
                      {" "}
                      {item.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

// ---------------------------------------------------------------------------
// MethodologySection — how the report was produced.
// ---------------------------------------------------------------------------

export interface MethodologySectionProps {
  provided: string[];
  retrieved: Array<{ label: string; date?: string }>;
  model: string;
  generatedAt: string;
}

export function MethodologySection({
  provided,
  retrieved,
  model,
  generatedAt,
}: MethodologySectionProps) {
  return (
    <ReportSection num="M" title="Methodology and Sources">
      <div className="space-y-4 text-[12px] leading-snug">
        <div>
          <p className="font-semibold text-brand-navy mb-1">
            Information you provided
          </p>
          <p>{provided.join(", ")}</p>
        </div>

        <div>
          <p className="font-semibold text-brand-navy mb-1">
            Authorities retrieved
          </p>
          <ul className="space-y-0.5">
            {retrieved.map((r, i) => (
              <li key={i}>
                {r.label}
                {r.date && <span className="text-muted-foreground"> ({r.date})</span>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-brand-navy mb-1">Drafting</p>
          <p>
            Drafted by {model} on {generatedAt}.
          </p>
          <p className="text-muted-foreground mt-1">
            All legal statements derive from the retrieved authorities above;
            items marked [FILL-IN] had no on-point authority and additional
            information is required.
          </p>
        </div>
      </div>
    </ReportSection>
  );
}
