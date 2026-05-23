// Shared workspace navigation definitions used by both the desktop grouped
// sidebar (`WorkspaceSidebar`) and the mobile horizontal subnav
// (`DashboardSubnav`). Keeping items, route matchers, and active-route
// computation in one place guarantees both surfaces always highlight the
// same workspace item for any given URL.

import {
  FileText,
  FolderOpen,
  FileCheck,
  Bookmark,
  Settings,
  Building2,
  PlusCircle,
  ScrollText,
} from "lucide-react";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, hash: string) => boolean;
};

// Tool result routes that conceptually belong under "My Reports".
export const REPORT_TOOL_PATH =
  /^\/(li-assessment|dpia-framework|governance-assessment|dpa-generator|ir-playbook|biometric-checker)\/result(\/|$)/;

// Filing / registration paths that belong under "Filings".
export const FILING_PATH =
  /^\/registration-manager\/(my-filings|order|documents)(\/|$)/;

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

export const INTELLIGENCE_ITEMS: WorkspaceItem[] = [
  {
    to: "/dashboard",
    label: "Intelligence Report",
    icon: FileText,
    // Exact /dashboard only — sub-routes like /dashboard/reports belong elsewhere.
    match: (p) => p === "/dashboard",
  },
  {
    to: "/dashboard/reports",
    label: "My Reports",
    icon: FolderOpen,
    match: (p) =>
      p === "/dashboard/reports" ||
      p.startsWith("/dashboard/reports/") ||
      REPORT_TOOL_PATH.test(p),
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (p) => p === "/watchlist",
  },
];

export const OPERATIONS_ITEMS: WorkspaceItem[] = [
  {
    to: "/registration-manager/my-filings",
    label: "Filings",
    icon: FileCheck,
    match: (p) => FILING_PATH.test(p),
  },
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

export const ACCOUNT_ITEMS: WorkspaceItem[] = [
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

/**
 * Ordered list of every workspace item across all sidebar groups. Order
 * matters because `computeActiveTo` is first-match-wins, ensuring exactly
 * one item highlights per route.
 */
export const ALL_WORKSPACE_ITEMS: WorkspaceItem[] = [
  ...INTELLIGENCE_ITEMS,
  ...OPERATIONS_ITEMS,
  ...ACCOUNT_ITEMS,
];

/**
 * Compute the `to` of the active workspace item for a given URL.
 * Returns `null` when no item claims the route.
 *
 * Both the desktop sidebar and the mobile subnav use this so a single
 * route can never be active in two places (or none).
 */
export function computeActiveTo(
  pathname: string,
  hash: string = "",
): string | null {
  const p = normalizePath(pathname);
  const h = normalizeHash(hash);
  for (const item of ALL_WORKSPACE_ITEMS) {
    if (item.match(p, h)) return item.to;
  }
  return null;
}
