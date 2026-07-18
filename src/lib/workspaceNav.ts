// Shared workspace navigation definitions used by both the desktop grouped
// sidebar (`WorkspaceSidebar`) and the mobile flat subnav (`DashboardSubnav`).
//
// Structure (LEFTNAV-2, CEO-approved — LIBRARY-first):
//   Top level:
//     1. Weekly Briefs  -> /dashboard (exact match)
//     2. Watchlist      -> /watchlist
//     3. Start New…     -> /start   (product catalog lives here)
//   LIBRARY (group label, not clickable):
//     - Reports         -> /dashboard/reports
//         · U.S. – CPPA         -> /dashboard/reports?family=cppa
//         · EU & UK – GDPR      -> /dashboard/reports?family=gdpr
//         · All jurisdictions   -> /dashboard/reports
//     - Notices & RoPA  -> /notices-ropa
//     - Filings         -> /registration-manager/my-filings
//     - Obligations     -> /obligations
//   Bottom (after divider):
//     - Account         -> /account
//
// Active-state rules (LEFTNAV-2 Task 2):
//   * /dashboard/reports (any ?family=)  -> Reports (parent)
//     Sub-item highlight follows ?family (cppa / gdpr / all).
//   * Every per-tool result/intake route the products previously claimed
//     -> Reports (parent only; no sub-item highlight).
//   * /notices-ropa, /us-notices/**, /eu-notices/**, /ropa/**
//     -> Notices & RoPA.
//   * /registration-manager/**            -> Filings.
//   * /obligations/**                     -> Obligations.
//   * /account, /brief-preferences        -> Account.
// computeActiveTo() stays first-match-wins with exactly one active item
// per known route (verified in src/test/workspaceNav.test.ts).

import {
  FileText,
  Bookmark,
  Settings,
  Building2,
  PlusCircle,
  CalendarClock,
  Scroll,
  Landmark,
  FileCheck,
} from "lucide-react";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** search is the raw URL search string incl. leading `?` (may be empty). */
  match: (pathname: string, hash: string, search: string) => boolean;
};

/** Strip trailing slash (except root) and lower-case for comparison. */
export function normalizePath(p: string): string {
  const lower = p.toLowerCase();
  if (lower.length > 1 && lower.endsWith("/")) return lower.slice(0, -1);
  return lower;
}

/**
 * Normalize hash: drop leading `#`, lower-case, and strip anything after `?`
 * or `&` so shared links with hash-style query params still match.
 */
export function normalizeHash(h: string): string {
  const stripped = h.replace(/^#/, "").toLowerCase();
  const cut = stripped.search(/[?&]/);
  return cut === -1 ? stripped : stripped.slice(0, cut);
}

/** Read a single URL search-param value (case-insensitive param name). */
function readParam(search: string, name: string): string | null {
  if (!search) return null;
  const s = search.startsWith("?") ? search.slice(1) : search;
  for (const part of s.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const k = decodeURIComponent(eq === -1 ? part : part.slice(0, eq));
    const v = eq === -1 ? "" : decodeURIComponent(part.slice(eq + 1));
    if (k.toLowerCase() === name.toLowerCase()) return v.toLowerCase();
  }
  return null;
}

/** Exact-or-descendant path match helper. */
const under = (base: string) => (p: string) =>
  p === base || p.startsWith(base + "/");

// -- Top items --------------------------------------------------------------

export const TOP_ITEMS: WorkspaceItem[] = [
  {
    to: "/dashboard",
    label: "Weekly Briefs",
    icon: FileText,
    // Exact match — /dashboard/reports is claimed by the Reports library item.
    match: (p) => p === "/dashboard",
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (p) => p === "/watchlist",
  },
  {
    to: "/start",
    label: "Start New\u2026",
    icon: PlusCircle,
    match: (p) => p === "/start",
  },
];

// -- Library items ----------------------------------------------------------

/**
 * The set of paths that count as "a Reports view":
 *   * /dashboard/reports (any ?family=)
 *   * every per-tool result/intake route the sidebar previously listed as its
 *     own product entry.
 * These all highlight the Reports library item.
 */
function matchesReports(p: string): boolean {
  if (p === "/dashboard/reports" || p.startsWith("/dashboard/reports/"))
    return true;
  const REPORT_PATHS = [
    "/li-assessment",
    "/dpia-framework",
    "/governance-assessment",
    "/dpa-generator",
    "/ir-playbook",
    "/biometric-checker",
    "/cppa-risk-assessment",
    "/cppa-cybersecurity",
    "/cppa-admt-checker",
    "/cppa-admt",
    "/cppa-scope-checker",
  ];
  for (const base of REPORT_PATHS) {
    // Result / detail routes (e.g. /li-assessment/result/abc) highlight
    // Reports; the bare intake route (e.g. /li-assessment) does NOT — the
    // creation UI belongs to /start.
    if (p === base) {
      // Only /cppa-scope-checker has its "result" on the base path itself.
      if (base === "/cppa-scope-checker") return true;
      return false;
    }
    if (p.startsWith(base + "/")) return true;
  }
  return false;
}

export const REPORTS_ITEM: WorkspaceItem = {
  to: "/dashboard/reports",
  label: "Reports",
  icon: FileText,
  match: (p) => matchesReports(p),
};

export const NOTICES_ROPA_ITEM: WorkspaceItem = {
  to: "/notices-ropa",
  label: "Notices & RoPA",
  icon: Scroll,
  match: (p) =>
    p === "/notices-ropa" ||
    p.startsWith("/notices-ropa/") ||
    under("/us-notices")(p) ||
    under("/eu-notices")(p) ||
    under("/ropa")(p),
};

export const FILINGS_ITEM: WorkspaceItem = {
  to: "/registration-manager/my-filings",
  label: "Filings",
  icon: Landmark,
  match: (p) => under("/registration-manager")(p),
};

export const OBLIGATIONS_ITEM: WorkspaceItem = {
  to: "/obligations",
  label: "Obligations",
  icon: CalendarClock,
  match: (p) => p === "/obligations" || p.startsWith("/obligations/"),
};

export const LIBRARY_ITEMS: WorkspaceItem[] = [
  REPORTS_ITEM,
  NOTICES_ROPA_ITEM,
  FILINGS_ITEM,
  OBLIGATIONS_ITEM,
];

// -- Reports sub-items (filtered views of /dashboard/reports) ---------------

export type ReportsFamily = "cppa" | "gdpr" | "all";

export const REPORTS_SUBITEMS: Array<{
  id: ReportsFamily;
  label: string;
  to: string;
}> = [
  { id: "cppa", label: "U.S. \u2013 CPPA", to: "/dashboard/reports?family=cppa" },
  { id: "gdpr", label: "EU & UK \u2013 GDPR", to: "/dashboard/reports?family=gdpr" },
  { id: "all", label: "All jurisdictions", to: "/dashboard/reports" },
];

export function computeActiveReportsSub(
  pathname: string,
  search: string = "",
): ReportsFamily | null {
  const p = normalizePath(pathname);
  if (p !== "/dashboard/reports") return null;
  const fam = readParam(search, "family");
  if (fam === "cppa") return "cppa";
  if (fam === "gdpr") return "gdpr";
  return "all";
}

// -- Bottom items -----------------------------------------------------------

export const BOTTOM_ITEMS: WorkspaceItem[] = [
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

// -- Aggregate list used by computeActiveTo (first-match-wins) --------------

export const ALL_WORKSPACE_ITEMS: WorkspaceItem[] = [
  ...TOP_ITEMS,
  ...LIBRARY_ITEMS,
  ...BOTTOM_ITEMS,
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

/**
 * Compute the `to` of the active workspace item for a given URL.
 * Returns `null` when no item claims the route.
 */
export function computeActiveTo(
  pathname: string,
  hash: string = "",
  search: string = "",
): string | null {
  const p = normalizePath(pathname);
  const h = normalizeHash(hash);
  for (const item of ALL_WORKSPACE_ITEMS) {
    if (item.match(p, h, search)) return item.to;
  }
  return null;
}

// -- Back-compat re-exports (unused by current sidebars but referenced by
//    older callsites). ------------------------------------------------------

export const INTELLIGENCE_ITEMS = TOP_ITEMS;
export const OPERATIONS_ITEMS: WorkspaceItem[] = LIBRARY_ITEMS;
export const ACCOUNT_ITEMS: WorkspaceItem[] = BOTTOM_ITEMS;

/** Bare icon type kept for legacy typing. */
export type WorkspaceCategory = {
  id: string;
  label: string;
  items: WorkspaceItem[];
};
