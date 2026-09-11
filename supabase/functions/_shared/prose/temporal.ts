// DOC 259A §3.11 (CEO-approved 2026-09-11) — past-dated commitments in
// recorded text. A company's own answer often carries a date it committed to
// ("remediation sprint in Q3 2025", "update scheduled for 2024-11-30",
// "published no later than 2024-11-30"). Read at a later report date, that
// commitment is past, and a report that carries it forward as a plan — or
// attaches a relative deadline to it — overstates the position. This reader
// finds the dated mentions in a text and returns the ones earlier than the
// report date; each caller states the consequence in its own register.
//
// Narrow by design (the DOC 148 rule carried): only unambiguous tokens count —
// an ISO date, "Q3 2025", "June 2024", "12 June 2024" / "June 12, 2024",
// "by (the) end of 2025". A bare year is never a date ("24 months of logs",
// "the 2023 Advertiser Performance Report"). Quarter and month-year tokens
// resolve to the END of the period, so a commitment is only "past" once the
// whole period it names has elapsed.

export interface DatedMention {
  /** The token as it appears in the text (for quoting back). */
  readonly raw: string;
  /** ISO date (UTC) the token resolves to — the end of the period named. */
  readonly iso: string;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOf(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.toLowerCase() as typeof MONTHS[number]) + 1;
}

/** Every unambiguous dated mention in the text, in document order. */
export function datedMentions(text: string): DatedMention[] {
  const t = typeof text === "string" ? text : "";
  if (!t) return [];
  const out: { raw: string; iso: string; at: number }[] = [];
  const seen = new Set<number>();
  const push = (raw: string, iso: string, at: number) => {
    if (seen.has(at)) return;
    seen.add(at);
    out.push({ raw, iso, at });
  };
  let m: RegExpExecArray | null;

  // ISO YYYY-MM-DD (the form the intake date fields store).
  const iso = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
  while ((m = iso.exec(t)) !== null) push(m[0], `${m[1]}-${m[2]}-${m[3]}`, m.index);

  // "12 June 2024" and "June 12, 2024".
  const dmy = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join("|")})\\s+(20\\d{2})\\b`, "gi");
  while ((m = dmy.exec(t)) !== null) {
    const mi = monthIndex(m[2]);
    const d = Math.min(Number(m[1]), lastDayOf(Number(m[3]), mi));
    push(m[0], `${m[3]}-${pad2(mi)}-${pad2(d)}`, m.index);
  }
  const mdy = new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "gi");
  while ((m = mdy.exec(t)) !== null) {
    const mi = monthIndex(m[1]);
    const d = Math.min(Number(m[2]), lastDayOf(Number(m[3]), mi));
    push(m[0], `${m[3]}-${pad2(mi)}-${pad2(d)}`, m.index);
  }

  // "Q3 2025" → the last day of the quarter.
  const q = /\bQ([1-4])\s*(20\d{2})\b/gi;
  while ((m = q.exec(t)) !== null) {
    const endMonth = Number(m[1]) * 3;
    const y = Number(m[2]);
    push(m[0], `${y}-${pad2(endMonth)}-${pad2(lastDayOf(y, endMonth))}`, m.index);
  }

  // "June 2024" → the last day of the month (not already claimed by a day form).
  const my = new RegExp(`\\b(${MONTHS.join("|")})\\s+(20\\d{2})\\b`, "gi");
  while ((m = my.exec(t)) !== null) {
    const covered = out.some((o) => m!.index >= o.at && m!.index < o.at + o.raw.length);
    if (covered) continue;
    const mi = monthIndex(m[1]);
    const y = Number(m[2]);
    push(m[0], `${y}-${pad2(mi)}-${pad2(lastDayOf(y, mi))}`, m.index);
  }

  // "by (the) end of 2025" → 31 December.
  const eoy = /\bby\s+(?:the\s+)?end\s+of\s+(20\d{2})\b/gi;
  while ((m = eoy.exec(t)) !== null) push(m[0], `${m[1]}-12-31`, m.index);

  return out.sort((a, b) => a.at - b.at).map(({ raw, iso }) => ({ raw, iso }));
}

/** ISO date (UTC) of the report date; accepts a Date or any string starting YYYY-MM-DD. */
export function asOfIso(asOf: Date | string | undefined): string {
  if (asOf instanceof Date && !Number.isNaN(asOf.getTime())) return asOf.toISOString().slice(0, 10);
  if (typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}/.test(asOf)) return asOf.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

// A COMMITMENT, not an event. "exercised in a tabletop simulation in April
// 2025" records something that happened; "sprint scheduled for Q3 2025" and
// "published no later than 2024-11-30" record something promised. Only a
// token with a forward-looking cue before it counts as a commitment: a
// scheduling word anywhere in the short span before the token, or "by" /
// "before" / "until" standing directly in front of it. "in", "on", "from" and
// the like are not cues — they introduce events as readily as plans.
const CUE_SPAN = 60;
const SCHEDULING_CUE_RE =
  /\b(scheduled|planned|plans? to|planning to|no later than|not later than|targets?|targeted|targeting|due|expected|upcoming|deadline|pending|to be|will)\b/i;
const DIRECT_CUE_RE = /\b(?:by|before|until)\s+(?:the\s+)?(?:end\s+of\s+|start\s+of\s+|early\s+|mid-?\s*|late\s+)?$/i;

/** The dated commitments in the text — a dated mention with a forward-looking cue before it. */
export function datedCommitments(text: string): DatedMention[] {
  const t = typeof text === "string" ? text : "";
  let from = 0;
  return datedMentions(t).filter((d) => {
    const at = t.indexOf(d.raw, from);
    if (at < 0) return false;
    from = at + d.raw.length;
    const before = t.slice(Math.max(0, at - CUE_SPAN), at);
    return SCHEDULING_CUE_RE.test(before) || DIRECT_CUE_RE.test(before);
  });
}

/** The dated commitments in the text that fall before the report date. */
export function pastDatedCommitments(text: string, asOf: Date | string | undefined): DatedMention[] {
  const cutoff = asOfIso(asOf);
  return datedCommitments(text).filter((d) => d.iso < cutoff);
}

/** "Q3 2025" / "Q3 2025 and 2024-11-30" — the tokens, quoted as recorded. */
export function pastDatesProse(mentions: readonly DatedMention[]): string {
  const raws = [...new Set(mentions.map((d) => d.raw))];
  if (raws.length === 0) return "";
  if (raws.length === 1) return raws[0];
  return `${raws.slice(0, -1).join(", ")} and ${raws[raws.length - 1]}`;
}
