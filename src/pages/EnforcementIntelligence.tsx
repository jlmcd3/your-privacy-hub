import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ExternalLink, Filter, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EnforcementStats from "@/components/enforcement/EnforcementStats";

interface Row {
  id: string;
  regulator: string;
  subject: string | null;
  jurisdiction: string;
  decision_date: string | null;
  fine_eur: number | null;
  fine_eur_equivalent: number | null;
  industry_sector: string | null;
  data_categories: string[] | null;
  violation_types: string[] | null;
  precedent_significance: number | null;
  key_compliance_failure: string | null;
  source_url: string | null;
  law: string | null;
}

const PAGE_SIZE = 25;

const DATA_CATEGORIES = [
  "health", "children", "employment", "behavioral", "financial",
  "communications", "location", "biometric", "other",
];

const VIOLATION_TYPES = [
  "unlawful processing", "insufficient legal basis", "security failure",
  "transparency", "SAR failure", "children's data", "data minimization",
  "retention", "breach notification", "DPO failure", "DPIA missing",
  "data transfer", "cookie consent",
];

const SIGNIFICANCE = [
  { value: "any", label: "Any significance" },
  { value: "5", label: "★★★★★ Landmark" },
  { value: "4", label: "★★★★ High" },
  { value: "3", label: "★★★ Moderate" },
  { value: "2", label: "★★ Low" },
  { value: "1", label: "★ Routine" },
];

function formatEur(n: number | null) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
}

function Stars({ n }: { n: number | null }) {
  if (!n) return <span className="text-muted-foreground text-xs">—</span>;
  return <span className="text-amber-500 text-xs tracking-tight">{"★".repeat(n)}<span className="text-muted-foreground/40">{"★".repeat(5 - n)}</span></span>;
}

export default function EnforcementIntelligence() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  const q = params.get("q") ?? "";
  const jurisdiction = params.get("jurisdiction") ?? "all";
  const sector = params.get("sector") ?? "all";
  const dataCat = params.get("data_category") ?? "all";
  const violation = params.get("violation") ?? "all";
  const significance = params.get("significance") ?? "any";
  const page = parseInt(params.get("page") ?? "0");

  // Load filter options once
  useEffect(() => {
    (async () => {
      const { data: jdata } = await supabase
        .from("enforcement_actions")
        .select("jurisdiction")
        .not("jurisdiction", "is", null)
        .limit(5000);
      const counts = new Map<string, number>();
      (jdata ?? []).forEach((r: any) => {
        const k = String(r.jurisdiction).trim();
        if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      setJurisdictions([...counts.entries()].filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]).map(([k]) => k));

      const { data: sdata } = await supabase
        .from("enforcement_actions")
        .select("industry_sector")
        .not("industry_sector", "is", null)
        .limit(5000);
      const sc = new Map<string, number>();
      (sdata ?? []).forEach((r: any) => {
        const k = String(r.industry_sector).trim();
        if (k) sc.set(k, (sc.get(k) ?? 0) + 1);
      });
      setSectors([...sc.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k));
    })();
  }, []);

  // Query rows
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("enforcement_actions")
        .select(
          "id,regulator,subject,jurisdiction,decision_date,fine_eur,fine_eur_equivalent,industry_sector,data_categories,violation_types,precedent_significance,key_compliance_failure,source_url,law",
          { count: "exact" }
        )
        .eq("enrichment_version", 1);

      if (jurisdiction !== "all") query = query.eq("jurisdiction", jurisdiction);
      if (sector !== "all") query = query.eq("industry_sector", sector);
      if (dataCat !== "all") query = query.contains("data_categories", [dataCat]);
      if (violation !== "all") query = query.contains("violation_types", [violation]);
      if (significance !== "any") query = query.gte("precedent_significance", parseInt(significance));
      if (q.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or(`subject.ilike.${like},violation.ilike.${like},key_compliance_failure.ilike.${like}`);
      }

      query = query.order("decision_date", { ascending: false, nullsFirst: false })
        .order("precedent_significance", { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count: c, error } = await query;
      if (cancelled) return;
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setCount(c ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [q, jurisdiction, sector, dataCat, violation, significance, page]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all" || value === "any" || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (jurisdiction !== "all") list.push({ key: "jurisdiction", label: jurisdiction });
    if (sector !== "all") list.push({ key: "sector", label: sector });
    if (dataCat !== "all") list.push({ key: "data_category", label: dataCat });
    if (violation !== "all") list.push({ key: "violation", label: violation });
    if (significance !== "any") list.push({ key: "significance", label: `≥${significance}★` });
    if (q) list.push({ key: "q", label: `"${q}"` });
    return list;
  }, [jurisdiction, sector, dataCat, violation, significance, q]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Enforcement Forecast Intelligence — Privacy Fines & Decisions Database</title>
        <meta name="description" content="Search and filter 3,700+ privacy enforcement actions worldwide. Filter by jurisdiction, sector, data category, violations, and precedent significance." />
        <link rel="canonical" href="https://enduserprivacy.com/enforcement-intelligence" />
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl mb-3">Enforcement Forecast Intelligence</h1>
          <p className="text-muted-foreground max-w-3xl">
            Search {count.toLocaleString()} enriched privacy enforcement actions from regulators worldwide. Filter by jurisdiction,
            sector, data category, violation type, and precedent significance.
          </p>
        </header>

        {/* Companion card → Your Regulatory Watchlist */}
        <Link
          to="/horizon"
          className="group mb-6 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 no-underline transition-colors hover:bg-muted/60"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Forecast view</span>
            <span className="text-sm text-foreground truncate">
              <span className="font-semibold">Your Regulatory Watchlist</span>
              <span className="text-muted-foreground"> — Forward signals synthesized from these actions</span>
            </span>
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors shrink-0">→</span>
        </Link>

        {/* Summary stats — respect active filters */}
        <EnforcementStats
          filters={{ q, jurisdiction, sector, dataCat, violation, significance }}
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" /> Filters
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subject, violation, or key failure…"
                defaultValue={q}
                onKeyDown={(e) => { if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value); }}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={jurisdiction} onValueChange={(v) => setParam("jurisdiction", v)}>
                <SelectTrigger><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All jurisdictions</SelectItem>
                  {jurisdictions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={sector} onValueChange={(v) => setParam("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectors.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={dataCat} onValueChange={(v) => setParam("data_category", v)}>
                <SelectTrigger><SelectValue placeholder="Data category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All data categories</SelectItem>
                  {DATA_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={violation} onValueChange={(v) => setParam("violation", v)}>
                <SelectTrigger><SelectValue placeholder="Violation type" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All violations</SelectItem>
                  {VIOLATION_TYPES.map((v) => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={significance} onValueChange={(v) => setParam("significance", v)}>
                <SelectTrigger><SelectValue placeholder="Significance" /></SelectTrigger>
                <SelectContent>
                  {SIGNIFICANCE.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Active:</span>
                {activeFilters.map((f) => (
                  <Badge key={f.key} variant="secondary" className="gap-1 capitalize">
                    {f.label}
                    <button onClick={() => setParam(f.key, "")} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>Clear all</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-3 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${count.toLocaleString()} actions • Page ${page + 1} of ${Math.max(1, totalPages)}`}
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            : rows.length === 0
              ? <Card><CardContent className="p-8 text-center text-muted-foreground">No enforcement actions match your filters.</CardContent></Card>
              : rows.map((r) => (
                  <Link key={r.id} to={`/enforcement-intelligence/${r.id}`} className="block group">
                    <Card className="transition hover:border-primary/40 hover:shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">{r.jurisdiction}</span>
                              <span>•</span>
                              <span>{r.regulator}</span>
                              {r.decision_date && <><span>•</span><span>{new Date(r.decision_date).toLocaleDateString()}</span></>}
                            </div>
                            <h3 className="font-semibold text-base group-hover:text-primary transition line-clamp-2">
                              {r.subject || "Undisclosed entity"}
                            </h3>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-semibold">{formatEur(r.fine_eur_equivalent ?? r.fine_eur)}</div>
                            <Stars n={r.precedent_significance} />
                          </div>
                        </div>

                        {r.key_compliance_failure && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{r.key_compliance_failure}</p>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {r.industry_sector && <Badge variant="outline" className="capitalize text-xs">{r.industry_sector}</Badge>}
                          {(r.violation_types ?? []).slice(0, 3).map((v) => (
                            <Badge key={v} variant="secondary" className="capitalize text-xs">{v}</Badge>
                          ))}
                          {(r.data_categories ?? []).slice(0, 3).map((c) => (
                            <Badge key={c} className="capitalize text-xs bg-primary/10 text-primary hover:bg-primary/20">{c}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" disabled={page === 0} onClick={() => setParam("page", String(page - 1))}>← Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setParam("page", String(page + 1))}>Next →</Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
