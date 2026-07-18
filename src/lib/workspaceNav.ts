// Shared workspace navigation definitions (LEFTNAV-3).
//
// Structure (CEO-approved):
//   Top:
//     - Weekly Briefs   -> /dashboard (exact)
//     - Watchlist       -> /watchlist
//   (divider)
//     - Start New…      -> /start
//     - Assessments (group header, NOT clickable)
//         · GDPR        -> /dashboard/reports?group=assessments&family=gdpr
//         · CPPA        -> /dashboard/reports?group=assessments&family=cppa
//         · Biometric   -> /dashboard/reports?group=assessments&family=biometric
//     - Notices & policies (group header, NOT clickable)
//         · US notices  -> /notices-ropa?kind=us
//         · EU notices  -> /notices-ropa?kind=eu
//         · Playbooks   -> /dashboard/reports?group=playbooks
//     - Contracts & records (group header, NOT clickable)
//         · DPAs        -> /dashboard/reports?group=dpas
//         · RoPA        -> /notices-ropa?kind=ropa
//     - Registrations   -> /registration-manager/my-filings
//     - Deadlines & Reminders -> /obligations
//   (divider)
//     - Account         -> /account
//
// Active state: first-match-wins over ALL_LEAF_ITEMS. Exactly one active leaf
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
  ShieldCheck,
  BookOpen,
  Fingerprint,
  Globe,
  MapPin,
  FileSignature,
  ClipboardList,
  BookMarked,
} from "lucide-react";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** search is the raw URL search string incl. leading `?` (may be empty). */
  match: (pathname: string, hash: string, search: string) => boolean;
};

export type WorkspaceGroup = {
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

/** Normalize hash for matching. */
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

const under = (base: string) => (p: string) =>
  p === base || p.startsWith(base + "/");

// -- Top items --------------------------------------------------------------

export const TOP_ITEMS: WorkspaceItem[] = [
  {
    to: "/dashboard",
    label: "Weekly Briefs",
    icon: FileText,
    match: (p) => p === "/dashboard",
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (p) => p === "/watchlist",
  },
];

// Start New sits above the group section but below the top divider.
export const START_NEW_ITEM: WorkspaceItem = {
  to: "/start",
  label: "Start New\u2026",
  icon: PlusCircle,
  match: (p) => p === "/start",
};

// -- Assessments group ------------------------------------------------------

/**
 * Which per-tool result path family a route belongs to.
 * Used both by workspace nav highlighting and by MyReports filtering.
 */
export type AssessmentFamily = "gdpr" | "cppa" | "biometric";

function reportsGroup(search: string): string | null {
  return readParam(search, "group");
}
function reportsFamily(search: string): string | null {
  return readParam(search, "family");
}

/** Assessment-family highlighter for /dashboard/reports?family=X. */
function reportsFamilyMatches(fam: AssessmentFamily) {
  return (p: string, _h: string, s: string) => {
    if (p !== "/dashboard/reports") return false;
    const g = reportsGroup(s);
    if (g && g !== "assessments") return false;
    return reportsFamily(s) === fam;
  };
}

// Per-tool result routes always highlight one specific sub-item.
const GDPR_RESULT_BASES = ["/li-assessment", "/dpia-framework", "/governance-assessment"];
const CPPA_RESULT_BASES = [
  "/cppa-risk-assessment",
  "/cppa-cybersecurity",
  "/cppa-admt-checker",
  "/cppa-admt",
  "/cppa-scope-checker",
];
const BIOMETRIC_RESULT_BASES = ["/biometric-checker"];
const PLAYBOOK_RESULT_BASES = ["/ir-playbook"];
const DPA_RESULT_BASES = ["/dpa-generator"];

function anyResultUnder(bases: string[], p: string): boolean {
  for (const base of bases) {
    if (base === "/cppa-scope-checker" && p === base) return true;
    if (p.startsWith(base + "/")) return true;
  }
  return false;
}

export const ASSESSMENTS_SUB_GDPR: WorkspaceItem = {
  to: "/dashboard/reports?group=assessments&family=gdpr",
  label: "GDPR",
  icon: Globe,
  match: (p, h, s) => {
    if (reportsFamilyMatches("gdpr")(p, h, s)) return true;
    if (anyResultUnder(GDPR_RESULT_BASES, p)) return true;
    // Parent-group fallback: plain /dashboard/reports lands here.
    if (p === "/dashboard/reports" && !reportsGroup(s) && !reportsFamily(s)) return true;
    return false;
  },
};

export const ASSESSMENTS_SUB_CPPA: WorkspaceItem = {
  to: "/dashboard/reports?group=assessments&family=cppa",
  label: "CPPA",
  icon: MapPin,
  match: (p, h, s) => {
    if (reportsFamilyMatches("cppa")(p, h, s)) return true;
    return anyResultUnder(CPPA_RESULT_BASES, p);
  },
};

export const ASSESSMENTS_SUB_BIOMETRIC: WorkspaceItem = {
  to: "/dashboard/reports?group=assessments&family=biometric",
  label: "Biometric",
  icon: Fingerprint,
  match: (p, h, s) => {
    if (reportsFamilyMatches("biometric")(p, h, s)) return true;
    return anyResultUnder(BIOMETRIC_RESULT_BASES, p);
  },
};

export const ASSESSMENTS_GROUP: WorkspaceGroup = {
  id: "assessments",
  label: "Assessments",
  items: [ASSESSMENTS_SUB_GDPR, ASSESSMENTS_SUB_CPPA, ASSESSMENTS_SUB_BIOMETRIC],
};

// -- Notices & policies group ----------------------------------------------

export const NOTICES_SUB_US: WorkspaceItem = {
  to: "/notices-ropa?kind=us",
  label: "US notices",
  icon: BookOpen,
  match: (p, _h, s) => {
    if (p === "/notices-ropa") {
      const k = readParam(s, "kind");
      // Plain /notices-ropa (no kind) falls back to US notices.
      if (k === "us" || k === null) return true;
      return false;
    }
    return under("/us-notices")(p);
  },
};

export const NOTICES_SUB_EU: WorkspaceItem = {
  to: "/notices-ropa?kind=eu",
  label: "EU notices",
  icon: Globe,
  match: (p, _h, s) => {
    if (p === "/notices-ropa") return readParam(s, "kind") === "eu";
    return under("/eu-notices")(p);
  },
};

export const NOTICES_SUB_PLAYBOOKS: WorkspaceItem = {
  to: "/dashboard/reports?group=playbooks",
  label: "Playbooks",
  icon: ClipboardList,
  match: (p, _h, s) => {
    if (p === "/dashboard/reports" && reportsGroup(s) === "playbooks") return true;
    return anyResultUnder(PLAYBOOK_RESULT_BASES, p);
  },
};

export const NOTICES_GROUP: WorkspaceGroup = {
  id: "notices_policies",
  label: "Notices & policies",
  items: [NOTICES_SUB_US, NOTICES_SUB_EU, NOTICES_SUB_PLAYBOOKS],
};

// -- Contracts & records group ---------------------------------------------

export const CONTRACTS_SUB_DPAS: WorkspaceItem = {
  to: "/dashboard/reports?group=dpas",
  label: "DPAs",
  icon: FileSignature,
  match: (p, _h, s) => {
    if (p === "/dashboard/reports" && reportsGroup(s) === "dpas") return true;
    return anyResultUnder(DPA_RESULT_BASES, p);
  },
};

export const CONTRACTS_SUB_ROPA: WorkspaceItem = {
  to: "/notices-ropa?kind=ropa",
  label: "RoPA",
  icon: BookMarked,
  match: (p, _h, s) => {
    if (p === "/notices-ropa") return readParam(s, "kind") === "ropa";
    return under("/ropa")(p);
  },
};

export const CONTRACTS_GROUP: WorkspaceGroup = {
  id: "contracts_records",
  label: "Contracts & records",
  items: [CONTRACTS_SUB_DPAS, CONTRACTS_SUB_ROPA],
};

// -- Standalone library items ----------------------------------------------

export const REGISTRATIONS_ITEM: WorkspaceItem = {
  to: "/registration-manager/my-filings",
  label: "Registrations",
  icon: Landmark,
  match: (p) => under("/registration-manager")(p),
};

export const DEADLINES_ITEM: WorkspaceItem = {
  to: "/obligations",
  label: "Deadlines & Reminders",
  icon: CalendarClock,
  match: (p) => p === "/obligations" || p.startsWith("/obligations/"),
};

// -- Bottom items -----------------------------------------------------------

export const BOTTOM_ITEMS: WorkspaceItem[] = [
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

// -- Grouped structure used by both sidebars -------------------------------

/** Ordered groups rendered inside each workspace section. */
export const WORKSPACE_GROUPS: WorkspaceGroup[] = [
  ASSESSMENTS_GROUP,
  NOTICES_GROUP,
  CONTRACTS_GROUP,
];

/** Standalone (non-grouped) items rendered after the groups. */
export const STANDALONE_ITEMS: WorkspaceItem[] = [
  REGISTRATIONS_ITEM,
  DEADLINES_ITEM,
];

// -- computeActiveTo (first-match-wins) ------------------------------------

// Priority order for active matching.
export const ALL_LEAF_ITEMS: WorkspaceItem[] = [
  ...TOP_ITEMS,
  START_NEW_ITEM,
  // Standalones first so /registration-manager and /obligations win over any
  // generic sub-item matcher.
  REGISTRATIONS_ITEM,
  DEADLINES_ITEM,
  // Group sub-items.
  ...WORKSPACE_GROUPS.flatMap((g) => g.items),
  ...BOTTOM_ITEMS,
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

/** Compute the `to` of the active leaf item for a URL. */
export function computeActiveTo(
  pathname: string,
  hash: string = "",
  search: string = "",
): string | null {
  const p = normalizePath(pathname);
  const h = normalizeHash(hash);
  for (const item of ALL_LEAF_ITEMS) {
    if (item.match(p, h, search)) return item.to;
  }
  return null;
}

/** Which group (if any) owns the currently-active leaf. */
export function computeActiveGroupId(
  pathname: string,
  hash: string = "",
  search: string = "",
): string | null {
  const activeTo = computeActiveTo(pathname, hash, search);
  if (!activeTo) return null;
  for (const g of WORKSPACE_GROUPS) {
    if (g.items.some((i) => i.to === activeTo)) return g.id;
  }
  return null;
}

// -- Back-compat aliases (legacy import surface) ---------------------------

export const LIBRARY_ITEMS: WorkspaceItem[] = [
  ...WORKSPACE_GROUPS.flatMap((g) => g.items),
  ...STANDALONE_ITEMS,
];
export const INTELLIGENCE_ITEMS = TOP_ITEMS;
export const OPERATIONS_ITEMS: WorkspaceItem[] = LIBRARY_ITEMS;
export const ACCOUNT_ITEMS: WorkspaceItem[] = BOTTOM_ITEMS;

// LEFTNAV-2 -> LEFTNAV-3 back-compat shims used by MyReports empty-state and
// tests that survive intact.
export const REPORTS_ITEM: WorkspaceItem = ASSESSMENTS_SUB_GDPR;
export type ReportsFamily = AssessmentFamily | "all";
export const REPORTS_SUBITEMS = ASSESSMENTS_GROUP.items;
export function computeActiveReportsSub(
  pathname: string,
  search: string = "",
): ReportsFamily | null {
  if (normalizePath(pathname) !== "/dashboard/reports") return null;
  const fam = readParam(search, "family");
  if (fam === "cppa") return "cppa";
  if (fam === "gdpr") return "gdpr";
  if (fam === "biometric") return "biometric";
  return "all";
}
