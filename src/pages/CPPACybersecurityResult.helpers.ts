// CPPA Cybersecurity Result — presentation helpers extracted into a standalone
// module so shared components (BreachPrecedentMap, SampleToolReport) can
// import them without pulling the whole page module. The page re-exports
// these names, so external references stay valid.
//
// RC-FLIP-3 — extraction from src/pages/CPPACybersecurityResult.tsx to
// eliminate a page↔shared-component cycle (BreachPrecedentMap imported
// controlStatusColor back from the page).

export const readinessColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x.includes("critical")) return "bg-red-100 text-red-800";
  if (x.includes("material")) return "bg-orange-100 text-orange-800";
  if (x.includes("substantially")) return "bg-amber-100 text-amber-800";
  if (x.includes("audit-ready")) return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

export const controlStatusColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical gap") return "bg-red-100 text-red-800";
  if (x === "gap") return "bg-orange-100 text-orange-800";
  if (x === "partial") return "bg-amber-100 text-amber-800";
  if (x === "implemented") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
