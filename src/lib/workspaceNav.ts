// Shared workspace navigation definitions used by both the desktop grouped
// sidebar (`WorkspaceSidebar`) and the mobile flat subnav (`DashboardSubnav`).
//
// Structure (LEFTNAV-2, CEO-approved) — LIBRARY-FIRST:
//   Top level:
//     1. Weekly Briefs  -> /dashboard  (exact)
//     2. Watchlist      -> /watchlist
//     3. Start New…     -> /start
//   Library group (uppercase, non-clickable label):
//     - Reports        -> /dashboard/reports
//         · U.S. – CPPA        -> /dashboard/reports?family=cppa
//         · EU & UK – GDPR     -> /dashboard/reports?family=gdpr
//         · All jurisdictions  -> /dashboard/reports
//     - Notices & RoPA -> /notices-ropa   (also claims /us-notices/**, /eu-notices/**, /ropa/**)
//     - Filings        -> /registration-manager/my-filings   (claims /registration-manager/**)
//     - Obligations    -> /obligations
//   Bottom (after divider):
//     - Account        -> /account   (also /brief-preferences)
//
// The product catalog is intentionally NOT in the sidebar — it lives on /start.
//
// computeActiveTo() remains first-match-wins and yields exactly one active
// item per known URL (see coverage test in src/test/workspaceNav.test.ts).

import {
  FileText,
  Bookmark,
  Settings,
  Building2,
  PlusCircle,
  CalendarClock,
  FolderOpen,
  Scroll,
  Building,
} from "lucide-react";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, hash: string, search?: string) => boolean;
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

/** Read a single search param without allocating a full URL. */
function readParam(search: string | undefined, key: string): string | null {
  if (!search) return null;
  const q = search.startsWith("?") ? search.slice(1) : search;
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const k = eq === -1 ? pair : pair.slice(0, eq);
    if (k.toLowerCase() === key.toLowerCase()) {
      const v = eq === -1 ? "" : pair.slice(eq + 1);
      return decodeURIComponent(v).toLowerCase();
    }
  }
  return null;
}

/** Exact-or-descendant path match helper. */
const under = (base: string) => (p: string) =>
  p === base || p.startsWith(base + "/");

// -- Routes claimed by "Reports" -------------------------------------------
// Every per-tool result/intake route that formerly had its own sidebar entry
// now highlights the LIBRARY → Reports item. Intake pages (creation) are
// deliberately NOT claimed here — they are launched from /start, not the
// library — but the RESULT / detail routes are, so a user coming back to a
// generated document sees "Reports" highlighted.
const REPORT_RESULT_PATHS = [
  "/dashboard/reports",
  "/cppa-scope-checker",
  "/cppa-risk-assessment/result",
  "/cppa-cybersecurity/result",
  "/cppa-admt-checker/result",
  "/cppa-admt/result",
  "/li-assessment/result",
  "/dpia-framework/result",
  "/governance-assessment/result",
  "/dpa-generator/result",
  "/ir-playbook/result",
  "/biometric-checker/result",
];

function matchesReports(p: string): boolean {
  for (const base of REPORT_RESULT_PATHS) {
    if (under(base)(p)) return true;
  }
  return false;
}

// -- Routes claimed by "Notices & RoPA" ------------------------------------
function matchesNoticesRopa(p: string): boolean {
  return (
    under("/notices-ropa")(p) ||
    under("/us-notices")(p) ||
    under("/eu-notices")(p) ||
    under("/ropa")(p)
  );
}

// -- Top-level items -------------------------------------------------------

export const TOP_ITEMS: WorkspaceItem[] = [
  {
    to: "/dashboard",
    label: "Weekly Briefs",
    icon: FileText,
    // Exact match only — /dashboard/reports is claimed by "Reports".
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

// -- Library items ---------------------------------------------------------

export const REPORTS_ITEM: WorkspaceItem = {
  to: "/dashboard/reports",
  label: "Reports",
  icon: FolderOpen,
  match: (p) => matchesReports(p),
};

export const NOTICES_ROPA_ITEM: WorkspaceItem = {
  to: "/notices-ropa",
  label: "Notices & RoPA",
  icon: Scroll,
  match: (p) => matchesNoticesRopa(p),
};

export const FILINGS_ITEM: WorkspaceItem = {
  to: "/registration-manager/my-filings",
  label: "Filings",
  icon: Building,
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

// -- Reports sub-items (filtered views of the same MyReports page) ---------

export type ReportsFamily = "cppa" | "gdpr" | "all";

export type ReportsSubItem = {
  id: ReportsFamily;
  to: string;
  label: string;
};

export const REPORTS_SUBITEMS: ReportsSubItem[] = [
  { id: "cppa", to: "/dashboard/reports?family=cppa", label: "U.S. – CPPA" },
  { id: "gdpr", to: "/dashboard/reports?family=gdpr", label: "EU & UK – GDPR" },
  { id: "all", to: "/dashboard/reports", label: "All jurisdictions" },
];

/**
 * When the URL is on /dashboard/reports, return which sub-item filter is
 * active (based on ?family=cppa|gdpr, else "all"). Returns null when not on
 * the reports page — sub-items are only decorated when Reports is the page.
 */
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

// -- Bottom items ----------------------------------------------------------

export const BOTTOM_ITEMS: WorkspaceItem[] = [
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

// -- Legacy exports kept for back-compat ------------------------------------

export const INTELLIGENCE_ITEMS = TOP_ITEMS;

export const OPERATIONS_ITEMS: WorkspaceItem[] = [
  ...LIBRARY_ITEMS,
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

export const ACCOUNT_ITEMS: WorkspaceItem[] = BOTTOM_ITEMS;

/**
 * Every workspace item across all groups, in the order used by
 * `computeActiveTo` (first-match-wins). Reports comes before the more
 * specific tool routes it claims so a single match wins deterministically.
 */
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
