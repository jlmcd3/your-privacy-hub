// supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts
//
// S-G3 (doc 80, 2026-08-27) — THE GOVERNANCE DETERMINIZATION (PN-G7's
// completion). CEO-ratifiable DETERMINATION TABLES over the intake's own
// enums replace the ten per-domain model calls, and a composed posture
// sentence replaces the synthesis call's executive-summary splice. Every
// cell below is a fixed sentence keyed to one enum answer — zero model
// calls, byte-deterministic, honest degradation for Unsure/absent answers.
//
// RATIFICATION STATUS: every sentence in this file is a CEO-ratification
// artifact drafted under the 2026-08-27 improvement grant, EXTRACTED from
// the domain prompts' own review criteria and the intake's enum labels —
// the S-G3 redline stop-point of doc 80 §9, delivered as built artifact +
// ledger entry per the delegated-ratification precedent. Ships DARK behind
// GOVERNANCE_DETERMINISTIC_ENABLED (default false; CEO flips at deploy).
//
// SHAPE CONTRACT: each finding matches the model fan-out's parsed shape
// (domain_id/domain_name/current_state/gap_description/severity/
// regulatory_basis/recommended_action/suggested_owner/suggested_timeline)
// so every downstream reader — the skeleton's domainProse, the crosswalk,
// the persistence schema — consumes it unchanged.

type Bag = Record<string, unknown>;

export interface TypedDomainFinding {
  readonly domain_id: number;
  readonly domain_name: string;
  readonly domain: string;
  readonly current_state: string;
  readonly gap_description: string | null;
  readonly severity: "Critical" | "High" | "Medium" | "Low" | "Compliant" | "Unresolved";
  readonly regulatory_basis: string;
  readonly recommended_action: string;
  readonly suggested_owner: string;
  readonly suggested_timeline: string;
}

export const GOVERNANCE_DOMAIN_TABLES_STAMP = "governance-domain-tables@s-g3-2026-08-27";

const s = (v: unknown): string => String(v ?? "").trim();
const ORG_TIMELINE = "timeline to be set by the organisation (this quarter is an illustrative target)";

interface Cell {
  readonly severity: TypedDomainFinding["severity"];
  readonly current_state: string;
  readonly gap_description: string | null;
  readonly recommended_action: string;
}

function finding(
  id: number, name: string, key: string, basis: string, owner: string, cell: Cell,
): TypedDomainFinding {
  return {
    domain_id: id, domain_name: name, domain: key,
    current_state: cell.current_state,
    gap_description: cell.gap_description,
    severity: cell.severity,
    regulatory_basis: basis,
    recommended_action: cell.recommended_action,
    suggested_owner: owner,
    suggested_timeline: ORG_TIMELINE,
  };
}

const UNRESOLVED = (topic: string, ask: string): Cell => ({
  severity: "Unresolved",
  current_state: `The company has not resolved ${topic} on the information provided.`,
  // DOC-81 G-4 (CEO wording) — covers both the absent answer and an
  // explicit "Unsure", which IS recorded but resolves nothing.
  gap_description: `The company's answers do not resolve this issue.`,
  recommended_action: ask,
});

// ── The ten tables ─────────────────────────────────────────────────────────

function toolInventory(intake: Bag): TypedDomainFinding {
  const v = s(intake.inventory_audit);
  const table: Record<string, Cell> = {
    "Yes — audited + formal approval process": {
      severity: "Compliant",
      current_state: "The company maintains a tool inventory that is audited and carries a formal approval process.",
      gap_description: null,
      recommended_action: "Keep the inventory audit cadence and record each new tool's approval before first use.",
    },
    "Inventory exists, no formal audit/approval": {
      severity: "Medium",
      current_state: "The company maintains a tool inventory without a formal audit or approval process.",
      gap_description: "Sanctioning is informal: a tool can enter use without a recorded approval, and drift from the inventory is not detected.",
      recommended_action: "Adopt a formal approval step for new tools and an audit cadence for the inventory, recording both (GDPR Art. 24(1); Art. 32(1)(d)).",
    },
    "No formal inventory": {
      severity: "High",
      current_state: "The company has answered that no formal tool inventory exists.",
      gap_description: "Without an inventory, the company cannot demonstrate which tools process personal data, which Art. 5(2) accountability presupposes.",
      recommended_action: "Build the tool inventory from the recorded tools list, then add approval and audit steps (GDPR Arts. 5(2), 24(1), 30).",
    },
  };
  return finding(1, "Tool Inventory and Sanctioning", "tool_inventory",
    "GDPR Arts. 5(2), 24(1), 30", "IT owner or DPO",
    table[v] ?? UNRESOLVED("whether a formal tool inventory exists", "Answer the inventory question: audited inventory, unaudited inventory, or none."));
}

function dataSubmission(intake: Bag): TypedDomainFinding {
  const v = s(intake.technical_controls);
  const special = s(intake.special_category) === "Yes";
  const specialTail = special
    ? " The recorded special categories raise the stakes of an uncontrolled submission (GDPR Art. 9)."
    : "";
  // 3E9AD759-G1 (2026-08-27, live batch 3e9ad759) — the recorded tools list
  // is NAMED in the partial-coverage cell (the batch document said "some
  // tools" while the record named Microsoft 365 / Copilot, Salesforce +
  // Einstein, Grammarly and Zoom). The answers do not structure per-tool
  // coverage, and the clause says so rather than guessing which are covered.
  const toolsList = (Array.isArray(intake.tools) ? intake.tools : []).map((t) => s(t)).filter(Boolean);
  const toolsTail = toolsList.length
    ? ` The tools the company has recorded in use are ${toolsList.join(", ")}; the answers do not state which of them the enforced controls cover, so the extension step starts from that list.`
    : "";
  const table: Record<string, Cell> = {
    "Yes — DLP/content filtering actively enforced": {
      severity: "Compliant",
      current_state: "Technical controls (DLP or content filtering) are actively enforced against uncontrolled submission of personal data to external tools.",
      gap_description: null,
      recommended_action: "Keep the control coverage aligned with the tools list as it changes.",
    },
    "Partial — some tools or categories": {
      severity: "Medium",
      current_state: "Technical controls are enforced for some tools or data categories only." + specialTail,
      gap_description: "Submissions through the uncovered tools or categories rest on policy and training alone." + toolsTail,
      recommended_action: "Extend the enforced controls to the uncovered tools and categories, prioritising any that touch special categories (GDPR Arts. 25(1), 32(1)).",
    },
    "No — policy and training only": {
      severity: special ? "High" : "Medium",
      current_state: "No technical controls enforce the submission rules; the company relies on policy and training alone." + specialTail,
      gap_description: "A policy without enforcement leaves uncontrolled submission a single mistake away.",
      recommended_action: "Introduce enforced technical controls (DLP rules, content filtering, or endpoint upload restrictions) for the tools that process personal data (GDPR Arts. 25(1), 32(1)).",
    },
  };
  return finding(2, "Data Submission Risk", "data_submission",
    special ? "GDPR Arts. 9, 25(1), 32(1)" : "GDPR Arts. 25(1), 32(1)", "IT owner",
    table[v] ?? UNRESOLVED("whether technical controls enforce the submission rules", "Answer the technical-controls question: enforced, partial, or policy-and-training only."));
}

function vendorTerms(intake: Bag): TypedDomainFinding {
  const dpa = s(intake.dpa_status);
  const verified = s(intake.dpa_art28_verified);
  const verifiedTail: Record<string, string> = {
    "Yes — verified": " The Art. 28(3) terms are recorded as verified.",
    "Partially": " The Art. 28(3) terms are recorded as only partially verified.",
    "Not verified": " The Art. 28(3) terms are recorded as not verified.",
    "Unsure": " Whether the Art. 28(3) terms were verified is not resolved on the information provided.",
  };
  const tail = verifiedTail[verified] ?? "";
  const table: Record<string, Cell> = {
    "Yes, all vendors": {
      severity: verified === "Yes — verified" ? "Compliant" : "Low",
      current_state: "Processing agreements are in place with all vendors." + tail,
      gap_description: verified === "Yes — verified" ? null : "A signed agreement whose Art. 28(3) terms are unverified may omit a required clause.",
      recommended_action: verified === "Yes — verified"
        ? "Keep the verification current as vendor terms change."
        : "Verify each agreement against the Article 28(3) required terms and record the check (GDPR Art. 28(3)).",
    },
    "Most vendors": {
      severity: "Medium",
      current_state: "Processing agreements are in place with most, but not all, vendors." + tail,
      gap_description: "Each uncovered vendor processes personal data without the contract Article 28(3) requires.",
      recommended_action: "Close the gap vendor by vendor: execute an Art. 28(3)-conformant agreement with each uncovered vendor before further processing (GDPR Art. 28(3)).",
    },
    "Some vendors": {
      severity: "High",
      current_state: "Processing agreements are in place with only some vendors." + tail,
      gap_description: "A substantial share of vendors process personal data without the contract Article 28(3) requires.",
      recommended_action: "Inventory the uncovered vendors and execute Art. 28(3)-conformant agreements, prioritising vendors handling the largest volumes or special categories (GDPR Art. 28(3)).",
    },
    "No": {
      severity: "Critical",
      current_state: "The company has answered that no vendor processing agreements are in place." + tail,
      gap_description: "Every vendor engagement lacks the contract Article 28(3) makes mandatory.",
      recommended_action: "Execute an Art. 28(3)-conformant processing agreement with every vendor that processes personal data; until then, restrict what those tools receive (GDPR Art. 28(3)).",
    },
  };
  return finding(3, "Vendor Data Terms Compliance", "vendor_terms",
    "GDPR Art. 28(3)", "Legal owner or DPO",
    table[dpa] ?? UNRESOLVED("the processing-agreement position", "Answer the DPA-status question: all, most, some, or no vendors covered."));
}

function internalPolicy(intake: Bag): TypedDomainFinding {
  const v = s(intake.tool_instruction);
  const table: Record<string, Cell> = {
    "Yes, written policy with specific prohibitions": {
      severity: "Compliant",
      current_state: "A written policy with specific prohibitions governs how employees use the tools that process personal data.",
      gap_description: null,
      recommended_action: "Review the policy against the current tools list on a recorded cadence.",
    },
    "Verbal guidance only": {
      severity: "Medium",
      current_state: "Employee instruction on tool use is verbal only; no written policy is recorded.",
      gap_description: "Verbal guidance cannot be evidenced, which Art. 5(2) accountability requires, and cannot be enforced consistently.",
      recommended_action: "Reduce the guidance to a written policy with specific prohibitions and circulate it for acknowledgement (GDPR Arts. 5(2), 24(1)-(2)).",
    },
    "No instruction provided": {
      severity: "High",
      current_state: "The company has answered that no instruction on tool use is provided to employees.",
      gap_description: "Employees decide unaided what personal data may enter which tool.",
      recommended_action: "Issue a written tool-use policy naming the prohibited data categories per tool, and pair it with the training domain's actions (GDPR Arts. 5(2), 24(1)-(2), 32(4)).",
    },
  };
  return finding(4, "Internal Policy Coverage", "internal_policy",
    "GDPR Arts. 5(2), 24(1)-(2), 32(4)", "Policy owner or DPO",
    table[v] ?? UNRESOLVED("the internal-policy position", "Answer the tool-instruction question: written policy, verbal only, or none."));
}

function training(intake: Bag): TypedDomainFinding {
  const v = s(intake.training_status);
  const ai = s(intake.training_ai_coverage);
  // 3E9AD759-G1 — the AI-coverage tails name the recorded tools, so the
  // finding reads on THIS record's tools rather than "the AI tools".
  const trainingTools = (Array.isArray(intake.tools) ? intake.tools : []).map((t) => s(t)).filter(Boolean);
  const toolsPhrase = trainingTools.length ? ` (the recorded tools: ${trainingTools.join(", ")})` : "";
  const aiTail: Record<string, string> = {
    "Yes — explicitly covers AI tools": " The training is recorded as explicitly covering AI tools.",
    "Generally covers data handling": ` The training covers data handling generally rather than the AI tools specifically${toolsPhrase}.`,
    "No — not AI-specific": ` The training is recorded as not covering the AI tools${toolsPhrase}.`,
    "Unsure": " Whether the training covers the AI tools is not resolved on the information provided.",
  };
  const tail = aiTail[ai] ?? "";
  const table: Record<string, Cell> = {
    "Yes, formal onboarding + annual refresh": {
      severity: ai === "Yes — explicitly covers AI tools" || !tail ? "Compliant" : "Low",
      current_state: "Employees receive formal onboarding training with an annual refresh." + tail,
      // DOC-81 G-5 — a Low finding names its gap: general data-handling
      // coverage leaves the AI tools unaddressed.
      gap_description: ai === "No — not AI-specific"
        ? "The AI tools in use are outside the training's coverage."
        : ai === "Generally covers data handling"
        ? "The training covers data handling generally; the AI tools in use are not separately addressed."
        : null,
      recommended_action: ai === "No — not AI-specific"
        ? "Extend the training to cover the AI tools in use and their prohibited-submission rules (GDPR Arts. 32(4), 39(1)(b))."
        : "Keep the annual refresh aligned with the tools list as it changes.",
    },
    "Yes, onboarding only": {
      severity: "Medium",
      current_state: "Employees receive onboarding training only; no periodic refresher is recorded." + tail,
      gap_description: "Awareness decays without a refresh cadence, and new tools enter use untrained.",
      recommended_action: "Add a periodic refresher covering the current tools list and the prohibited-submission rules (GDPR Arts. 32(4), 39(1)(b)).",
    },
    "Ad hoc only": {
      severity: "Medium",
      current_state: "Training happens ad hoc only." + tail,
      gap_description: "Coverage is uneven and cannot be evidenced per employee.",
      recommended_action: "Formalise onboarding training plus a refresher cadence, recording completion (GDPR Arts. 32(4), 39(1)(b)).",
    },
    "No formal training": {
      severity: "High",
      current_state: "The company has answered that no formal training is provided." + tail,
      gap_description: "Employees using the tools have no instructed baseline for what may be submitted.",
      recommended_action: "Introduce onboarding training on personal-data handling in the recorded tools, then a refresher cadence (GDPR Arts. 32(4), 39(1)(b)).",
    },
  };
  return finding(5, "Employee Training and Awareness", "training",
    "GDPR Arts. 32(4), 39(1)(b)", "HR or the DPO",
    table[v] ?? UNRESOLVED("the training position", "Answer the training-status question: formal with refresh, onboarding only, ad hoc, or none."));
}

function incidentResponse(intake: Bag): TypedDomainFinding {
  const v = s(intake.incident_response);
  const table: Record<string, Cell> = {
    "Yes, tested in last 12 months": {
      severity: "Compliant",
      current_state: "An incident response plan exists and was tested within the last 12 months.",
      gap_description: null,
      recommended_action: "Keep the test cadence, and confirm the plan treats data exposure through external tools as a notifiable-breach scenario.",
    },
    "Yes, but not tested": {
      severity: "Medium",
      current_state: "An incident response plan exists but has not been tested.",
      gap_description: "An untested plan may fail exactly when the Art. 33(1) 72-hour clock is running.",
      recommended_action: "Test the plan against a tool-exposure scenario and record the result (GDPR Arts. 33(1), 32(1)(d)).",
    },
    "Documented but informal": {
      severity: "Medium",
      current_state: "Incident response is documented but informal.",
      gap_description: "Informal procedure leaves the notification timeline and vendor contacts unowned.",
      recommended_action: "Formalise the plan: notification timelines, vendor contact procedures, and the regulatory reporting triggers, then test it (GDPR Arts. 33, 34).",
    },
    "No": {
      severity: "High",
      current_state: "The company has answered that no incident response plan exists.",
      gap_description: "A breach through an external tool would be handled without a plan while the Art. 33(1) 72-hour window runs.",
      recommended_action: "Adopt an incident response plan covering tool-exposure scenarios, notification timelines and reporting triggers, then test it (GDPR Arts. 33, 34).",
    },
  };
  return finding(6, "Incident Response and Breach Readiness", "incident_response",
    "GDPR Arts. 33, 34", "Security owner or DPO",
    table[v] ?? UNRESOLVED("the incident-response position", "Answer the incident-response question: tested plan, untested plan, informal, or none."));
}

function regulatoryExposure(intake: Bag): TypedDomainFinding {
  const jl = (Array.isArray(intake.jurisdictions) ? intake.jurisdictions : []).map((j) => s(j)).filter(Boolean);
  const euUk = jl.some((j) => /GDPR/i.test(j));
  const special = s(intake.special_category) === "Yes";
  const frameworks = jl.length ? jl.join(", ") : "no recorded jurisdictions";
  return finding(7, "Regulatory Exposure Summary", "regulatory_exposure",
    euUk ? "GDPR / UK GDPR as recorded per jurisdiction" : "the recorded jurisdictions' own frameworks",
    "Legal owner",
    {
      severity: jl.length === 0 ? "Unresolved" : special && euUk ? "Medium" : "Low",
      current_state: `The recorded jurisdictions are: ${frameworks}.` + (special && euUk ? " Special categories are recorded, engaging Article 9 within the GDPR-family scope." : ""),
      gap_description: jl.length === 0 ? "No jurisdiction is recorded, so the exposure cannot be mapped." : null,
      recommended_action: jl.length === 0
        ? "Record the jurisdictions whose law the processing engages."
        : "Treat each recorded jurisdiction's framework as in scope for the domains above; the number of applicable frameworks equals the number of recorded jurisdictions.",
    });
}

function dpiaStatus(intake: Bag): TypedDomainFinding {
  const v = s(intake.dpia_status);
  const ai = s(intake.dpia_ai_coverage);
  const aiTail: Record<string, string> = {
    "Yes — all AI/high-risk tools assessed": " The AI and high-risk tools are recorded as assessed.",
    "Some covered": " Only some of the AI and high-risk tools are recorded as assessed.",
    "No — not for AI tools": " The AI tools are recorded as not assessed.",
    "Unsure": " Whether the AI tools are assessed is not resolved on the information provided.",
  };
  const tail = aiTail[ai] ?? "";
  const table: Record<string, Cell> = {
    "Yes, multiple DPIAs completed": {
      severity: ai === "No — not for AI tools" ? "Medium" : "Compliant",
      current_state: "Multiple DPIAs are recorded as completed." + tail,
      gap_description: ai === "No — not for AI tools" ? "The AI tools in use fall outside the completed assessments." : null,
      recommended_action: ai === "No — not for AI tools"
        ? "Screen the AI tools against the Art. 35(1) high-risk threshold and assess those that meet it (GDPR Art. 35(1))."
        : "Keep the assessments current as the processing changes (GDPR Art. 35(11)).",
    },
    "Yes, one DPIA completed": {
      severity: "Low",
      current_state: "One DPIA is recorded as completed." + tail,
      gap_description: "Whether the remaining processing activities meet the Art. 35(1) threshold has not been screened on the information provided.",
      recommended_action: "Screen the remaining activities, the AI tools first, against the Art. 35(1) high-risk threshold (GDPR Art. 35(1)).",
    },
    "No, none conducted": {
      severity: "High",
      current_state: "The company has answered that no DPIA has been conducted." + tail,
      gap_description: "Processing that meets the Art. 35(1) high-risk threshold would be running unassessed.",
      recommended_action: "Screen the recorded processing, the AI tools first, against the Art. 35(1) threshold and conduct a DPIA where it is met (GDPR Art. 35(1)).",
    },
    "Unsure": UNRESOLVED("the DPIA position", "Answer the DPIA-status question: multiple, one, or none conducted."),
  };
  return finding(8, "Privacy Impact Assessment Status", "dpia_status",
    "GDPR Art. 35(1)", "The DPO or privacy owner",
    table[v] ?? UNRESOLVED("the DPIA position", "Answer the DPIA-status question: multiple, one, or none conducted."));
}

function subjectRights(intake: Bag): TypedDomainFinding {
  const v = s(intake.dsr_capability);
  const table: Record<string, Cell> = {
    "Yes — documented and tested across all vendors": {
      severity: "Compliant",
      current_state: "The data subject rights process is documented and tested across all vendors.",
      gap_description: null,
      recommended_action: "Keep the vendor coverage current as tools change.",
    },
    "Documented but not tested": {
      severity: "Medium",
      current_state: "The rights process is documented but has not been tested.",
      gap_description: "An untested process may miss the one-month response clock when a real request lands.",
      recommended_action: "Test the process end to end for at least access and erasure, through each vendor that holds personal data (GDPR Arts. 12(3), 15, 17).",
    },
    "Ad hoc / not documented": {
      severity: "High",
      current_state: "Rights requests are handled ad hoc; no documented process is recorded.",
      gap_description: "The company cannot show how a request travels to each vendor and back within the statutory window.",
      recommended_action: "Document the request path per vendor and the response clock, then test it (GDPR Arts. 12(3), 15-22, 28(3)(e)).",
    },
    "No process in place": {
      severity: "High",
      current_state: "The company has answered that no rights process is in place.",
      gap_description: "A request received today has no path to a compliant answer.",
      recommended_action: "Stand up the request process — intake channel, identity check, vendor path, response clock — and document it (GDPR Arts. 12(3), 15-22, 28(3)(e)).",
    },
    "Unsure": UNRESOLVED("the rights-process position", "Answer the rights-capability question: tested, documented-untested, ad hoc, or none."),
  };
  return finding(9, "Data Subject Rights Integrity", "subject_rights",
    "GDPR Arts. 12(3), 15-22, 28(3)(e)", "Privacy owner or DPO",
    table[v] ?? UNRESOLVED("the rights-process position", "Answer the rights-capability question: tested, documented-untested, ad hoc, or none."));
}

function privacyNotice(intake: Bag): TypedDomainFinding {
  const v = s(intake.privacy_policy);
  const coverage = s(intake.privacy_notice_coverage);
  const covTail = coverage ? ` Coverage is recorded as: ${coverage}.` : "";
  const table: Record<string, Cell> = {
    "Yes, current (reviewed in last 12 months)": {
      severity: /all current activities/i.test(coverage) || !coverage ? "Compliant" : "Low",
      current_state: "A privacy notice exists and was reviewed within the last 12 months." + covTail,
      gap_description: /all current activities/i.test(coverage) || !coverage ? null : "The recorded coverage falls short of all current activities, transfers, retention and rights.",
      recommended_action: /all current activities/i.test(coverage) || !coverage
        ? "Keep the notice aligned with the tools and transfers as they change (GDPR Arts. 12-14)."
        : "Extend the notice to the uncovered activities, transfers, retention and rights content (GDPR Arts. 12-14).",
    },
    "Yes, but outdated": {
      severity: "Medium",
      current_state: "A privacy notice exists but is recorded as outdated." + covTail,
      gap_description: "An outdated notice misdescribes the current processing, which Arts. 12-14 do not permit.",
      recommended_action: "Update the notice to the current tools, transfers and retention position, and set a review cadence (GDPR Arts. 12-14).",
    },
    "No": {
      severity: "High",
      current_state: "The company has answered that no privacy notice exists.",
      gap_description: "The transparency information Arts. 13-14 require is not provided at all.",
      recommended_action: "Publish a privacy notice covering the recorded activities, transfers, retention and rights (GDPR Arts. 12-14).",
    },
  };
  return finding(10, "Privacy Notice and Transparency", "privacy_notice",
    "GDPR Arts. 12-14", "Privacy owner",
    table[v] ?? UNRESOLVED("the privacy-notice position", "Answer the privacy-policy question: current, outdated, or none."));
}

// ── The builder + the executive posture sentence ───────────────────────────

export function buildDomainFindingsTyped(intake: Bag): Record<string, TypedDomainFinding> {
  const list = [
    toolInventory(intake), dataSubmission(intake), vendorTerms(intake),
    internalPolicy(intake), training(intake), incidentResponse(intake),
    regulatoryExposure(intake), dpiaStatus(intake), subjectRights(intake),
    privacyNotice(intake),
  ];
  return Object.fromEntries(list.map((f) => [f.domain, f]));
}

/**
 * The deterministic executive posture sentence — replaces the synthesis
 * model call's executive_summary splice on the deterministic path. Bound to
 * the typed findings alone; the 403-A one-voice law holds because the lead
 * above it already binds to the readiness rating.
 */
export function composeExecutiveSummaryTyped(findings: Record<string, TypedDomainFinding>): string {
  const all = Object.values(findings);
  const adverse = all.filter((f) => f.severity === "High" || f.severity === "Critical");
  const unresolved = all.filter((f) => f.severity === "Unresolved");
  const clean = all.filter((f) => f.severity === "Compliant");
  // DOC-81 G-2 — Medium/Low findings with a recorded gap are repairs, not
  // maintenance; the all-clear sentence may not fire over them.
  const flagged = all.filter((f) =>
    (f.severity === "Medium" || f.severity === "Low") && f.gap_description);
  const parts: string[] = [];
  parts.push(`Across the ten governance domains, the company's answers leave ${clean.length === 0 ? "none" : clean.length} of the ten fully evidenced.`);
  if (adverse.length > 0) {
    parts.push(`The domains requiring action first are: ${adverse.map((f) => f.domain_name).join("; ")}.`);
  }
  if (flagged.length > 0) {
    parts.push(`${flagged.length === 1 ? "One domain carries a recorded gap" : `${flagged.length} domains carry recorded gaps`} below the immediate-priority threshold; the actions are set out in Section III.`);
  }
  if (unresolved.length > 0) {
    parts.push(`${unresolved.length === 1 ? "One domain remains" : `${unresolved.length} domains remain`} unresolved on the information provided.`);
  }
  if (adverse.length === 0 && unresolved.length === 0 && flagged.length === 0) {
    parts.push("No domain requires immediate remediation on the company's answers; the actions recorded per domain are maintenance, not repair.");
  }
  return parts.join(" ");
}
