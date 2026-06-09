// Sprint 2 #3 — Auditor Handoff Package
// Single combined PDF strategy: render a print-friendly cover index at the top
// of the report, inject print CSS that hides chrome and expands collapsed details,
// then call window.print() so the browser produces one PDF that contains:
//   1. Cover index
//   2. Cyber readiness report (controls, top risks, enforcement context)
//   3. Auditor independence advisor (with the user's answers + memo)
//   4. Audit scope memo (with the user's edits)
//   5. Pre-audit readiness gap log
//   6. Framework mapping (NIST / ISO 27001 / SOC 2)
//   7. Citation ledger (from validator)
// User's typed answers/edits are captured because the print captures the live DOM.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

type Props = {
  row: any;
};

// Inject print-only CSS once on mount. Hides everything outside .handoff-print-root,
// expands <details>, removes interactive button rows, and forces light backgrounds.
function usePrintStyles() {
  useEffect(() => {
    if (document.getElementById("auditor-handoff-print-styles")) return;
    const style = document.createElement("style");
    style.id = "auditor-handoff-print-styles";
    style.textContent = `
@media print {
  @page { size: Letter; margin: 0.6in; }
  html, body { background: #fff !important; color: #000 !important; }
  /* Hide chrome */
  nav, header[role="banner"], footer, [data-print-hide],
  .navbar, .Navbar, .footer, .Footer,
  button[data-print-hide], a[data-print-hide] { display: none !important; }
  /* Expand collapsibles so they print */
  details { page-break-inside: avoid; }
  details > summary { list-style: none; }
  details:not([open]) > *:not(summary) { display: revert !important; }
  /* Avoid splitting a section across pages where we can */
  section { page-break-inside: avoid; }
  /* Show cover only when printing the handoff */
  .handoff-cover { display: block !important; page-break-after: always; }
  /* Lighten dark hero blocks for ink */
  .bg-slate-900 { background: #fff !important; color: #000 !important; border-bottom: 2px solid #000; }
  .bg-slate-900 * { color: #000 !important; }
  /* Force table borders to print */
  table, th, td { border-color: #999 !important; }
  /* Remove sticky nav effects */
  .sticky, [class*="sticky"] { position: static !important; }
}
.handoff-cover { display: none; }
.handoff-cover.always-show { display: block; }
`;
    document.head.appendChild(style);
  }, []);
}

export function AuditorHandoffCover({ row }: { row: any }) {
  usePrintStyles();
  const report = row?.report_data || {};
  const profile = row?.intake_data?.profile || {};
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <section className="handoff-cover bg-card border rounded-lg p-10">
      <p className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase">CPPA Cybersecurity Audit — 11 CCR §§ 7120–7124</p>
      <h1 className="font-serif mt-2 mb-1">Auditor Handoff Package</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Prepared {today}. This document compiles the materials the business has prepared in advance of its
        independent cybersecurity audit. It is intended for delivery to the engaged auditor as a single
        artefact. None of the contents constitute a substitute for the auditor's independent testing.
      </p>

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs border-t border-b py-4 mb-6">
        <div><span className="text-muted-foreground">Assessment ID:</span> <span className="font-mono">{row?.id || "—"}</span></div>
        <div><span className="text-muted-foreground">Generated:</span> {row?.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</div>
        <div><span className="text-muted-foreground">Industry / sector:</span> {profile.industry || "—"}</div>
        <div><span className="text-muted-foreground">Baseline framework:</span> {profile.framework || "—"}</div>
        <div><span className="text-muted-foreground">Most recent prior audit:</span> {profile.last_audit || "—"}</div>
        <div><span className="text-muted-foreground">Reportable incidents (12m):</span> {profile.incidents_12mo || "—"}</div>
        <div><span className="text-muted-foreground">Overall readiness score:</span> {report?.overall_score != null ? `${report.overall_score} / 100` : "—"}</div>
        <div><span className="text-muted-foreground">Readiness level:</span> {report?.readiness_level || "—"}</div>
      </div>

      <h2 className="mb-2">Contents</h2>
      <ol className="text-sm space-y-1 list-decimal list-inside">
        <li>Cybersecurity readiness report — executive summary, all 18 § 7122(a) component findings, top risks, enforcement context</li>
        <li>Auditor independence determination — § 7122(b) six-question check and engagement-letter memo</li>
        <li>Audit scope memo — § 7123 in-scope systems, data categories, processing activities, exclusions, deliverables</li>
        <li>Pre-audit readiness gap log — remediation tasks with target dates back-solved from the April 1, 2028 deadline</li>
        <li>Framework mapping — CPPA component cross-walk to NIST CSF 2.0 / ISO 27001:2022 / SOC 2 TSC, with CPPA-specific evidence the auditor must collect</li>
        <li>Citation ledger — every statute, regulation, FSOR commentary, and enforcement action cited in the report, with verification status</li>
      </ol>

      <div className="mt-6 p-4 border-l-4 border-brand-teal bg-brand-teal/5 text-xs">
        <p className="font-semibold mb-1">Note to the auditor</p>
        <p>
          Findings flagged "requires attorney review" in the citation ledger should be
          independently verified against the primary source before being relied upon. The independence
          determination and scope memo reflect the business's representations; the auditor remains responsible
          for confirming both under § 7122(b) and § 7123.
        </p>
      </div>
    </section>
  );
}

export default function AuditorHandoffButton({ row }: Props) {
  const [busy, setBusy] = useState(false);
  usePrintStyles();

  const handleDownload = () => {
    setBusy(true);
    // Expand every <details> on the page so the print captures their contents.
    const detailsList = Array.from(document.querySelectorAll("details"));
    const previouslyOpen = detailsList.map((d) => d.open);
    detailsList.forEach((d) => { d.open = true; });
    // Force the cover to render (it's normally display:none on screen).
    const cover = document.querySelector(".handoff-cover");
    cover?.classList.add("always-show");

    const originalTitle = document.title;
    document.title = `CPPA Cybersecurity — Auditor Handoff Package — ${row?.id?.slice(0, 8) || "report"}`;

    const cleanup = () => {
      detailsList.forEach((d, i) => { d.open = previouslyOpen[i]; });
      cover?.classList.remove("always-show");
      document.title = originalTitle;
      window.removeEventListener("afterprint", cleanup);
      setBusy(false);
    };
    window.addEventListener("afterprint", cleanup);

    // Give the browser a tick to render the expanded DOM before opening the dialog.
    setTimeout(() => {
      window.print();
      // Safety net in case afterprint never fires (some browsers).
      setTimeout(cleanup, 1500);
    }, 100);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDownload}
      disabled={busy}
      data-print-hide
      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg transition-colors disabled:opacity-60"
    >
      <FileDown className="w-3.5 h-3.5" />
      {busy ? "Preparing…" : "Download Auditor Handoff Package (PDF)"}
    </Button>
  );
}
