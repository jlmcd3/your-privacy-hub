// DPA-ANNEX (Master Spec §4.11, item 10) — DETERMINISTIC Art. 28(3)
// clause-coverage checker + annex renderer.
//
// Contract:
//   * Nothing here is model-asserted. Present/absent and the location are
//     derived by string/structure analysis of the generated contract text.
//   * No new statutory string literals. Clause citations and requirement
//     text are sourced from provision-store (`gdpr-art-28`, seeded and
//     approved); the checker parses the approved verbatim excerpt into the
//     chapeau, letters (a)–(h) and the 28(3) second subparagraph
//     (instruction-infringement notice) and derives its own detection
//     signatures from that same text.
//   * The annex is a quality gate, never a rewrite: absent clauses render
//     "Absent" and the contract text is not modified to force coverage.

export interface Art28ClauseFinding {
  /** "chapeau" | "a".."h" | "second_subparagraph" */
  clause: string;
  /** Human label for the clause, e.g. "Art. 28(3)(a)". Built from the provision citation. */
  citation: string;
  /** Requirement summary sourced from the provision excerpt. */
  requirement: string;
  status: "present" | "absent";
  /** Section/clause reference where found, or null when absent. */
  location: string | null;
  /** Deterministic evidence — matched signature tokens and the score. */
  matched_terms: string[];
  score: number;
}

export interface Art28CoverageResult {
  provision_key: string;
  provision_status: string;
  citation: string | null;
  clauses: Art28ClauseFinding[];
  present_count: number;
  absent_count: number;
  checker_version: string;
}

export const DPA_CLAUSE_COVERAGE_VERSION = "dpa-art28-coverage-v1-2026-08-04";

const STOPWORDS = new Set([
  "shall", "which", "there", "these", "those", "their", "other", "under",
  "where", "with", "that", "this", "such", "from", "into", "have", "been",
  "being", "must", "will", "would", "about", "after", "before", "point",
  "first", "regard", "including", "including,", "opinion", "another",
  "referred", "paragraphs", "account", "taking", "necessary", "appropriate",
  "personal", "processing", "processor", "controller", "regulation", "member",
  "state", "union", "subject", "subjects", "provisions", "immediately",
]);

function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z-]+/g) ?? []);
}

/** Crude, deterministic stem: lowercase, strip a trailing plural, clip to 6. */
function stem(w: string): string {
  let x = w;
  if (x.endsWith("ies") && x.length > 4) x = x.slice(0, -3) + "y";
  else if (x.endsWith("es") && x.length > 4) x = x.slice(0, -2);
  else if (x.endsWith("s") && x.length > 4) x = x.slice(0, -1);
  return x.slice(0, 6);
}

/**
 * Split the approved Art. 28 verbatim excerpt into the 28(3) surfaces the
 * checklist covers. Structural parse only — no statutory strings are
 * hard-coded here.
 */
export function parseArt28Segments(excerpt: string): Array<{ clause: string; text: string }> {
  const blocks = excerpt
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const out: Array<{ clause: string; text: string }> = [];
  let sawLetters = false;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const letterMarker = /^\(([a-h])\)$/.exec(b);
    if (letterMarker) {
      const body = blocks[i + 1];
      if (body && !/^\([a-h]\)$/.test(body)) {
        out.push({ clause: letterMarker[1], text: body });
        sawLetters = true;
        i++;
      }
      continue;
    }
    // Inline "(a) text" shape.
    const inline = /^\(([a-h])\)\s+(.{20,})$/.exec(b);
    if (inline) {
      out.push({ clause: inline[1], text: inline[2] });
      sawLetters = true;
      continue;
    }
    const numbered = /^(\d+)\.\s+(.{20,})$/.exec(b);
    if (numbered) {
      if (numbered[1] === "3") out.unshift({ clause: "chapeau", text: numbered[2] });
      continue;
    }
    // Unnumbered prose immediately after the lettered list = the 28(3)
    // second subparagraph (instruction-infringement notice).
    if (sawLetters && !out.some((s) => s.clause === "second_subparagraph") && b.length > 40) {
      out.push({ clause: "second_subparagraph", text: b });
    }
  }
  return out;
}

/** Requirement summary = first sentence of the provision text, clipped. */
function summarise(text: string): string {
  const first = text.split(/(?<=[.;])\s/)[0] ?? text;
  const s = first.trim().replace(/[;,]$/, "");
  return s.length > 220 ? s.slice(0, 217).trimEnd() + "…" : s;
}

function citationFor(baseCitation: string, clause: string): string {
  const base = (baseCitation || "GDPR Art. 28").replace(/\s*$/, "");
  if (clause === "chapeau") return `${base}(3) — chapeau`;
  if (clause === "second_subparagraph") return `${base}(3) — second subparagraph`;
  return `${base}(3)(${clause})`;
}

/** Signature tokens per clause: distinctive terms of that clause's own text. */
function buildSignatures(
  segments: Array<{ clause: string; text: string }>,
): Map<string, string[]> {
  const perClause = segments.map((s) => {
    const set = new Set<string>();
    for (const w of words(s.text)) {
      if (w.length < 5 || STOPWORDS.has(w)) continue;
      set.add(stem(w));
    }
    return { clause: s.clause, tokens: set };
  });
  const df = new Map<string, number>();
  for (const c of perClause) for (const t of c.tokens) df.set(t, (df.get(t) ?? 0) + 1);

  const sig = new Map<string, string[]>();
  for (const c of perClause) {
    const ranked = [...c.tokens]
      .filter((t) => (df.get(t) ?? 0) <= 2)
      .sort((a, b) => (df.get(a)! - df.get(b)!) || a.localeCompare(b))
      .slice(0, 8);
    sig.set(c.clause, ranked.length >= 2 ? ranked : [...c.tokens].slice(0, 6));
  }
  return sig;
}

interface DocSection { heading: string; body: string; tokens: Set<string> }

/** Structural split of the contract text into numbered sections / schedules. */
export function splitDpaSections(documentText: string): DocSection[] {
  const lines = documentText.split(/\r?\n/);
  const sections: DocSection[] = [];
  let heading = "Preamble";
  let buf: string[] = [];
  const flush = () => {
    const body = buf.join("\n");
    if (body.trim()) sections.push({ heading, body, tokens: new Set(words(body).map(stem)) });
    buf = [];
  };
  const headingRe = /^\s*(?:\*\*)?\s*(?:SECTION\s+)?(\d+(?:\.\d+)*)[.)]?\s+(\S.{1,90}?)\s*(?:\*\*)?\s*$/;
  const namedRe = /^\s*(?:\*\*|#+\s*)?\s*((?:SCHEDULE|ANNEX|APPENDIX|EXHIBIT)\b.{0,80}?)\s*(?:\*\*)?\s*$/i;
  for (const line of lines) {
    const m = headingRe.exec(line);
    const n = namedRe.exec(line);
    if (m && /[A-Za-z]/.test(m[2])) {
      flush();
      heading = `Section ${m[1]} — ${m[2].replace(/[:—-]\s*$/, "").trim()}`;
    } else if (n) {
      flush();
      heading = n[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

/**
 * Deterministic Art. 28(3) coverage check.
 * `provision` is the provision-store row for `gdpr-art-28`.
 */
export function checkArt28Coverage(
  documentText: string,
  provision: { key?: string; status?: string; citation?: string | null; excerpt?: string | null },
): Art28CoverageResult {
  const segments = parseArt28Segments(provision.excerpt ?? "");
  const signatures = buildSignatures(segments);
  const sections = splitDpaSections(documentText);
  const docTokens = new Set(words(documentText).map(stem));

  const clauses: Art28ClauseFinding[] = segments.map((seg) => {
    const sig = signatures.get(seg.clause) ?? [];
    const matched = sig.filter((t) => docTokens.has(t));
    const score = sig.length ? matched.length / sig.length : 0;
    const present = sig.length > 0 && matched.length >= 2 && score >= 0.5;

    let location: string | null = null;
    if (present) {
      let best: { heading: string; hits: number } | null = null;
      for (const s of sections) {
        const headingTokens = new Set(words(s.heading).map(stem));
        const bodyHits = sig.filter((t) => s.tokens.has(t)).length;
        // A section whose HEADING carries the clause's distinctive terms is
        // the clause's home; body mentions alone are weaker evidence.
        const hits = bodyHits + 3 * sig.filter((t) => headingTokens.has(t)).length;
        if (bodyHits > 0 && (!best || hits > best.hits)) best = { heading: s.heading, hits };
      }

      location = best ? best.heading : "Document body";
    }

    return {
      clause: seg.clause,
      citation: citationFor(provision.citation ?? "GDPR Art. 28", seg.clause),
      requirement: summarise(seg.text),
      status: present ? "present" : "absent",
      location,
      matched_terms: matched,
      score: Math.round(score * 100) / 100,
    };
  });

  return {
    provision_key: provision.key ?? "gdpr-art-28",
    provision_status: provision.status ?? "unknown",
    citation: provision.citation ?? null,
    clauses,
    present_count: clauses.filter((c) => c.status === "present").length,
    absent_count: clauses.filter((c) => c.status === "absent").length,
    checker_version: DPA_CLAUSE_COVERAGE_VERSION,
  };
}

export const ANNEX_HEADING = "ANNEX — ARTICLE 28(3) CLAUSE-COVERAGE CHECKLIST";

function clauseLabel(clause: string): string {
  if (clause === "chapeau") return "Chapeau";
  if (clause === "second_subparagraph") return "Second subparagraph";
  return `(${clause})`;
}

/** Renders the checklist as a short annex block appended to the document. */
export function renderArt28CoverageAnnex(result: Art28CoverageResult): string {
  if (!result.clauses.length) return "";
  const lines: string[] = [];
  lines.push(ANNEX_HEADING);
  lines.push("");
  lines.push(
    `Deterministic coverage check of this document against ${result.citation ?? "GDPR Art. 28"}(3). ` +
      `Clause → requirement → present/absent → location. ` +
      `${result.present_count} present, ${result.absent_count} absent. ` +
      `A clause marked Absent has not been drafted into this document and requires attention before execution.`,
  );
  lines.push("");
  for (const c of result.clauses) {
    lines.push(
      `${clauseLabel(c.clause)} — ${c.citation} — ${c.requirement} — ` +
        `${c.status === "present" ? "Present" : "Absent"} — ${c.location ?? "—"}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
