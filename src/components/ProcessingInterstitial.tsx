import { useEffect, useState } from "react";

type ToolKey =
  | "lia" | "dpia" | "governance" | "biometric"
  | "cppa_risk" | "cppa_cyber" | "cppa_suite";

type ToolConfig = { label: string; etaText: string; etaSeconds: number; stages: string[] };

// etaSeconds is set ABOVE the observed median so the bar never undershoots.
// CONFIRMED from /admin/function-health: biometric 1m25s, dpia 1m42s, governance 2m10s, lia 4m32s.
// PLACEHOLDER (architecture estimates) — replace with measured medians: cppa_risk, cppa_cyber, cppa_suite.
const TOOLS: Record<ToolKey, ToolConfig> = {
  lia: {
    label: "Legitimate Interest Assessment",
    etaText: "about 4–5 minutes",
    etaSeconds: 300,
    stages: ["Classifying the processing activity", "Checking the enforcement corpus", "Running the three-part test", "Drafting documentation guidance", "Building your PDF"],
  },
  dpia: {
    label: "Impact Assessment",
    etaText: "about 2 minutes",
    etaSeconds: 140,
    stages: ["Assessing necessity & proportionality", "Checking enforcement precedents", "Identifying risks & safeguards", "Building your PDF"],
  },
  governance: {
    label: "Governance Assessment",
    etaText: "about 2–3 minutes",
    etaSeconds: 180,
    stages: ["Scoring governance domains", "Cross-checking enforcement patterns", "Synthesising findings", "Building your PDF"],
  },
  biometric: {
    label: "Biometric Compliance Assessment",
    etaText: "about 1–2 minutes",
    etaSeconds: 120,
    stages: ["Checking BIPA & state requirements", "Calculating exposure", "Drafting findings", "Building your PDF"],
  },
  // ---- PLACEHOLDER ETAs — confirm from /admin/function-health ----
  cppa_risk: {
    label: "CPPA Risk Assessment",
    etaText: "about 2–4 minutes",
    etaSeconds: 240,
    stages: ["Mapping CPPA obligations", "Assessing risk factors", "Drafting the assessment", "Building your PDF"],
  },
  cppa_cyber: {
    label: "CPPA Cybersecurity Readiness assessment",
    etaText: "about 2–4 minutes",
    etaSeconds: 240,
    stages: ["Checking the 18 control areas", "Identifying gaps", "Drafting the readiness report", "Building your PDF"],
  },
  cppa_suite: {
    label: "CPPA Suite report",
    etaText: "about 6–12 minutes",
    etaSeconds: 600,
    stages: ["Running scope analysis", "Risk assessment module", "Cybersecurity module", "Assembling the suite report"],
  },
};

const READY_ACTIONS = [
  "Download the full report as a PDF",
  "Review every flagged item with its regulatory citation",
  "See the enforcement precedents behind each finding",
  "Share it with your legal counsel",
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ProcessingInterstitial({
  tool,
  label: labelOverride,
  startedAt,
  slow = false,
  dpiaUnits,
}: {
  tool: ToolKey;
  label?: string;
  /**
   * ISO timestamp anchor for elapsed. Callers should pass the row's
   * `updated_at` (or `created_at` before dispatch) so the elapsed clock and
   * stage animation survive a refresh instead of resetting to 0:00.
   */
  startedAt: string;
  /**
   * When true, the "taking longer than expected" copy is shown regardless of
   * whether elapsed has crossed the tool's ETA. Driven by useGenerationStatus
   * once updated_at is > 10 minutes old.
   */
  slow?: boolean;
  /**
   * DPIA r1b2.3 sectioned-generation per-unit progress. When provided (only
   * meaningful for tool="dpia"), replaces the ETA-derived stage ladder with
   * the six D8-clean labels driven by `report_data._staging.units.*.status`.
   */
  dpiaUnits?: Record<string, { status?: string | null } | null | undefined>;

}) {
  const cfg = TOOLS[tool];

  // Compute elapsed against the server-provided anchor, not a tab-local
  // counter, so a refresh resumes the clock instead of implying a restart.
  const anchorMs = (() => {
    const t = Date.parse(startedAt);
    return Number.isFinite(t) ? t : Date.now();
  })();
  const [elapsed, setElapsed] = useState<number>(() =>
    Math.max(0, Math.floor((Date.now() - anchorMs) / 1000)),
  );

  useEffect(() => {
    // Recompute from the anchor on every tick — never `e => e + 1`, which
    // would drift and reset on remount.
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - anchorMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [anchorMs]);

  if (!cfg) {
    return (
      <div className="bg-card border rounded-lg p-10 text-center">
        <p className="text-muted-foreground">Generating your report…</p>
      </div>
    );
  }

  const label = labelOverride || cfg.label;

  // DPIA r1b2.3 per-unit ladder overrides the ETA-derived stages when the
  // sectioned-generation staging shape is present on the row. Labels are the
  // D8-clean set specified in the courier's UI §9.
  const dpiaLadder =
    tool === "dpia" && dpiaUnits
      ? (() => {
          const stages = [
            "Preparing shared context",
            "Description & metadata complete",
            "Analysis complete",
            "Necessity & proportionality complete",
            "Risk assessment complete",
            "Consistency check",
            "Finalising",
          ];
          const done = (k: string) => dpiaUnits[k]?.status === "done";
          const processing = (k: string) => dpiaUnits[k]?.status === "processing";
          let idx = 0;
          if (done("u1")) idx = 1;
          if (done("u2") && idx < 2) idx = 2;
          // parallel u1/u2/u3: reflect the furthest completed
          if (done("u1") && done("u2") && done("u3")) idx = Math.max(idx, 3);
          if (done("u4")) idx = 4;
          if (processing("u5")) idx = 5;
          if (done("u5")) idx = 6;
          return { stages, activeIdx: Math.min(idx, stages.length - 1), total: stages.length };
        })()
      : null;

  const stages = dpiaLadder?.stages ?? cfg.stages;
  const n = stages.length;
  const perStage = cfg.etaSeconds / n;
  const activeIdx = dpiaLadder ? dpiaLadder.activeIdx : Math.min(n - 1, Math.floor(elapsed / perStage));
  const overrun = slow || elapsed > cfg.etaSeconds;
  const pct = dpiaLadder
    ? Math.min(95, Math.round((activeIdx / n) * 100))
    : Math.min(95, Math.round((elapsed / cfg.etaSeconds) * 100));


  return (
    <div className="bg-card border rounded-lg p-8 sm:p-10 max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center">
        <svg className="animate-spin h-14 w-14 mb-4" viewBox="0 0 50 50" aria-hidden="true">
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted-foreground opacity-20" />
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="90 150" className="text-amber-500" />
        </svg>
        <h3 className="font-serif text-lg text-foreground mb-1">Building your {label}</h3>
        <p className="text-sm text-muted-foreground">
          {slow
            ? "This is taking longer than expected — we are still working on it."
            : overrun
              ? "Almost there — finalising your report…"
              : `This typically takes ${cfg.etaText}.`}{" "}
          <span className="tabular-nums">Elapsed {fmt(elapsed)}</span>
        </p>
      </div>

      <div className="mt-5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-amber-500 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-5 space-y-2">
        {stages.map((s, i) => {
          const done = i < activeIdx || (overrun && i < n - 1);
          const active = i === activeIdx && !done;
          return (
            <li key={s} className="flex items-center gap-2.5 text-sm">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-amber-500 text-amber-600" : "border-muted text-muted-foreground"}`}>
                {done ? (
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M7.5 13.4 4 9.9l1.4-1.4 2.1 2.1 5.1-5.1L14 6.9z" /></svg>
                ) : active ? (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span className={done ? "text-muted-foreground line-through decoration-muted-foreground/40" : active ? "text-foreground font-medium" : "text-muted-foreground"}>{s}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 p-4">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Worth the wait — this runs a full analysis against our enforcement-decision corpus, so the findings are grounded in what regulators actually penalise.
        </p>
        <p className="text-xs font-semibold text-foreground mt-3 mb-1.5">When your report is ready, you'll be able to:</p>
        <ul className="space-y-1">
          {READY_ACTIONS.map((a) => (
            <li key={a} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 text-amber-500" aria-hidden="true">→</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">You can safely leave this page — your report is saved to My Reports when it's done.</p>
      </div>
    </div>
  );
}
