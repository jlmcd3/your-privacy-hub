/**
 * ITEM 369-IR (Master Spec §4.2) — CORPUS INTO THE IR PLAYBOOK.
 *
 * House pattern (lia-corpus.ts / governance-corpus.ts), two sources kept apart
 * because they are pinned differently:
 *
 *   1. STATUTE — `provision_texts` rows resolved AT RUNTIME through the shared
 *      `resolveProvisionForRender` closed-set resolver. `gdpr-art-33` and
 *      `gdpr-art-34` are the spine. ZERO statutory text is compiled into this
 *      module: a key that is not approved contributes no excerpt.
 *
 *   2. EDPB GUIDELINES 9/2022 on personal data breach notification — pinned
 *      excerpts on the `edpb_guidelines` pin pattern (see
 *      ltp/eu-authority/pinned-guidance.ts). Every `verbatim_quote` below is a
 *      byte-exact contiguous substring of the identified row's `excerpt_text`
 *      (status='final'), captured 2026-08-04, and is RE-VERIFIED at build time.
 *      A drifted pin DEGRADES to citation-only rather than shipping unverified
 *      text.
 *
 * TEMPLATE-GUIDANCE LAW: NIST SP 800-61r3, the CISA federal IR playbooks and
 * the ICO breach-management toolkit shape the SECTION HEADINGS and the intake
 * rail only. They are never corpus assertions, never quoted as authority, and
 * never reach this module. Nothing here may cite them.
 */
import { resolveProvisionForRender } from "../provision-store.ts";

type SupabaseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      in: (col: string, vals: string[]) => Promise<{ data: unknown[] | null }>;
    };
  };
};

export const IR_CORPUS_VERSION = "ir-corpus@2026-08-04-item369";

/** The statutory spine of a breach playbook. Closed set. */
export const IR_CORPUS_KEYS: readonly string[] = ["gdpr-art-33", "gdpr-art-34"];

/** The only guidance reference this product is allowed to cite as a pin. */
export const EDPB_9_2022_REF = "EDPB Guidelines 9/2022";

/**
 * ALLOW-LISTED CITATIONS. A pin whose citation is not on this list is dropped
 * before it can reach a report.
 */
export const IR_ALLOWED_GUIDANCE_CITATIONS: readonly string[] = [
  "EDPB Guidelines 9/2022, § II.A.2 (when does a controller become “aware”?)",
  "EDPB Guidelines 9/2022, § II.C.2 (notification in phases)",
  "EDPB Guidelines 9/2022, § II.C.1 (information to be provided)",
  "EDPB Guidelines 9/2022, § II.D.1 (cross-border breaches)",
  "EDPB Guidelines 9/2022, § II.A.1 (Article 33 requirements)",
];

export interface IrGuidancePin {
  /** Deliverable proposition the excerpt supports. */
  readonly proposition_key: string;
  /** edpb_guidelines.id — re-queried byte-exact at build time. */
  readonly corpus_row_id: string;
  readonly citation: string;
  readonly source_url: string;
  readonly verbatim_quote: string;
}

const EDPB_9_2022_URL =
  "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en";

export const IR_GUIDANCE_PINS: readonly IrGuidancePin[] = [
  {
    proposition_key: "awareness_reasonable_degree_of_certainty",
    corpus_row_id: "3e56f29e-b71e-4108-b6b3-0830df5f0483",
    citation: "EDPB Guidelines 9/2022, § II.A.1 (Article 33 requirements)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "a controller should be regarded as having become “aware” when that controller has a reasonable degree of certainty that a security incident has occurred that has led to personal data being compromised",
  },
  {
    proposition_key: "initial_investigation_promptness",
    corpus_row_id: "b4fa0901-800f-432c-b18f-1855124aebf3",
    citation: "EDPB Guidelines 9/2022, § II.A.2 (when does a controller become “aware”?)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "it is expected that the initial investigation should begin as soon as possible and establish with a reasonable degree of certainty whether a breach has taken place; a more detailed investigation can then follow",
  },
  {
    proposition_key: "notification_in_phases",
    corpus_row_id: "9d3d0b44-2db6-461d-bb7e-6973f07e69ab",
    citation: "EDPB Guidelines 9/2022, § II.C.2 (notification in phases)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "it allows for a notification in phases. It is more likely this will be the case for more complex breaches, such as some types of cyber security incidents where, for example, an in-depth forensic investigation may be necessary to fully establish the nature of the breach",
  },
  {
    proposition_key: "notification_content_at_least",
    corpus_row_id: "48a19807-3513-4a01-8b7e-65672e54e65d",
    citation: "EDPB Guidelines 9/2022, § II.C.1 (information to be provided)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "Article 33(3) GDPR states that the controller “shall at least” provide this information with a notification, so a controller can, if necessary, choose to provide further details.",
  },
  {
    proposition_key: "cross_border_lead_authority",
    corpus_row_id: "ea1cabec-fca7-4fcf-bb8d-ead0c56c6c35",
    citation: "EDPB Guidelines 9/2022, § II.D.1 (cross-border breaches)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "This means that whenever a breach takes place in the context of cross-border processing and notification is required, the controller will need to notify the lead supervisory authority",
  },
  {
    proposition_key: "prompt_action_and_containment",
    corpus_row_id: "82453fba-db84-4a86-8f85-77b50c7b1d06",
    citation: "EDPB Guidelines 9/2022, § II.C.2 (notification in phases)",
    source_url: EDPB_9_2022_URL,
    verbatim_quote:
      "The focus of the notification requirement is to encourage controllers to act promptly on a breach, contain it and, if possible, recover the compromised personal data, and to seek relevant advice from the supervisory authority.",
  },
];

export interface IrCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface IrGuidanceExcerpt {
  readonly proposition_key: string;
  readonly citation: string;
  readonly source_url: string;
  readonly verbatim: string;
  /** True only when the quote was found byte-exact in the live corpus row. */
  readonly pin_verified: boolean;
}

export interface IrCorpus {
  readonly version: string;
  readonly provisions: readonly IrCorpusProvision[];
  readonly guidance: readonly IrGuidanceExcerpt[];
  readonly resolved_count: number;
  readonly approved_count: number;
  readonly guidance_verified_count: number;
}

export const EMPTY_IR_CORPUS: IrCorpus = {
  version: IR_CORPUS_VERSION,
  provisions: [],
  guidance: [],
  resolved_count: 0,
  approved_count: 0,
  guidance_verified_count: 0,
};

function asStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x
        : typeof x === "object" && x
        ? String((x as Record<string, unknown>).text ?? "")
        : "",
    )
    .filter(Boolean);
}

/**
 * Load the IR corpus. Fail-open in every limb: a resolver error yields no
 * provision rather than a thrown generation.
 */
export async function loadIrCorpus(supabase: unknown): Promise<IrCorpus> {
  const provisions: IrCorpusProvision[] = [];
  for (const key of IR_CORPUS_KEYS) {
    try {
      // deno-lint-ignore no-explicit-any
      const r = await resolveProvisionForRender(supabase as any, key);
      provisions.push({
        key,
        citation: String(r?.citation ?? key),
        status: (r?.status as IrCorpusProvision["status"]) ?? "pending",
        verbatim_excerpt: String(r?.excerpt ?? ""),
        plain_requirements: asStrings(r?.plain_requirements),
      });
    } catch {
      // honest degradation — key contributes nothing
    }
  }

  const guidance = await verifyGuidancePins(supabase);

  return {
    version: IR_CORPUS_VERSION,
    provisions,
    guidance,
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
    guidance_verified_count: guidance.filter((g) => g.pin_verified).length,
  };
}

/**
 * Re-verify every pin against the live `edpb_guidelines` rows. A quote that is
 * no longer a byte-exact substring degrades to citation-only (verbatim "").
 * Citations not on IR_ALLOWED_GUIDANCE_CITATIONS are dropped entirely.
 */
export async function verifyGuidancePins(supabase: unknown): Promise<IrGuidanceExcerpt[]> {
  const allowed = new Set(IR_ALLOWED_GUIDANCE_CITATIONS);
  const pins = IR_GUIDANCE_PINS.filter((p) => allowed.has(p.citation));
  const texts = new Map<string, string>();
  try {
    const client = supabase as SupabaseClient;
    const { data } = await client
      .from("edpb_guidelines")
      .select("id, excerpt_text, status")
      .in("id", pins.map((p) => p.corpus_row_id));
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      if (row && String(row.status ?? "") === "final") {
        texts.set(String(row.id), String(row.excerpt_text ?? ""));
      }
    }
  } catch {
    // fail-open — every pin degrades to citation-only
  }
  return pins.map((p) => {
    const live = texts.get(p.corpus_row_id) ?? "";
    const verified = live.length > 0 && live.includes(p.verbatim_quote);
    return {
      proposition_key: p.proposition_key,
      citation: p.citation,
      source_url: p.source_url,
      verbatim: verified ? p.verbatim_quote : "",
      pin_verified: verified,
    };
  });
}

/** Citations the authority exhibit may list for this product. */
export function irCorpusCitations(corpus: IrCorpus): string[] {
  const out: string[] = [];
  for (const p of corpus.provisions) if (p.citation) out.push(p.citation);
  for (const g of corpus.guidance) if (g.pin_verified) out.push(g.citation);
  return out;
}
