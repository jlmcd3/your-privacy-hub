/**
 * Nav_Report .docx generator
 * ---------------------------
 * Produces the 4-section site audit document defined in
 * mem://reference/nav-report.md, versioned (v1, v2, ...) with the next
 * version persisted in localStorage so we never overwrite prior reports.
 *
 * Sections:
 *   1. Navigation Hierarchy   (top nav + footer)
 *   2. Content Access Tiers   (Anonymous / Free / Pro matrix)
 *   3. Gating Leaks            (from src/data/gating-leak-report.json)
 *   4. Products & Pricing      (from src/data/pricing-reconciliation.json)
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import gatingReport from "@/data/gating-leak-report.json";
import pricingReport from "@/data/pricing-reconciliation.json";

const VERSION_KEY = "nav_report_next_version";

function nextVersion(): number {
  const raw = localStorage.getItem(VERSION_KEY);
  const v = raw ? parseInt(raw, 10) : 1;
  localStorage.setItem(VERSION_KEY, String(v + 1));
  return v;
}

// ---------- Static structure mirroring Navbar.tsx + Footer.tsx ----------
// Kept as data (not parsed from JSX) so the report is deterministic.
const NAV_HIERARCHY = [
  {
    section: "Top Nav",
    items: [
      { label: "Updates", href: "/updates", badge: "FREE" },
      { label: "Enforcement", href: "/enforcement", badge: "FREE" },
      { label: "Horizon", href: "/horizon", badge: "PRO" },
      { label: "Tools", href: "/tools", badge: "MIXED" },
      { label: "Subscribe", href: "/subscribe", badge: "CTA" },
    ],
  },
  {
    section: "Intelligence Mega-menu — Free Tools",
    items: [
      { label: "Privacy Laws Map", href: "/jurisdictions", badge: "FREE" },
      { label: "US State Comparison", href: "/compare/us-states", badge: "FREE" },
      { label: "Glossary", href: "/glossary", badge: "FREE" },
      { label: "Calendar", href: "/calendar", badge: "FREE" },
      { label: "Timelines", href: "/timelines", badge: "FREE" },
      { label: "Legislation Tracker", href: "/legislation-tracker", badge: "FREE" },
      { label: "Legitimate Interest Tracker", href: "/legitimate-interest-tracker", badge: "FREE" },
    ],
  },
  {
    section: "Intelligence Mega-menu — Professional Tools",
    items: [
      { label: "Privacy Program Assessment", href: "/governance-assessment", badge: "PRO" },
      { label: "Legitimate Interest Assessment", href: "/li-assessment", badge: "PRO" },
      { label: "Impact Assessment Builder (DPIA)", href: "/dpia-framework", badge: "PRO" },
      { label: "Custom DPA", href: "/dpa-generator", badge: "PRO" },
      { label: "Breach Response Playbook", href: "/ir-playbook", badge: "PRO" },
      { label: "Biometric Compliance Checker", href: "/biometric-checker", badge: "PRO" },
      { label: "Registration Manager", href: "/registration-manager", badge: "PRO" },
    ],
  },
  {
    section: "Updates — Regions",
    items: [
      { label: "EU/UK", href: "/updates?region=eu-uk", badge: "FREE" },
      { label: "United States", href: "/updates?region=us", badge: "FREE" },
      { label: "Global", href: "/updates?region=global", badge: "FREE" },
    ],
  },
  {
    section: "Updates — Topics",
    items: [
      { label: "Cookie Consent", href: "/cookie-consent", badge: "FREE" },
      { label: "Health Data Privacy", href: "/health-data-privacy", badge: "FREE" },
      { label: "Biometric Privacy", href: "/biometric-privacy", badge: "FREE" },
      { label: "Breach Notification", href: "/breach-notification", badge: "FREE" },
      { label: "Cross-Border Transfers", href: "/cross-border-transfers", badge: "FREE" },
      { label: "AI Privacy Regulations", href: "/ai-privacy-regulations", badge: "FREE" },
    ],
  },
  {
    section: "Laws & Frameworks",
    items: [
      { label: "US Privacy Laws", href: "/us-privacy-laws", badge: "FREE" },
      { label: "GDPR Enforcement", href: "/gdpr-enforcement", badge: "FREE" },
      { label: "Global Privacy Laws", href: "/global-privacy-laws", badge: "FREE" },
      { label: "US State Privacy Authorities", href: "/us-state-privacy-authorities", badge: "FREE" },
      { label: "Global Privacy Authorities", href: "/global-privacy-authorities", badge: "FREE" },
    ],
  },
  {
    section: "Footer — Product",
    items: [
      { label: "Subscribe", href: "/subscribe", badge: "CTA" },
      { label: "Sample Brief", href: "/sample-brief", badge: "FREE" },
      { label: "Tools", href: "/tools", badge: "MIXED" },
      { label: "FAQ", href: "/faq", badge: "FREE" },
    ],
  },
  {
    section: "Footer — Company",
    items: [
      { label: "About", href: "/about", badge: "FREE" },
      { label: "Contact", href: "/contact", badge: "FREE" },
      { label: "Terms", href: "/terms", badge: "FREE" },
      { label: "Privacy Policy", href: "/privacy-policy", badge: "FREE" },
    ],
  },
];

const ACCESS_TIERS: Array<[string, string, string, string]> = [
  ["Latest news articles", "Up to 15 articles (hard cap)", "21-day rolling window", "Unlimited + breaking-news banner"],
  ['"Why This Matters" AI analysis', "Hidden", "Hidden", "Full inline analysis"],
  ["Weekly Intelligence Brief", "Sample brief only", "Sample brief only", "Full 8-section brief, custom synthesis"],
  ["Enforcement archive", "Recent fines", "Recent fines", "Full archive + pattern intelligence"],
  ["Horizon (forecast feed)", "Visible (leak — see §3)", "Visible (leak — see §3)", "Visible + watchlist filter"],
  ["Registration Manager", "Free assessment + pricing", "Free assessment + pricing", "20% off DIY · -$75 Counsel-Ready"],
  ["Per-use assessment tools", "Pay full standalone price", "Pay full standalone price", "Subscriber rates · IR + Biometric included"],
  ["Privacy laws map / jurisdictions", "Full access", "Full access", "Full access"],
  ["Glossary, calendar, timelines", "Full access", "Full access", "Full access"],
  ["Watchlist (jurisdictions/sectors)", "—", "—", "Save + filter Horizon by watchlist"],
  ["Contextual ads", "Shown", "Shown", "Suppressed"],
];

// ---------- Helpers ----------
function p(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun(text)],
  });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function makeCell(text: string, width: number, opts: { bold?: boolean; fill?: string } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function makeTable(rows: string[][], colWidths: number[], hasHeader = true) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(
      (row, i) =>
        new TableRow({
          children: row.map((text, j) =>
            makeCell(text, colWidths[j], {
              bold: hasHeader && i === 0,
              fill: hasHeader && i === 0 ? "1E2761" : undefined,
            })
          ),
          tableHeader: hasHeader && i === 0,
        })
    ),
  });
}

// White text for header rows
function makeTableWithHeader(rows: string[][], colWidths: number[]) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(
      (row, i) =>
        new TableRow({
          tableHeader: i === 0,
          children: row.map((text, j) =>
            new TableCell({
              borders: cellBorders,
              width: { size: colWidths[j], type: WidthType.DXA },
              shading: i === 0 ? { fill: "1E2761", type: ShadingType.CLEAR, color: "auto" } : undefined,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text,
                      bold: i === 0,
                      color: i === 0 ? "FFFFFF" : undefined,
                    }),
                  ],
                }),
              ],
            })
          ),
        })
    ),
  });
}

// ---------- Build & save ----------
export async function generateNavReport(): Promise<{ filename: string; version: number }> {
  const version = nextVersion();
  const generatedAt = new Date().toISOString().slice(0, 10);

  const children: Array<Paragraph | Table> = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Your Privacy Hub — Nav_Report", bold: true, size: 40 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Version ${version} · ${generatedAt}`, size: 22, color: "666666" })],
    }),
    p(""),
  );

  // ----- §1 Navigation Hierarchy -----
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Navigation Hierarchy")] }),
    p("Source: src/components/Navbar.tsx and src/components/Footer.tsx.", { size: 20, color: "666666" }),
    p(""),
  );

  for (const sec of NAV_HIERARCHY) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(sec.section)] }),
      makeTableWithHeader(
        [["Label", "Route", "Badge"], ...sec.items.map((i) => [i.label, i.href, i.badge])],
        [3600, 4200, 1560]
      ),
      p(""),
    );
  }

  // ----- §2 Content Access Tiers -----
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Content Access Tiers")] }),
    p("Matrix of features vs. user tier. (a) Anonymous, (b) Free registered, (c) Professional ($29/mo or $290/yr).", {
      size: 20,
      color: "666666",
    }),
    p(""),
    makeTableWithHeader(
      [["Feature", "Anonymous", "Free Registered", "Professional"], ...ACCESS_TIERS],
      [2700, 2220, 2220, 2220]
    ),
    p(""),
  );

  // ----- §3 Gating Leaks -----
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Gating Leaks")] }),
    p(
      `Generated by scripts/scan-gating-leaks.mjs at ${gatingReport.generatedAt}. ${gatingReport.summary.high} high · ${gatingReport.summary.medium} medium · ${gatingReport.summary.info} info.`,
      { size: 20, color: "666666" }
    ),
    p(""),
  );

  const leakRows: string[][] = [["Severity", "Type", "Route / File", "Issue"]];
  for (const f of (gatingReport.findings as Array<Record<string, unknown>>)) {
    leakRows.push([
      String(f.severity ?? "").toUpperCase(),
      String(f.type ?? ""),
      `${f.route ?? "—"}\n${f.file ?? ""}`,
      String(f.message ?? ""),
    ]);
  }
  children.push(makeTableWithHeader(leakRows, [1100, 2200, 2700, 3360]), p(""));

  // ----- §4 Products & Pricing -----
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Products & Pricing")] }),
    p(
      `Reconciliation generated by scripts/scan-pricing.mjs at ${pricingReport.generatedAt}. ${pricingReport.summary.products_checked} products · ${pricingReport.summary.mismatches} mismatch(es).`,
      { size: 20, color: "666666" }
    ),
    p(""),
  );

  const priceRows: string[][] = [
    ["Product", "Server (standalone)", "Server (subscriber)", "UI seen", "Match?"],
  ];
  for (const r of (pricingReport.rows as Array<Record<string, unknown>>)) {
    const ok = r.standalone_match && r.subscriber_match;
    priceRows.push([
      String(r.product ?? ""),
      String(r.server_standalone ?? "—"),
      String(r.server_subscriber ?? "—"),
      Array.isArray(r.ui_prices_seen) ? r.ui_prices_seen.join(", ") : "—",
      ok ? "✅" : "❌",
    ]);
  }
  children.push(makeTableWithHeader(priceRows, [3000, 1700, 1700, 2160, 800]), p(""));

  if (pricingReport.findings && (pricingReport.findings as unknown[]).length > 0) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Pricing mismatches")] })
    );
    for (const f of pricingReport.findings as Array<Record<string, unknown>>) {
      children.push(bullet(`${f.product}: ${f.issue}`));
    }
  }

  // ----- Build doc -----
  const doc = new Document({
    creator: "Your Privacy Hub Admin",
    title: `Nav_Report v${version}`,
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial", color: "1E2761" },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "1E2761" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Your Privacy Hub_Site_Inventory_Audit_v${version}.docx`;
  saveAs(blob, filename);
  return { filename, version };
}
