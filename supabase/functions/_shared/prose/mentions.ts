// ITEM 339 (PROSE PROGRAM 3 of 4) — REFERRING EXPRESSIONS.
//
// First mention of the primary entity uses its full legal name; later mentions
// in the same major section shorten. The tracker resets at each major section
// so a reader who lands mid-document still learns who is being discussed.
//
// AMBIGUITY GUARD (binding): shortening happens ONLY for the primary entity.
// When a second entity is in play (a processor alongside the controller, a
// vendor, a regulator), every non-primary entity always renders in full, and
// pronouns are switched off entirely — a report must never leave a reader
// guessing which party "it" refers to.

export type ShortForm = "the company" | "the organisation" | "the organization" | "the controller";

export interface MentionOptions {
  /** Full legal name of the entity the report is about. */
  readonly primary: string;
  /** Any other named party appearing in the document. */
  readonly others?: readonly string[];
  /** Short form for the primary entity. Defaults to "the company". */
  readonly shortForm?: ShortForm;
  /**
   * Allow a pronoun for the third and later mention within a section.
   * Forced off whenever `others` is non-empty.
   */
  readonly allowPronoun?: boolean;
}

export class MentionTracker {
  readonly #primary: string;
  readonly #others: readonly string[];
  readonly #short: string;
  readonly #pronounAllowed: boolean;
  #count = 0;

  constructor(opts: MentionOptions) {
    this.#primary = (opts.primary ?? "").trim();
    this.#others = (opts.others ?? []).map((o) => o.trim()).filter(Boolean);
    this.#short = opts.shortForm ?? "the company";
    // AMBIGUITY GUARD.
    this.#pronounAllowed = Boolean(opts.allowPronoun) && this.#others.length === 0;
  }

  /** Call at the start of every major section. */
  resetSection(): void {
    this.#count = 0;
  }

  get mentionsInSection(): number {
    return this.#count;
  }

  /**
   * Renders a mention of `entity`. Non-primary entities always render in full
   * and never advance the primary's mention counter.
   */
  render(entity?: string): string {
    const name = (entity ?? this.#primary).trim();
    if (!name) return "";
    if (!this.isPrimary(name)) return name;
    const n = this.#count++;
    if (n === 0) return this.#primary;
    if (n === 1 || !this.#pronounAllowed) return this.#short;
    return "it";
  }

  /** Renders the possessive form, following the same schedule. */
  renderPossessive(entity?: string): string {
    const m = this.render(entity);
    if (m === "it") return "its";
    return /s$/i.test(m) ? `${m}'` : `${m}'s`;
  }

  isPrimary(name: string): boolean {
    const a = norm(name), b = norm(this.#primary);
    return Boolean(a) && (a === b || (b.startsWith(a) && a.length >= 6));
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Rewrites already-assembled sentences so repeats of the primary entity within
 * a section shorten. Used by the plan renderer after frame realization, where
 * the entity arrives inside frame output rather than through `render()`.
 */
export function applyMentionRule(
  sentences: readonly string[],
  opts: MentionOptions,
): string[] {
  const tracker = new MentionTracker(opts);
  const primary = opts.primary.trim();
  if (!primary) return [...sentences];
  const re = new RegExp(escapeRe(primary), "g");
  return sentences.map((s) =>
    s.replace(re, () => {
      const m = tracker.render(primary);
      return m;
    })
  );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
