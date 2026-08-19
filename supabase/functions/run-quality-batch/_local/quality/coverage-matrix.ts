// QB-P20 item 4 — Coverage matrix. Declarative sector × posture ×
// jurisdiction-branch matrix per tool. After validation, each accepted
// intake is tagged by cheap enum reads. Per-cell counts are accumulated
// in `quality_coverage_cells` (see migration). The digest surfaces
// never-hit cells as WARNINGS; no per-run enforcement.

export interface CoverageCell { sector: string; posture: string; branch: string }

export interface CoverageMatrix {
  sectors: string[];
  postures: string[];
  branches: string[];
  tagger: (intake: any) => CoverageCell;
}

const DEFAULT_POSTURES = ["strong", "mixed", "weak", "unknown"];
const DEFAULT_BRANCHES = ["eu", "uk", "us-ca", "us-multistate", "cross-border", "other"];

function jurBranch(js: unknown): string {
  const arr = Array.isArray(js) ? js.map(String) : typeof js === "string" ? [js] : [];
  const has = (p: RegExp) => arr.some(x => p.test(x));
  const eu = has(/EU|GDPR|Germany|France|Ireland|Sweden|Netherlands|Spain|Italy/i);
  const uk = has(/United Kingdom|UK GDPR/i);
  const ca = has(/California|CCPA|CPRA/i);
  const usMulti = has(/Texas|New York|Colorado|Virginia|Washington|Illinois|Other US State|Other US States/i);
  if (eu && uk) return "cross-border";
  if (eu) return "eu";
  if (uk) return "uk";
  if (ca) return "us-ca";
  if (usMulti) return "us-multistate";
  return "other";
}

function posture(intake: any): string {
  const j = JSON.stringify(intake ?? {}).toLowerCase();
  const weakSignals = ["no formal", "not tested", "no dpo", "no,", "unsure", "informal"];
  const strongSignals = ["continuous monitoring", "yes — verified", "tested in last", "formal dpo"];
  const w = weakSignals.filter(s => j.includes(s)).length;
  const s = strongSignals.filter(x => j.includes(x)).length;
  if (s >= 2 && w === 0) return "strong";
  if (w >= 2 && s === 0) return "weak";
  if (s === 0 && w === 0) return "unknown";
  return "mixed";
}

const sectorFrom = (intake: any): string =>
  String(intake?.sector ?? intake?.q3_sector ?? intake?.profile?.industry ?? intake?.organisationType ?? "Other")
    .slice(0, 80);

const DEFAULT_MATRIX: CoverageMatrix = {
  sectors: [
    "Technology/SaaS", "Healthcare/Life Sciences", "Financial services",
    "Retail/ecommerce", "Media/advertising", "HR/Employment", "Other",
  ],
  postures: DEFAULT_POSTURES,
  branches: DEFAULT_BRANCHES,
  tagger: (intake: any) => ({
    sector: sectorFrom(intake),
    posture: posture(intake),
    branch: jurBranch(intake?.jurisdictions ?? intake?.jurisdictions_list),
  }),
};

// Per-tool overrides — e.g. generate-dpa's 6 documentTypes as branches.
const DPA_MATRIX: CoverageMatrix = {
  ...DEFAULT_MATRIX,
  branches: ["c2p-eu", "c2p-uk", "c2p-us", "p2sp-onward", "p2c-reverse", "intra-group"],
  tagger: (intake: any) => {
    const cj = String(intake?.controllerJurisdiction ?? "");
    const pj = String(intake?.processorJurisdiction ?? "");
    let branch = "intra-group";
    if (/United Kingdom/i.test(cj) || /United Kingdom/i.test(pj)) branch = "c2p-uk";
    else if (/California|New York|Texas|United States/i.test(cj + pj)) branch = "c2p-us";
    else if (/Germany|France|Ireland|Spain|Italy|Netherlands|Sweden/i.test(cj + pj)) branch = "c2p-eu";
    return { sector: sectorFrom(intake), posture: posture(intake), branch };
  },
};

export const MATRIX_BY_TOOL: Record<string, CoverageMatrix> = {
  "dpa-generator": DPA_MATRIX,
};

export function matrixFor(tool: string): CoverageMatrix {
  return MATRIX_BY_TOOL[tool] ?? DEFAULT_MATRIX;
}

export function tagIntake(tool: string, intake: any): CoverageCell {
  return matrixFor(tool).tagger(intake);
}
