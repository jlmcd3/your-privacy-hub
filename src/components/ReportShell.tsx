// ReportShell — branded chrome for assessment-result pages.
// Provides:
//   • Navy header band matching the website's hero/header treatment
//     (`bg-slate-900` like LIAssessmentResult) with EndUserPrivacy logo
//   • Title + meta line + action slot (PDF, Copy, etc.) on the right
//   • Prominent "not legal advice" disclaimer banner at the top of the body
//   • Standard ToolDisclaimer at the bottom
// Use this as the wrapper around <AssessmentReport /> for any tool result page.

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import ToolDisclaimer from "@/components/ToolDisclaimer";

export interface ReportShellProps {
  /** Page title shown inside the navy header band */
  title: string;
  /** Optional small line under the title, e.g. "Generated April 30 · United Kingdom" */
  meta?: ReactNode;
  /** Optional action buttons (e.g. download PDF, copy) */
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
  /** Optional override for the top disclaimer banner body (after the bold lead-in). If provided, replaces the default "compliance framework" wording. */
  topDisclaimer?: ReactNode;
  /** Optional override for the bold lead-in label of the top disclaimer (default: "Not legal advice."). */
  topDisclaimerLead?: string;
}

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
}: ReportShellProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Navy header band — matches site header convention */}
      <header className="bg-slate-900 text-white px-6 py-6 sm:px-8 sm:py-7">
        {/* Logo plate — keeps the brand colors readable on the navy band */}
        <Link to="/" className="inline-block mb-4 bg-white rounded-md px-3 py-1.5 shadow-sm">
          <img
            src="/logo.png"
            alt="End User Privacy"
            width={1111}
            height={281}
            className="h-7 w-auto shrink-0 rounded object-contain"
          />
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky">
              Compliance Tool · Customised Analysis
            </p>
            <h1 className="font-display leading-tight text-white mt-1">
              {title}
            </h1>
            {meta && (
              <p className="text-[12px] text-slate-300 mt-1.5">{meta}</p>
            )}
          </div>
          {actions && (
            <div className="flex gap-2 flex-wrap items-center">{actions}</div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-5">
        {/* Top legal disclaimer — visible, brand-aware, not alarming */}
        <div className="border-l-4 border-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.08)] rounded-r-md px-4 py-3">
          <p className="text-[12px] leading-relaxed text-foreground">
            <span className="font-semibold text-navy">{topDisclaimerLead}</span>{" "}
            {topDisclaimer ?? (
              <>
                This document is a compliance framework generated for informational
                purposes only. It does not create an attorney-client relationship.
                Always consult qualified legal counsel for advice specific to your
                situation.
              </>
            )}
          </p>
        </div>

        {callout}

        {children}

        <ToolDisclaimer addition={disclaimerAddition} />

        <div className="pt-2">
          <Link
            to={backHref}
            className="inline-flex items-center text-sm text-slate hover:text-navy no-underline"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
