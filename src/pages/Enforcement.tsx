import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Filter, LogIn, Lock, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EnforcementStats from "@/components/enforcement/EnforcementStats";
import InFeedAd from "@/components/InFeedAd";
import { AD_SLOTS, GOOGLE_AD_CLIENT } from "@/config/adSlots";
import { toast } from "sonner";

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
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
}

function Stars({ n }: { n: number | null }) {
  if (!n) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="text-amber-500 text-xs tracking-tight">
      {"★".repeat(n)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default function Enforcement() {
  const [params, setParams] = useSearchParams();
  const { isPremium, isLoading: authLoading } = usePremiumStatus();

  const view = (params.get("view") ?? "recent") as "recent" | "archive";
  const q = params.get("q") ?? "";
  const jurisdiction = params.get("jurisdiction") ?? "all";
  const sector = params.get("sector") ?? "all";
  const dataCat = params.get("data_category") ?? "all";
  const violation = params.get("violation") ?? "all";
  const significance = params.get("significance") ?? "any";
  const page = parseInt(params.get("page") ?? "0");

  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [archiveError, setArchiveError] = useState<
    | { kind: "auth" | "premium" | "other"; message: string }
    | null
  >(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  // Load filter options once (from public 60-day window)
  useEffect(() => {
    (async () => {
      const { data: jdata } = await supabase
        .from("enforcement_actions")
        .select("jurisdiction")
        .not("jurisdiction", "is", null)
        .limit(2000);
      const counts = new Map<string, number>();
      (jdata ?? []).forEach((r: any) => {
        const k = String(r.jurisdiction).trim();
        if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      setJurisdictions(
        [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k)
      );

      const { data: sdata } = await supabase
        .from("enforcement_actions")
        .select("industry_sector")
        .not("industry_sector", "is", null)
        .limit(2000);
      const sc = new Map<string, number>();
      (sdata ?? []).forEach((r: any) => {
        const k = String(r.industry_sector).trim();
        if (k) sc.set(k, (sc.get(k) ?? 0) + 1);
      });
      setSectors([...sc.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k));
    })();
  }, []);

  // Query rows based on view
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setArchiveError(null);

    (async () => {
      // Archive view: premium-only via edge function
      if (view === "archive") {
        if (!isPremium) {
          setRows([]);
          setCount(0);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke(
          "get-enforcement-archive",
          {
            body: {
              q,
              jurisdiction,
              sector,
              data_category: dataCat,
              violation,
              significance,
              page,
              pageSize: PAGE_SIZE,
              includeRecent: true, // archive view = full history
            },
          }
        );

        if (cancelled) return;
        if (error || !data) {
          // FunctionsHttpError exposes .context.response with the HTTP status
          const status: number | undefined =
            (error as any)?.context?.response?.status ??
            (error as any)?.status;
          if (status === 401) {
            const msg =
              "Your session has expired. Please sign in again to access the archive.";
            setArchiveError({ kind: "auth", message: msg });
            toast.error("Sign-in required", {
              description: msg,
              action: {
                label: "Sign in",
                onClick: () => {
                  window.location.href = `/login?redirect=${encodeURIComponent(
                    "/enforcement?view=archive"
                  )}`;
                },
              },
            });
          } else if (status === 403) {
            const msg =
              "A Premium subscription is required to search the full historical archive.";
            setArchiveError({ kind: "premium", message: msg });
            toast.error("Premium required", {
              description: msg,
              action: {
                label: "Upgrade",
                onClick: () => {
                  window.location.href = "/subscribe";
                },
              },
            });
          } else {
            const msg =
              error?.message ??
              "Unable to load the archive right now. Please try again.";
            setArchiveError({ kind: "other", message: msg });
            toast.error("Couldn't load the archive", {
              description: msg,
              action: {
                label: "Try again",
                onClick: () => setRetryNonce((n) => n + 1),
              },
            });
          }
          setRows([]);
          setCount(0);
        } else {
          setRows((data.rows as Row[]) ?? []);
          setCount(data.count ?? 0);
        }
        setLoading(false);
        return;
      }

      // Recent view: direct query against the public 60-day window
      let query = supabase
        .from("enforcement_actions")
        .select(
          "id,regulator,subject,jurisdiction,decision_date,fine_eur,fine_eur_equivalent,industry_sector,data_categories,violation_types,precedent_significance,key_compliance_failure,source_url,law",
          { count: "exact" }
        );

      if (jurisdiction !== "all") query = query.eq("jurisdiction", jurisdiction);
      if (sector !== "all") query = query.eq("industry_sector", sector);
      if (dataCat !== "all") query = query.contains("data_categories", [dataCat]);
      if (violation !== "all") query = query.contains("violation_types", [violation]);
      if (significance !== "any")
        query = query.gte("precedent_significance", parseInt(significance));
      if (q.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or(
          `subject.ilike.${like},violation.ilike.${like},key_compliance_failure.ilike.${like}`
        );
      }

      query = query
        .order("decision_date", { ascending: false, nullsFirst: false })
        .order("precedent_significance", { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count: c, error } = await query;
      if (cancelled) return;
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setCount(c ?? 0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    view,
    q,
    jurisdiction,
    sector,
    dataCat,
    violation,
    significance,
    page,
    isPremium,
    authLoading,
    retryNonce,
  ]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all" || value === "any" || value === "")
      next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const switchView = (next: "recent" | "archive") => {
    const nextParams = new URLSearchParams(params);
    if (next === "recent") nextParams.delete("view");
    else nextParams.set("view", "archive");
    nextParams.delete("page");
    setParams(nextParams, { replace: true });
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
        <title>
          {view === "archive"
            ? "Enforcement Tracker — Full Archive | Premium Privacy Enforcement Database"
            : "Enforcement Tracker — Privacy Fines, Decisions & Intelligence"}
        </title>
        <meta
          name="description"
          content={
            view === "archive"
              ? "Enforcement Tracker — Full Archive: search the complete historical database of global privacy enforcement actions, fines, and decisions. Premium access required."
              : "Search privacy enforcement actions worldwide. Recent 60 days fully enriched and free; full historical archive available with Premium."
          }
        />
        <link
          rel="canonical"
          href={
            view === "archive"
              ? "https://yourprivacyhub.com/enforcement?view=archive"
              : "https://yourprivacyhub.com/enforcement"
          }
        />
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <h1 className="font-serif text-4xl md:text-5xl mb-3">
            {view === "archive" ? "Enforcement Tracker — Full Archive" : "Enforcement Tracker"}
          </h1>
          {view === "recent" && (() => {
            const PUBLIC_WINDOW_DAYS = 60;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - PUBLIC_WINDOW_DAYS);
            const cutoffLabel = cutoff.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return (
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
                data-testid="enforcement-window-indicator"
                data-window-days={PUBLIC_WINDOW_DAYS}
                data-cutoff-date={cutoff.toISOString().slice(0, 10)}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  Window: <strong className="text-foreground">{PUBLIC_WINDOW_DAYS} days</strong>
                  {" · "}
                  Showing actions on or after{" "}
                  <strong className="text-foreground">{cutoffLabel}</strong>
                </span>
              </div>
            );
          })()}
          <p className="text-muted-foreground max-w-3xl">
            {view === "recent" ? (
              <>
                Search the last <strong>60 days</strong> of enriched privacy enforcement actions —
                free for everyone. Filter by jurisdiction, sector, data category, violation type,
                and precedent significance.
              </>
            ) : (
              <>
                Full historical archive of enriched privacy enforcement actions. Search across
                3,700+ decisions worldwide.
              </>
            )}
          </p>
        </header>

        {/* View toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => switchView("recent")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === "recent"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Recent (last 60 days)
          </button>
          <button
            onClick={() => switchView("archive")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              view === "archive"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Full archive
            {!isPremium && <Lock className="w-3.5 h-3.5" />}
            {isPremium && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          <Link
            to="/horizon"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors no-underline"
          >
            Forecast view: Enforcement Forecast Intelligence →
          </Link>
        </div>

        {/* Premium gate for archive */}
        {view === "archive" && !isPremium && !authLoading && (
          <Card className="mb-6 border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h2 className="font-semibold text-base">Premium archive</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Search 3,700+ historical enforcement actions with full intelligence —
                  significance ratings, key compliance failures, violation taxonomies, and
                  preventive measures. Recent 60 days remain free for everyone.
                </p>
              </div>
              <Link to="/subscribe" className="shrink-0">
                <Button>Upgrade to Premium</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats — recompute based on current view's data via the same filter shape */}
        {view === "recent" && (
          <EnforcementStats
            filters={{ q, jurisdiction, sector, dataCat, violation, significance }}
          />
        )}

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
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    setParam("q", (e.target as HTMLInputElement).value);
                }}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select
                value={jurisdiction}
                onValueChange={(v) => setParam("jurisdiction", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Jurisdiction" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All jurisdictions</SelectItem>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sector} onValueChange={(v) => setParam("sector", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={dataCat}
                onValueChange={(v) => setParam("data_category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Data category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All data categories</SelectItem>
                  {DATA_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={violation}
                onValueChange={(v) => setParam("violation", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Violation type" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All violations</SelectItem>
                  {VIOLATION_TYPES.map((v) => (
                    <SelectItem key={v} value={v} className="capitalize">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={significance}
                onValueChange={(v) => setParam("significance", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Significance" />
                </SelectTrigger>
                <SelectContent>
                  {SIGNIFICANCE.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Active:</span>
                {activeFilters.map((f) => (
                  <Badge
                    key={f.key}
                    variant="secondary"
                    className="gap-1 capitalize"
                  >
                    {f.label}
                    <button
                      onClick={() => setParam(f.key, "")}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (view === "archive") next.set("view", "archive");
                    setParams(next, { replace: true });
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-3 text-sm text-muted-foreground flex items-center justify-between gap-4 flex-wrap">
          <span>
            {loading
              ? "Loading…"
              : view === "archive" && !isPremium
              ? "Premium subscription required to view the archive."
              : `${count.toLocaleString()} actions • Page ${page + 1} of ${Math.max(
                  1,
                  totalPages
                )}`}
          </span>
          {view === "recent" && !loading && count > 0 && (
            <Link
              to="?view=archive"
              onClick={(e) => {
                e.preventDefault();
                switchView("archive");
              }}
              className="text-xs text-primary hover:underline"
            >
              Need older cases? Browse the full archive →
            </Link>
          )}
        </div>

        {archiveError && (
          <Card
            className={`mb-3 ${
              archiveError.kind === "premium"
                ? "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10"
                : archiveError.kind === "auth"
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2 flex-1">
                {archiveError.kind === "premium" ? (
                  <Lock className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" />
                ) : archiveError.kind === "auth" ? (
                  <LogIn className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                )}
                <div className="text-sm">
                  <p className="font-medium mb-0.5">
                    {archiveError.kind === "premium"
                      ? "Premium required"
                      : archiveError.kind === "auth"
                      ? "Sign-in required"
                      : "Couldn't load the archive"}
                  </p>
                  <p className="text-muted-foreground">{archiveError.message}</p>
                </div>
              </div>
              <div className="shrink-0 flex gap-2">
                {archiveError.kind === "premium" && (
                  <Link to="/subscribe">
                    <Button size="sm">Upgrade to Premium</Button>
                  </Link>
                )}
                {archiveError.kind === "auth" && (
                  <Link
                    to={`/login?redirect=${encodeURIComponent(
                      "/enforcement?view=archive"
                    )}`}
                  >
                    <Button size="sm">Sign in</Button>
                  </Link>
                )}
                {archiveError.kind === "other" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRetryNonce((n) => n + 1)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Try again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : view === "archive" && !isPremium ? null : rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No enforcement actions match your filters
                {view === "recent" && " in the last 60 days"}.
                {view === "recent" && (
                  <div className="mt-3">
                    <button
                      onClick={() => switchView("archive")}
                      className="text-primary hover:underline text-sm"
                    >
                      Try the full archive →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                to={`/enforcement/${r.id}`}
                className="block group"
              >
                <Card className="transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">
                            {r.jurisdiction}
                          </span>
                          <span>•</span>
                          <span>{r.regulator}</span>
                          {r.decision_date && (
                            <>
                              <span>•</span>
                              <span>
                                {new Date(r.decision_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition line-clamp-2">
                          {r.subject || "Undisclosed entity"}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold">
                          {formatEur(r.fine_eur_equivalent ?? r.fine_eur)}
                        </div>
                        <Stars n={r.precedent_significance} />
                      </div>
                    </div>

                    {r.key_compliance_failure && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {r.key_compliance_failure}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {r.industry_sector && (
                        <Badge
                          variant="outline"
                          className="capitalize text-xs"
                        >
                          {r.industry_sector}
                        </Badge>
                      )}
                      {(r.violation_types ?? []).slice(0, 3).map((v) => (
                        <Badge
                          key={v}
                          variant="secondary"
                          className="capitalize text-xs"
                        >
                          {v}
                        </Badge>
                      ))}
                      {(r.data_categories ?? []).slice(0, 3).map((c) => (
                        <Badge
                          key={c}
                          className="capitalize text-xs bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !(view === "archive" && !isPremium) && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setParam("page", String(page - 1))}
            >
              ← Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next →
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
