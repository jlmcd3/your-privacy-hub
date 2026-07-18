// Shared workspace navigation definitions used by both the desktop grouped
// sidebar (`WorkspaceSidebar`) and the mobile flat subnav (`DashboardSubnav`).
//
// Structure (LEFTNAV-1, CEO-approved):
//   Top level:
//     1. Weekly Briefs  -> /dashboard
//     2. Watchlist      -> /watchlist
//     3. Start New…     -> /start
//   Three product-category groups (each with every product as a submenu item):
//     - "U.S. – CPPA"
//     - "EU & UK – GDPR"
//     - "All Jurisdictions"
//   Bottom (after divider):
//     - Obligations -> /obligations
//     - Account     -> /account
//
// computeActiveTo() remains first-match-wins and must yield exactly one
// active item per known route (see coverage test in src/test/workspaceNav.test.ts).

import {
  FileText,
  Bookmark,
  Settings,
  Building2,
  PlusCircle,
  CalendarClock,
  ShieldCheck,
  Scale,
  ShieldAlert,
  Cpu,
  FileSignature,
  Scroll,
  Landmark,
  BookOpen,
  ClipboardList,
  Globe,
  FileCheck,
  AlertTriangle,
  Fingerprint,
  Building,
} from "lucide-react";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, hash: string) => boolean;
};

export type WorkspaceCategory = {
  id: string;
  label: string;
  items: WorkspaceItem[];
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

/** Exact-or-descendant path match helper. */
const under = (base: string) => (p: string) =>
  p === base || p.startsWith(base + "/");

/**
 * Top-level items rendered above the category groups. Order per spec.
 */
export const TOP_ITEMS: WorkspaceItem[] = [
  {
    to: "/dashboard",
    label: "Weekly Briefs",
    icon: FileText,
    // Exact match only — /dashboard/reports intentionally does NOT highlight
    // any nav item (legacy list page; see LEFTNAV-1 Task 4).
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

// -- Product items ----------------------------------------------------------
// Each product's match() claims BOTH its primary route AND its result/detail
// routes so those pages highlight the correct submenu entry (splitting the
// legacy aggregate REPORT_TOOL_PATH regex per LEFTNAV-1 Task 1).

const CPPA_SCOPE: WorkspaceItem = {
  to: "/cppa-scope-checker",
  label: "CPPA Scope Checker",
  icon: ShieldCheck,
  match: (p) => under("/cppa-scope-checker")(p),
};

const CPPA_RISK: WorkspaceItem = {
  to: "/cppa-risk-assessment",
  label: "CPPA Risk Assessment",
  icon: Scale,
  match: (p) => under("/cppa-risk-assessment")(p),
};

const CPPA_CYBER: WorkspaceItem = {
  to: "/cppa-cybersecurity",
  label: "CPPA Cybersecurity Audit",
  icon: ShieldAlert,
  match: (p) => under("/cppa-cybersecurity")(p),
};

const CPPA_ADMT: WorkspaceItem = {
  to: "/cppa-admt-checker",
  label: "ADMT Compliance Assessment",
  icon: Cpu,
  // Claim both the canonical /cppa-admt-checker and the legacy /cppa-admt alias.
  match: (p) => under("/cppa-admt-checker")(p) || under("/cppa-admt")(p),
};

const US_NOTICE: WorkspaceItem = {
  to: "/us-notices",
  label: "US Privacy Notice",
  icon: FileSignature,
  match: (p) => under("/us-notices")(p),
};

const LI: WorkspaceItem = {
  to: "/li-assessment",
  label: "Legitimate Interest Assessment",
  icon: BookOpen,
  match: (p) => under("/li-assessment")(p),
};

const DPIA: WorkspaceItem = {
  to: "/dpia-framework",
  label: "Impact Assessment Builder",
  icon: ClipboardList,
  match: (p) => under("/dpia-framework")(p),
};

const GOVERNANCE: WorkspaceItem = {
  to: "/governance-assessment",
  label: "Governance Assessment",
  icon: Landmark,
  match: (p) => under("/governance-assessment")(p),
};

const ROPA: WorkspaceItem = {
  to: "/ropa",
  label: "RoPA Builder",
  icon: Scroll,
  match: (p) => under("/ropa")(p),
};

const EU_NOTICE: WorkspaceItem = {
  to: "/eu-notices",
  label: "EU Privacy Notice",
  icon: Globe,
  match: (p) => under("/eu-notices")(p),
};

const DPA: WorkspaceItem = {
  to: "/dpa-generator",
  label: "Custom DPA",
  icon: FileCheck,
  match: (p) => under("/dpa-generator")(p),
};

const IR: WorkspaceItem = {
  to: "/ir-playbook",
  label: "Incident Response Playbook",
  icon: AlertTriangle,
  match: (p) => under("/ir-playbook")(p),
};

const BIOMETRIC: WorkspaceItem = {
  to: "/biometric-checker",
  label: "Biometric Compliance Check",
  icon: Fingerprint,
  match: (p) => under("/biometric-checker")(p),
};

const REGISTRATION: WorkspaceItem = {
  to: "/registration-manager",
  label: "Registration Manager",
  icon: Building,
  match: (p) => under("/registration-manager")(p),
};

/**
 * Product category groups. Order and labels are CEO-approved.
 */
export const CATEGORY_GROUPS: WorkspaceCategory[] = [
  {
    id: "us_cppa",
    label: "U.S. – CPPA",
    items: [CPPA_SCOPE, CPPA_RISK, CPPA_CYBER, CPPA_ADMT, US_NOTICE],
  },
  {
    id: "eu_gdpr",
    label: "EU & UK – GDPR",
    items: [LI, DPIA, GOVERNANCE, ROPA, EU_NOTICE, DPA],
  },
  {
    id: "all_jurisdictions",
    label: "All Jurisdictions",
    items: [IR, BIOMETRIC, REGISTRATION],
  },
];

/**
 * Flattened product list. Handy for the mobile subnav and for
 * computeActiveTo coverage.
 */
export const PRODUCT_ITEMS: WorkspaceItem[] = CATEGORY_GROUPS.flatMap(
  (g) => g.items,
);

/**
 * Bottom items rendered after a divider under the categories.
 */
export const BOTTOM_ITEMS: WorkspaceItem[] = [
  {
    to: "/obligations",
    label: "Obligations",
    icon: CalendarClock,
    match: (p) => p === "/obligations" || p.startsWith("/obligations/"),
  },
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

// -- Legacy exports kept for back-compat ------------------------------------
// DashboardSubnav still imports INTELLIGENCE_ITEMS and OPERATIONS_ITEMS in
// some code paths; keep them defined but redirect to the new structure.

export const INTELLIGENCE_ITEMS = TOP_ITEMS;

export const OPERATIONS_ITEMS: WorkspaceItem[] = [
  ...PRODUCT_ITEMS,
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
 * `computeActiveTo` (first-match-wins).
 */
export const ALL_WORKSPACE_ITEMS: WorkspaceItem[] = [
  ...TOP_ITEMS,
  ...PRODUCT_ITEMS,
  ...BOTTOM_ITEMS,
  // "Clients" is only reachable via the sidebar's own Clients management link,
  // but include it here so /clients highlights nothing surprising elsewhere.
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
): string | null {
  const p = normalizePath(pathname);
  const h = normalizeHash(hash);
  for (const item of ALL_WORKSPACE_ITEMS) {
    if (item.match(p, h)) return item.to;
  }
  return null;
}
