/**
 * IR REQUIRED FIELDS — deterministic existence check over the assembled
 * playbook.
 *
 * PROPOSAL 2026-08-11 §IR Playbook: three items were being *promised* by the
 * prose but only sometimes rendered — the computed notification deadline
 * ("computed in the timeline below"), the contractual-notification trigger,
 * and the application of containment / eradication / recovery to the actual
 * incident. Orchestration alone cannot see the omission, because the promise
 * reads like content.
 *
 * The prompts now require literal, greppable markers for each. This module
 * confirms the marker rendered AND carries substance after the colon. It is
 * pure text analysis — no model call, no mutation — and returns notes for
 * post_gen_lint so a missing field is visible to grader and reviewer instead
 * of shipping as a promise.
 */

export interface IrFieldFinding {
  code: "ir_required_field_missing" | "ir_forward_promise_unfulfilled";
  detail: string;
}

interface RequiredMarker {
  id: string;
  /** Matches the label; capture group 1 (when present) is the payload. */
  re: RegExp;
  /** Minimum characters of payload for the field to count as rendered. */
  minPayload: number;
}

const REQUIRED_MARKERS: RequiredMarker[] = [
  {
    id: "computed_deadline",
    re: /Computed deadline:\s*([^\n]*)/gi,
    minPayload: 4,
  },
  {
    id: "contractual_notification_trigger",
    re: /Contractual notification obligations\s*[—–-]\s*Triggered:\s*([^\n]*)/gi,
    minPayload: 2,
  },
  {
    id: "containment_applied",
    re: /Containment\s*[—–-]\s*applied to this incident:\s*([^\n]*)/gi,
    minPayload: 20,
  },
  {
    id: "eradication_applied",
    re: /Eradication\s*[—–-]\s*applied to this incident:\s*([^\n]*)/gi,
    minPayload: 20,
  },
  {
    id: "recovery_applied",
    re: /Recovery\s*[—–-]\s*applied to this incident:\s*([^\n]*)/gi,
    minPayload: 20,
  },
];

/** Forward references that must not stand in for the content itself. */
const FORWARD_PROMISE_RE =
  /\b(?:computed|calculated|set out|detailed|addressed|described|provided)\s+(?:in|below|elsewhere|later)\b[^\n.]{0,80}/gi;

const PLACEHOLDER_RE = /^(?:\[[^\]]*\]|n\/a|tbd|see above|see below|—|-)$/i;

export function checkIrRequiredFields(playbookText: string): IrFieldFinding[] {
  const text = String(playbookText ?? "");
  const findings: IrFieldFinding[] = [];
  if (text.trim().length === 0) return findings;

  for (const marker of REQUIRED_MARKERS) {
    const re = new RegExp(marker.re.source, marker.re.flags);
    let rendered = 0;
    let hollow = 0;
    let firstHollow = "";
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      rendered++;
      const payload = String(m[1] ?? "").trim();
      if (payload.length < marker.minPayload || PLACEHOLDER_RE.test(payload)) {
        hollow++;
        if (!firstHollow) firstHollow = m[0].slice(0, 120);
      }
    }
    if (rendered === 0) {
      findings.push({
        code: "ir_required_field_missing",
        detail: `${marker.id}: required labelled field never rendered in the assembled playbook`,
      });
    } else if (hollow === rendered) {
      findings.push({
        code: "ir_required_field_missing",
        detail: `${marker.id}: label rendered ${rendered}x but carries no substance — "${firstHollow}"`,
      });
    }
  }

  // A forward promise is only a defect when the thing promised never rendered:
  // the computed-deadline marker is the anchor the prose defers to.
  const hasComputedDeadline = /Computed deadline:\s*\S{4,}/i.test(text);
  if (!hasComputedDeadline) {
    const re = new RegExp(FORWARD_PROMISE_RE.source, FORWARD_PROMISE_RE.flags);
    const deadlinePromises: string[] = [];
    let pm: RegExpExecArray | null;
    while ((pm = re.exec(text)) !== null) {
      // Look at the sentence around the promise, not just the promise clause.
      const context = text.slice(Math.max(0, pm.index - 90), pm.index + pm[0].length + 20);
      if (/deadline|clock|notif/i.test(context)) deadlinePromises.push(pm[0]);
    }
    if (deadlinePromises.length > 0) {
      findings.push({
        code: "ir_forward_promise_unfulfilled",
        detail: `deadline deferred ${deadlinePromises.length}x with no "Computed deadline:" anywhere — first: "${deadlinePromises[0].trim().slice(0, 120)}"`,
      });
    }
  }

  return findings;
}
