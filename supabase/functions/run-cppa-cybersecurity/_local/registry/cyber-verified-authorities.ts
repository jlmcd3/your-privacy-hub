// ITEM 371 (2026-08-03) — CPPA-CYBER VERIFIED-AUTHORITY RESOLVER.
//
// RETIREMENT OF THE HAND-TRANSCRIBED REGISTRY: this module used to carry
// hand-transcribed § 7120–7124 text dated 2026-07-24. The authoritative text
// now lives in `provision_texts` (keys cppa-7120 … cppa-7124, status
// 'approved'). This file is a THIN RESOLVER: at generation time it fetches the
// approved rows, cuts each proposition's quote out of the corpus text with a
// stable locator (subsection path + first/last phrase), derives
// COMPONENT_CITATIONS and the eighteen-component § 7123(c) model from the
// corpus enumeration, and — if any row is unapproved or a locator no longer
// matches — degrades honestly to citation-only with a pending notice.
//
// THERE IS NO STALE FALLBACK COPY. A row that cannot be re-sourced from the
// corpus is omitted from the registry; nothing is served from memory.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../../../_shared/verified-authority-resolver.ts";
import {
  resolveProvisionForRender,
  PROVISION_PENDING_NOTICE,
} from "../../../_shared/provision-store.ts";

export const CYBER_VERIFIED_AUTHORITY_VERSION = "cyber-va-w2-corpus-2026-08-03";

const CCR_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";
const ART9 = "11 CCR Art. 9 (Cybersecurity Audits)";

export const CYBER_PROVISION_KEYS = [
  "cppa-7120",
  "cppa-7121",
  "cppa-7122",
  "cppa-7123",
  "cppa-7124",
] as const;

export interface CyberAuthorityLocator {
  proposition_key: string;
  citation: string;
  subsection: string;
  provision_key: string;
  /** Subsection path within the provision, e.g. "a" or "c(17)". */
  path: string;
  /** First 28 normalized characters of the quote inside that subsection. */
  starts_with: string;
  /** Last 28 normalized characters of the quote inside that subsection. */
  ends_with: string;
}

/**
 * Locators only — no statutory text. Each row's `verbatim_quote` is cut from
 * the corpus at runtime between `starts_with` and `ends_with`.
 */
export const CYBER_AUTHORITY_LOCATORS: readonly CyberAuthorityLocator[] = [
  { proposition_key: "cyber_audit_required", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(a)", provision_key: "cppa-7120", path: "a", starts_with: "Every business whose process", ends_with: "plete a cybersecurity audit." },
  { proposition_key: "cyber_threshold_significant_risk", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)", provision_key: "cppa-7120", path: "b", starts_with: "A business's processing of c", ends_with: "ny of the following is true:" },
  { proposition_key: "cyber_threshold_gross_rev", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)(1)", provision_key: "cppa-7120", path: "b(1)", starts_with: "The business meets the thres", ends_with: " preceding calendar year; or" },
  { proposition_key: "cyber_threshold_250k_or_50k_spi", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)(2)", provision_key: "cppa-7120", path: "b(2)", starts_with: "The business meets the thres", ends_with: ", subdivision (d)(1)(A); and" },
  { proposition_key: "cyber_first_audit_deadline", citation: "11 CCR § 7121", subsection: "11 CCR § 7121(a)", provision_key: "cppa-7121", path: "a", starts_with: "A business must complete its", ends_with: " audit report no later than:" },
  { proposition_key: "cyber_recurring_cadence", citation: "11 CCR § 7121", subsection: "11 CCR § 7121(b)", provision_key: "cppa-7121", path: "b", starts_with: "After April 1, 2030, if on J", ends_with: "ril 1 of the following year." },
  { proposition_key: "cyber_auditor_qualified_independent", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)", provision_key: "cppa-7122", path: "a", starts_with: "Every business required to c", ends_with: " the profession of auditing," },
  { proposition_key: "cyber_auditor_knowledge", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(1)", provision_key: "cppa-7122", path: "a(1)", starts_with: "To be qualified, an auditor ", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_auditor_impartial", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(2)", provision_key: "cppa-7122", path: "a(2)", starts_with: "The auditor may be internal ", ends_with: " of the cybersecurity audit," },
  { proposition_key: "cyber_internal_reporting_line", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(3)", provision_key: "cppa-7122", path: "a(3)", starts_with: "If a business uses an intern", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_business_disclose", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(c)", provision_key: "cppa-7122", path: "c", starts_with: "The business must make good-", ends_with: " to the cybersecurity audit." },
  { proposition_key: "cyber_evidence_over_attestation", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(d)", provision_key: "cppa-7122", path: "d", starts_with: "No finding of any cybersecur", ends_with: "y the business's management." },
  { proposition_key: "cyber_report_to_exec", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(f)", provision_key: "cppa-7122", path: "f", starts_with: "The cybersecurity audit repo", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_retention_5yr", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(g)", provision_key: "cppa-7122", path: "g", starts_with: "The business and the auditor", ends_with: " of the cybersecurity audit." },
  { proposition_key: "cyber_scope_protects_pi", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(a)", provision_key: "cppa-7123", path: "a", starts_with: "The cybersecurity audit must", ends_with: "ity of personal information." },
  { proposition_key: "cyber_scope_assess_program", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(b)", provision_key: "cppa-7123", path: "b", starts_with: "The cybersecurity audit must", ends_with: "rsecurity audit must assess:" },
  { proposition_key: "cyber_components_chapeau", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)", provision_key: "cppa-7123", path: "c", starts_with: "The cybersecurity audit must", ends_with: "g components, if applicable:" },
  { proposition_key: "cyber_c1_authentication", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(1)", provision_key: "cppa-7123", path: "c(1)", starts_with: "Authentication, including:", ends_with: "Authentication, including:" },
  { proposition_key: "cyber_c2_encryption", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(2)", provision_key: "cppa-7123", path: "c(2)", starts_with: "Encryption of personal infor", ends_with: "ion, at rest and in transit." },
  { proposition_key: "cyber_c3_access_controls", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(3)", provision_key: "cppa-7123", path: "c(3)", starts_with: "Account management and acces", ends_with: " access controls, including:" },
  { proposition_key: "cyber_c4_inventory", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(4)", provision_key: "cppa-7123", path: "c(4)", starts_with: "Inventory and management of ", ends_with: "formation system, including:" },
  { proposition_key: "cyber_c5_secure_config", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(5)", provision_key: "cppa-7123", path: "c(5)", starts_with: "Secure configuration of hard", ends_with: "are and software, including:" },
  { proposition_key: "cyber_c6_vuln_pentest", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(6)", provision_key: "cppa-7123", path: "c(6)", starts_with: "Internal and external vulner", ends_with: "ity disclosure and reporting" },
  { proposition_key: "cyber_c7_audit_logs", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(7)", provision_key: "cppa-7123", path: "c(7)", starts_with: "Audit-log management, includ", ends_with: "ion, and monitoring of logs." },
  { proposition_key: "cyber_c8_network_monitoring", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(8)", provision_key: "cppa-7123", path: "c(8)", starts_with: "Network monitoring and defen", ends_with: "including the deployment of:" },
  { proposition_key: "cyber_c9_antivirus", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(9)", provision_key: "cppa-7123", path: "c(9)", starts_with: "Antivirus and antimalware pr", ends_with: "and antimalware protections." },
  { proposition_key: "cyber_c10_segmentation", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(10)", provision_key: "cppa-7123", path: "c(10)", starts_with: "Segmentation of an informati", ends_with: "ion of an information system" },
  { proposition_key: "cyber_c11_ports", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(11)", provision_key: "cppa-7123", path: "c(11)", starts_with: "Limitation and control of po", ends_with: "ts, services, and protocols." },
  { proposition_key: "cyber_c12_awareness", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(12)", provision_key: "cppa-7123", path: "c(12)", starts_with: "Cybersecurity awareness, inc", ends_with: "threats and countermeasures." },
  { proposition_key: "cyber_c13_training", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(13)", provision_key: "cppa-7123", path: "c(13)", starts_with: "Cybersecurity education and ", ends_with: "ss to its information system" },
  { proposition_key: "cyber_c14_secure_dev", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(14)", provision_key: "cppa-7123", path: "c(14)", starts_with: "Secure development and codin", ends_with: "ng code-reviews and testing." },
  { proposition_key: "cyber_c15_third_party_oversight", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(15)", provision_key: "cppa-7123", path: "c(15)", starts_with: "Oversight of service provide", ends_with: "with sections 7051 and 7053." },
  { proposition_key: "cyber_c16_retention_disposal", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(16)", provision_key: "cppa-7123", path: "c(16)", starts_with: "Retention schedules and prop", ends_with: "ger required to be retained," },
  { proposition_key: "cyber_c17_incident_response", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(17)", provision_key: "cppa-7123", path: "c(17)", starts_with: "How the business manages its", ends_with: "cident response management)." },
  { proposition_key: "cyber_c18_bcdr", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(18)", provision_key: "cppa-7123", path: "c(18)", starts_with: "Business-continuity and disa", ends_with: "ry capabilities and backups." },
  { proposition_key: "cyber_scope_additional_components", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(d)", provision_key: "cppa-7123", path: "d", starts_with: "Nothing in this section proh", ends_with: "h in subsections (b) or (c)." },
  { proposition_key: "cyber_report_contents_chapeau", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)", provision_key: "cppa-7123", path: "e", starts_with: "The cybersecurity audit repo", ends_with: "rsecurity audit report must:" },
  { proposition_key: "cyber_report_gaps", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)(3)", provision_key: "cppa-7123", path: "e(3)", starts_with: "Identify and describe in det", ends_with: "ordance with subsection (d)," },
  { proposition_key: "cyber_report_signed_attestation", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)(8)", provision_key: "cppa-7123", path: "e(8)", starts_with: "Include a statement that is ", ends_with: "gram and information system," },
  { proposition_key: "cyber_cert_required", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(a)", provision_key: "cppa-7124", path: "a", starts_with: "Each calendar year that a bu", ends_with: "as required by this Article." },
  { proposition_key: "cyber_cert_by_april1", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(b)", provision_key: "cppa-7124", path: "b", starts_with: "The business must submit the", ends_with: "plete a cybersecurity audit." },
  { proposition_key: "cyber_cert_by_exec", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(c)", provision_key: "cppa-7124", path: "c", starts_with: "The written certification mu", ends_with: "ecutive management team who:" },
  { proposition_key: "cyber_cert_portal_and_attest", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(d)", provision_key: "cppa-7124", path: "d", starts_with: "The written certification mu", ends_with: "ite at https://cppa.ca.gov/." },
  { proposition_key: "cyber_cert_attestation_text", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(d)(4)", provision_key: "cppa-7124", path: "d(4)", starts_with: "I attest that I meet the req", ends_with: "o submit this certification." },
];

// ── corpus text handling ─────────────────────────────────────────────────
/** Normalization used for every corpus cut: quotes folded, whitespace collapsed. */
export function normalizeCorpusText(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[\s\f]+/g, " ")
    .trim();
}

/** Top-level "(a)"-style subsections of a provision's verbatim excerpt. */
export function topSubsections(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let label: string | null = null;
  let buf: string[] = [];
  for (const raw of String(text ?? "").replace(/\f/g, "").split("\n")) {
    const m = /^\(([a-z])\)[ \t]*(.*)$/.exec(raw);
    if (m) {
      if (label) out.set(label, buf.join("\n"));
      label = m[1];
      buf = [m[2]];
    } else if (label) {
      buf.push(raw);
    }
  }
  if (label) out.set(label, buf.join("\n"));
  return out;
}

/** The n-th numbered child "(n)" of a subsection block. */
export function numberedChild(block: string, n: number): string | null {
  const start = new RegExp(`(?:^|\\n)[ \\t\\f]*\\(${n}\\)[ \\t]+`, "g").exec(block);
  if (!start) return null;
  const from = start.index + start[0].length;
  const nextRe = new RegExp(`(?:^|\\n)[ \\t\\f]*\\(${n + 1}\\)[ \\t]+`, "g");
  nextRe.lastIndex = from;
  const next = nextRe.exec(block);
  return block.slice(from, next ? next.index : undefined);
}

/** Resolve a "a" / "c(17)" path to its normalized corpus text. */
export function textAtPath(excerpt: string, path: string): string | null {
  const m = /^([a-z])(?:\((\d+)\))?$/.exec(path);
  if (!m) return null;
  const subs = topSubsections(excerpt);
  let block = subs.get(m[1]);
  if (block == null) return null;
  if (m[2]) {
    const child = numberedChild(block, Number(m[2]));
    if (child == null) return null;
    block = child;
  }
  return normalizeCorpusText(block);
}

/** Cut the located quote out of a subsection's normalized text. */
export function cutQuote(subsectionText: string, loc: CyberAuthorityLocator): string | null {
  const start = subsectionText.indexOf(loc.starts_with);
  if (start < 0) return null;
  const endIdx = subsectionText.indexOf(loc.ends_with, start);
  if (endIdx < 0) return null;
  return subsectionText.slice(start, endIdx + loc.ends_with.length);
}

// ── the eighteen § 7123(c) components ────────────────────────────────────
export interface DerivedCyberComponent {
  number: number;
  citation: string;
  verbatim: string;
}

/** Derive the eighteen enumerated components from the cppa-7123 corpus row. */
export function derive7123Components(excerpt: string): DerivedCyberComponent[] {
  const subs = topSubsections(excerpt);
  const c = subs.get("c");
  if (!c) return [];
  const out: DerivedCyberComponent[] = [];
  for (let n = 1; n <= 18; n++) {
    const child = numberedChild(c, n);
    if (child == null) break;
    out.push({
      number: n,
      citation: `11 CCR \u00a7 7123(c)(${n})`,
      verbatim: normalizeCorpusText(child),
    });
  }
  return out;
}

/**
 * COMPONENT_CITATIONS — canonical report control label → § 7123(c)(N).
 * The labels are the product's canonical control names; the CITATIONS are
 * derived from the corpus enumeration, so a change in the statute's ordering
 * cannot silently mis-anchor a control.
 */
export const CYBER_COMPONENT_LABELS: readonly string[] = [
  "Authentication",
  "Encryption of personal information",
  "Account management and access controls",
  "Inventory and management of personal information and systems",
  "Secure configuration of hardware and software",
  "Vulnerability scanning and penetration testing",
  "Audit-log management",
  "Network monitoring and defenses",
  "Antivirus and anti-malware protections",
  "Segmentation of an information system",
  "Port and protocol management and protection",
  "Cybersecurity awareness",
  "Cybersecurity education and training",
  "Secure development and coding practices",
  "Oversight of service providers, contractors, and third parties",
  "Retention schedules and proper disposal of personal information",
  "Security-incident response management",
  "Business-continuity and disaster-recovery planning",
];

export function deriveComponentCitations(
  components: readonly DerivedCyberComponent[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const comp of components) {
    const label = CYBER_COMPONENT_LABELS[comp.number - 1];
    if (label) out[label] = comp.citation;
  }
  return out;
}

// ── runtime-hydrated registry (no static text) ───────────────────────────
/**
 * Live registry. EMPTY until `resolveCyberAuthorities` hydrates it from the
 * corpus during a generation run. Consumers import this binding; because the
 * object is mutated in place there is never a compiled-in copy of the text.
 */
export const CYBER_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {};

/** Rows of the live registry (empty before hydration). */
export function cyberAuthorityRows(): VerifiedAuthorityRow[] {
  return Object.values(CYBER_VERIFIED_AUTHORITIES);
}

/** Replace the live registry's contents with `next` (in place). */
export function hydrateCyberRegistry(next: VerifiedAuthorityRegistry): void {
  for (const k of Object.keys(CYBER_VERIFIED_AUTHORITIES)) delete CYBER_VERIFIED_AUTHORITIES[k];
  for (const [k, v] of Object.entries(next)) CYBER_VERIFIED_AUTHORITIES[k] = v;
}

// ── the resolver ─────────────────────────────────────────────────────────
export interface CyberAuthoritySource {
  version: string;
  /** Registry of rows re-sourced from the corpus (may be partial when degraded). */
  registry: VerifiedAuthorityRegistry;
  provisions: Record<string, {
    key: string;
    citation: string;
    status: string;
    excerpt: string | null;
    plain_requirements: unknown[] | null;
  }>;
  components: DerivedCyberComponent[];
  componentCitations: Record<string, string>;
  /** True when any provision was unapproved or any locator failed to match. */
  degraded: boolean;
  /** Rendered when degraded — never replaced by a stale copy. */
  pending_notice: string | null;
  unresolved: string[];
  /** Provision keys whose text may be supplied to the model. */
  allowed_citation_keys: string[];
}

/** Minimal client surface used here (kept structural so tests can fake it). */
export interface ProvisionClient {
  from: (table: string) => unknown;
}

export async function resolveCyberAuthorities(
  supabase: ProvisionClient,
): Promise<CyberAuthoritySource> {
  const provisions: CyberAuthoritySource["provisions"] = {};
  let degraded = false;

  for (const key of CYBER_PROVISION_KEYS) {
    // deno-lint-ignore no-explicit-any
    const r = await resolveProvisionForRender(supabase as any, key, key.replace("cppa-", "11 CCR \u00a7 "));
    provisions[key] = {
      key,
      citation: r.citation,
      status: r.status,
      excerpt: r.excerpt ?? null,
      plain_requirements: (r.plain_requirements as unknown[]) ?? null,
    };
    if (r.status !== "approved" || !r.excerpt) degraded = true;
  }

  const registry: VerifiedAuthorityRegistry = {};
  const unresolved: string[] = [];
  for (const loc of CYBER_AUTHORITY_  { proposition_key: "cyber_audit_required", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(a)", provision_key: "cppa-7120", path: "a", starts_with: "Every business whose process", ends_with: "plete a cybersecurity audit." },
  { proposition_key: "cyber_threshold_significant_risk", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)", provision_key: "cppa-7120", path: "b", starts_with: "A business's processing of c", ends_with: "ny of the following is true:" },
  { proposition_key: "cyber_threshold_gross_rev", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)(1)", provision_key: "cppa-7120", path: "b(1)", starts_with: "The business meets the thres", ends_with: " preceding calendar year; or" },
  { proposition_key: "cyber_threshold_250k_or_50k_spi", citation: "11 CCR § 7120", subsection: "11 CCR § 7120(b)(2)", provision_key: "cppa-7120", path: "b(2)", starts_with: "The business meets the thres", ends_with: ", subdivision (d)(1)(A); and" },
  { proposition_key: "cyber_first_audit_deadline", citation: "11 CCR § 7121", subsection: "11 CCR § 7121(a)", provision_key: "cppa-7121", path: "a", starts_with: "A business must complete its", ends_with: " audit report no later than:" },
  { proposition_key: "cyber_recurring_cadence", citation: "11 CCR § 7121", subsection: "11 CCR § 7121(b)", provision_key: "cppa-7121", path: "b", starts_with: "After April 1, 2030, if on J", ends_with: "ril 1 of the following year." },
  { proposition_key: "cyber_auditor_qualified_independent", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)", provision_key: "cppa-7122", path: "a", starts_with: "Every business required to c", ends_with: " the profession of auditing," },
  { proposition_key: "cyber_auditor_knowledge", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(1)", provision_key: "cppa-7122", path: "a(1)", starts_with: "To be qualified, an auditor ", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_auditor_impartial", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(2)", provision_key: "cppa-7122", path: "a(2)", starts_with: "The auditor may be internal ", ends_with: " of the cybersecurity audit," },
  { proposition_key: "cyber_internal_reporting_line", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(a)(3)", provision_key: "cppa-7122", path: "a(3)", starts_with: "If a business uses an intern", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_business_disclose", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(c)", provision_key: "cppa-7122", path: "c", starts_with: "The business must make good-", ends_with: " to the cybersecurity audit." },
  { proposition_key: "cyber_evidence_over_attestation", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(d)", provision_key: "cppa-7122", path: "d", starts_with: "No finding of any cybersecur", ends_with: "y the business's management." },
  { proposition_key: "cyber_report_to_exec", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(f)", provision_key: "cppa-7122", path: "f", starts_with: "The cybersecurity audit repo", ends_with: "ess's cybersecurity program." },
  { proposition_key: "cyber_retention_5yr", citation: "11 CCR § 7122", subsection: "11 CCR § 7122(g)", provision_key: "cppa-7122", path: "g", starts_with: "The business and the auditor", ends_with: " of the cybersecurity audit." },
  { proposition_key: "cyber_scope_protects_pi", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(a)", provision_key: "cppa-7123", path: "a", starts_with: "The cybersecurity audit must", ends_with: "ity of personal information." },
  { proposition_key: "cyber_scope_assess_program", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(b)", provision_key: "cppa-7123", path: "b", starts_with: "The cybersecurity audit must", ends_with: "rsecurity audit must assess:" },
  { proposition_key: "cyber_components_chapeau", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)", provision_key: "cppa-7123", path: "c", starts_with: "The cybersecurity audit must", ends_with: "g components, if applicable:" },
  { proposition_key: "cyber_c1_authentication", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(1)", provision_key: "cppa-7123", path: "c(1)", starts_with: "Authentication, including:", ends_with: "Authentication, including:" },
  { proposition_key: "cyber_c2_encryption", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(2)", provision_key: "cppa-7123", path: "c(2)", starts_with: "Encryption of personal infor", ends_with: "ion, at rest and in transit." },
  { proposition_key: "cyber_c3_access_controls", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(3)", provision_key: "cppa-7123", path: "c(3)", starts_with: "Account management and acces", ends_with: " access controls, including:" },
  { proposition_key: "cyber_c4_inventory", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(4)", provision_key: "cppa-7123", path: "c(4)", starts_with: "Inventory and management of ", ends_with: "formation system, including:" },
  { proposition_key: "cyber_c5_secure_config", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(5)", provision_key: "cppa-7123", path: "c(5)", starts_with: "Secure configuration of hard", ends_with: "are and software, including:" },
  { proposition_key: "cyber_c6_vuln_pentest", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(6)", provision_key: "cppa-7123", path: "c(6)", starts_with: "Internal and external vulner", ends_with: "ity disclosure and reporting" },
  { proposition_key: "cyber_c7_audit_logs", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(7)", provision_key: "cppa-7123", path: "c(7)", starts_with: "Audit-log management, includ", ends_with: "ion, and monitoring of logs." },
  { proposition_key: "cyber_c8_network_monitoring", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(8)", provision_key: "cppa-7123", path: "c(8)", starts_with: "Network monitoring and defen", ends_with: "including the deployment of:" },
  { proposition_key: "cyber_c9_antivirus", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(9)", provision_key: "cppa-7123", path: "c(9)", starts_with: "Antivirus and antimalware pr", ends_with: "and antimalware protections." },
  { proposition_key: "cyber_c10_segmentation", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(10)", provision_key: "cppa-7123", path: "c(10)", starts_with: "Segmentation of an informati", ends_with: "ion of an information system" },
  { proposition_key: "cyber_c11_ports", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(11)", provision_key: "cppa-7123", path: "c(11)", starts_with: "Limitation and control of po", ends_with: "ts, services, and protocols." },
  { proposition_key: "cyber_c12_awareness", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(12)", provision_key: "cppa-7123", path: "c(12)", starts_with: "Cybersecurity awareness, inc", ends_with: "threats and countermeasures." },
  { proposition_key: "cyber_c13_training", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(13)", provision_key: "cppa-7123", path: "c(13)", starts_with: "Cybersecurity education and ", ends_with: "ss to its information system" },
  { proposition_key: "cyber_c14_secure_dev", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(14)", provision_key: "cppa-7123", path: "c(14)", starts_with: "Secure development and codin", ends_with: "ng code-reviews and testing." },
  { proposition_key: "cyber_c15_third_party_oversight", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(15)", provision_key: "cppa-7123", path: "c(15)", starts_with: "Oversight of service provide", ends_with: "with sections 7051 and 7053." },
  { proposition_key: "cyber_c16_retention_disposal", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(16)", provision_key: "cppa-7123", path: "c(16)", starts_with: "Retention schedules and prop", ends_with: "ger required to be retained," },
  { proposition_key: "cyber_c17_incident_response", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(17)", provision_key: "cppa-7123", path: "c(17)", starts_with: "How the business manages its", ends_with: "cident response management)." },
  { proposition_key: "cyber_c18_bcdr", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(c)(18)", provision_key: "cppa-7123", path: "c(18)", starts_with: "Business-continuity and disa", ends_with: "ry capabilities and backups." },
  { proposition_key: "cyber_scope_additional_components", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(d)", provision_key: "cppa-7123", path: "d", starts_with: "Nothing in this section proh", ends_with: "h in subsections (b) or (c)." },
  { proposition_key: "cyber_report_contents_chapeau", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)", provision_key: "cppa-7123", path: "e", starts_with: "The cybersecurity audit repo", ends_with: "rsecurity audit report must:" },
  { proposition_key: "cyber_report_gaps", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)(3)", provision_key: "cppa-7123", path: "e(3)", starts_with: "Identify and describe in det", ends_with: "ordance with subsection (d)," },
  { proposition_key: "cyber_report_signed_attestation", citation: "11 CCR § 7123", subsection: "11 CCR § 7123(e)(8)", provision_key: "cppa-7123", path: "e(8)", starts_with: "Include a statement that is ", ends_with: "gram and information system," },
  { proposition_key: "cyber_cert_required", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(a)", provision_key: "cppa-7124", path: "a", starts_with: "Each calendar year that a bu", ends_with: "as required by this Article." },
  { proposition_key: "cyber_cert_by_april1", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(b)", provision_key: "cppa-7124", path: "b", starts_with: "The business must submit the", ends_with: "plete a cybersecurity audit." },
  { proposition_key: "cyber_cert_by_exec", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(c)", provision_key: "cppa-7124", path: "c", starts_with: "The written certification mu", ends_with: "ecutive management team who:" },
  { proposition_key: "cyber_cert_portal_and_attest", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(d)", provision_key: "cppa-7124", path: "d", starts_with: "The written certification mu", ends_with: "ite at https://cppa.ca.gov/." },
  { proposition_key: "cyber_cert_attestation_text", citation: "11 CCR § 7124", subsection: "11 CCR § 7124(d)(4)", provision_key: "cppa-7124", path: "d(4)", starts_with: "I attest that I meet the req", ends_with: "o submit this certification." },) {
    const excerpt = provisions[loc.provision_key]?.excerpt;
    const block = excerpt ? textAtPath(excerpt, loc.path) : null;
    const quote = block ? cutQuote(block, loc) : null;
    if (!quote) {
      unresolved.push(loc.proposition_key);
      degraded = true;
      continue;
    }
    const row: VerifiedAuthorityRow = {
      proposition_key: loc.proposition_key,
      citation: loc.citation,
      subsection: loc.subsection,
      verbatim_quote: quote,
      depth_class: /\(\d+\)$/.test(loc.subsection) ? "sub_subsection" : "subsection",
      governing_anchor: ART9,
      verified_on: new Date().toISOString().slice(0, 10),
      primary_source_url: CCR_URL,
    };
    registry[loc.proposition_key] = row;
  }

  hydrateCyberRegistry(registry);

  const components = derive7123Components(provisions["cppa-7123"]?.excerpt ?? "");
  if (components.length !== 18) degraded = true;

  return {
    version: CYBER_VERIFIED_AUTHORITY_VERSION,
    registry,
    provisions,
    components,
    componentCitations: deriveComponentCitations(components),
    degraded,
    pending_notice: degraded ? PROVISION_PENDING_NOTICE : null,
    unresolved,
    allowed_citation_keys: Object.values(provisions)
      .filter((p) => p.status === "approved" && p.excerpt)
      .map((p) => p.citation),
  };
}

/**
 * The law block supplied to the model: verbatim corpus excerpts plus the
 * corpus `plain_requirements`. Nothing outside these keys may be cited.
 */
export function buildCyberLawBlock(source: CyberAuthoritySource): string {
  const parts: string[] = [];
  parts.push(
    `CORPUS LAW BLOCK (${source.version}) — the ONLY statutory text you may rely on. ` +
    "Every \u00a7 citation you emit must be to one of the sections reproduced below; " +
    "a citation to any other section is a defect and is rejected.",
  );
  for (const key of CYBER_PROVISION_KEYS) {
    const p = source.provisions[key];
    if (!p) continue;
    if (p.status !== "approved" || !p.excerpt) {
      parts.push(`\n[${key}] ${p.citation} — ${PROVISION_PENDING_NOTICE} Cite the section, quote nothing.`);
      continue;
    }
    parts.push(`\n[${key}] ${p.citation} — VERBATIM CORPUS TEXT:\n${p.excerpt}`);
    const reqs = Array.isArray(p.plain_requirements) ? p.plain_requirements : [];
    if (reqs.length) {
      parts.push(
        `Plain requirements (corpus-derived, ${reqs.length}):\n` +
        reqs.map((r, i) => `  ${i + 1}. ${typeof r === "string" ? r : JSON.stringify(r)}`).join("\n"),
      );
    }
  }
  if (source.degraded) {
    parts.push(
      `\nDEGRADED SOURCE NOTICE: ${source.pending_notice} Where text is unavailable, cite the section ` +
      "and state plainly that the verbatim text is pending verification. NEVER reconstruct it from memory.",
    );
  }
  return parts.join("\n");
}

/** Citations the report may emit, derived from the resolved corpus rows. */
export function allowedCyberCitations(source: CyberAuthoritySource): Set<string> {
  const out = new Set<string>();
  for (const p of Object.values(source.provisions)) {
    if (p.status === "approved" && p.excerpt) out.add(p.citation);
  }
  for (const row of Object.values(source.registry)) out.add(row.citation);
  for (const c of source.components) out.add(c.citation);
  return out;
}

/** True when `citation`'s section is among the corpus-supplied sections. */
export function isAllowedCyberCitation(citation: string, allowed: Set<string>): boolean {
  const m = /(\d+)\s*CCR\s*\u00a7+\s*([\d.]+)/.exec(String(citation || ""));
  if (!m) return true; // non-CCR citations are governed by their own checks
  const base = `${m[1]} CCR \u00a7 ${m[2]}`;
  for (const a of allowed) if (a.replace(/\s+/g, " ").startsWith(base)) return true;
  return false;
}
