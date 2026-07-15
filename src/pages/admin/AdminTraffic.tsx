// /admin/traffic — MC-S3
// Aggregates-only traffic console. Consumes admin-traffic-aggregate.
// Never displays raw user_events rows; never renders per-user trails.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";

type Aggregate = {
  data_since: string;
  generated_at: string;
  total_rows: number;
  total_sessions: number;
  event_types: Array<{ event_type: string; count: number }>;
  us_vs_eu: {
    us: { sessions: number; tool_started: number; checkout_started: number; sample_opened: number };
    eu: { sessions: number; tool_started: number; checkout_started: number; sample_opened: number };
  };
  pages: Array<{
    page_path: string;
    views_24h: number; views_7d: number; views_30d: number;
    uniques_24h: number; uniques_7d: number; uniques_30d: number;
  }>;
  geography: Array<{
    country: string; events: number; sessions: number;
    regions: Array<{ region: string; count: number }>;
  }>;
  funnel: Array<{
    event_type: string; count: number; sessions: number;
    conversion_from_prev_pct: number | null; context_only: boolean;
  }>;
  funnel_stages: string[];
  campaigns: Array<{
    utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
    sessions: number; events: number;
    top_pages: Array<{ page_path: string; count: number }>;
  }>;
};

function Section({ title, subtitle, children, pinned }: { title: string; subtitle?: string; children: React.ReactNode; pinned?: boolean }) {
  return (
    <section className={`rounded-lg border p-4 ${pinned ? "border-primary bg-card" : "border-border bg-card"}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-1.5 text-sm ${className}`}>{children}</td>;
}
function Head({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground ${className}`}>{children}</th>;
}

function TrafficInner() {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drillCountry, setDrillCountry] = useState<string | null>(null);
  const [pageWindow, setPageWindow] = useState<"24h" | "7d" | "30d">("7d");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("admin-traffic-aggregate", { body: {} });
      if (error) setErr(error.message);
      else setAgg(data as Aggregate);
    })();
  }, []);

  const dataSinceLabel = useMemo(() => {
    if (!agg) return "data since 2026-07-12";
    return `data since ${agg.data_since.slice(0, 10)}`;
  }, [agg]);

  if (err) return <div className="p-8 text-sm text-destructive">Load failed: {err}</div>;
  if (!agg) return <div className="p-8 text-sm text-muted-foreground">Loading traffic aggregates…</div>;

  const drillCountryRow = drillCountry ? agg.geography.find((g) => g.country === drillCountry) : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Traffic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregates-only console · {dataSinceLabel} · {agg.total_rows.toLocaleString()} events across {agg.total_sessions.toLocaleString()} sessions ·
          {" "}<Link to="/admin" className="underline">back to hub</Link>
        </p>
      </div>

      {/* PINNED: US vs EU */}
      <Section title="US vs EU campaign comparison" subtitle={dataSinceLabel} pinned>
        <table className="w-full">
          <thead><tr>
            <Head>Geography</Head><Head>Sessions</Head>
            <Head>tool_started</Head><Head>checkout_started</Head><Head>sample_opened</Head>
          </tr></thead>
          <tbody>
            {(["us", "eu"] as const).map((k) => (
              <tr key={k} className="border-t border-border">
                <Cell className="font-medium uppercase">{k}</Cell>
                <Cell>{agg.us_vs_eu[k].sessions}</Cell>
                <Cell>{agg.us_vs_eu[k].tool_started}</Cell>
                <Cell>{agg.us_vs_eu[k].checkout_started}</Cell>
                <Cell>{agg.us_vs_eu[k].sample_opened}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Split derived from <code>event_data.geography</code> (utm_campaign us-/eu- convention captured at first touch).</p>
      </Section>

      {/* Event-type census */}
      <Section title="Observed event types" subtitle={dataSinceLabel}>
        <div className="flex flex-wrap gap-2">
          {agg.event_types.map((e) => (
            <span key={e.event_type} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs">
              {e.event_type} · <span className="text-muted-foreground">{e.count}</span>
            </span>
          ))}
        </div>
      </Section>

      {/* Pages */}
      <Section title="Pages" subtitle={dataSinceLabel}>
        <div className="mb-3 flex gap-2 text-xs">
          {(["24h", "7d", "30d"] as const).map((w) => (
            <button key={w} type="button" onClick={() => setPageWindow(w)}
              className={`rounded-md border px-2 py-1 ${pageWindow === w ? "border-primary bg-accent" : "border-border"}`}>{w}</button>
          ))}
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card"><tr>
              <Head>Page path</Head><Head>Views</Head><Head>Uniques</Head>
            </tr></thead>
            <tbody>
              {agg.pages.slice(0, 200).map((p) => {
                const views = p[`views_${pageWindow}` as const];
                const uniques = p[`uniques_${pageWindow}` as const];
                return (
                  <tr key={p.page_path} className="border-t border-border">
                    <Cell className="font-mono text-xs">{p.page_path}</Cell>
                    <Cell>{views}</Cell>
                    <Cell>{uniques}</Cell>
                  </tr>
                );
              })}
              {agg.pages.length === 0 && <tr><Cell className="text-muted-foreground">no page views in window</Cell></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Geography */}
      <Section title="Geography" subtitle={dataSinceLabel}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="max-h-96 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card"><tr>
                <Head>Country</Head><Head>Sessions</Head><Head>Events</Head><Head>{" "}</Head>
              </tr></thead>
              <tbody>
                {agg.geography.map((g) => (
                  <tr key={g.country} className="border-t border-border">
                    <Cell className="font-medium">{g.country}</Cell>
                    <Cell>{g.sessions}</Cell>
                    <Cell>{g.events}</Cell>
                    <Cell>
                      <button type="button" className="text-xs underline text-muted-foreground"
                        onClick={() => setDrillCountry(g.country === drillCountry ? null : g.country)}>
                        {drillCountry === g.country ? "hide" : "regions"}
                      </button>
                    </Cell>
                  </tr>
                ))}
                {agg.geography.length === 0 && <tr><Cell className="text-muted-foreground">no country data (headers not resolving)</Cell></tr>}
              </tbody>
            </table>
          </div>
          <div>
            {drillCountryRow ? (
              <>
                <h3 className="text-sm font-medium">{drillCountryRow.country} — regions</h3>
                <table className="mt-2 w-full">
                  <thead><tr><Head>Region</Head><Head>Events</Head></tr></thead>
                  <tbody>
                    {drillCountryRow.regions.map((r) => (
                      <tr key={r.region} className="border-t border-border">
                        <Cell>{r.region}</Cell><Cell>{r.count}</Cell>
                      </tr>
                    ))}
                    {drillCountryRow.regions.length === 0 && <tr><Cell className="text-muted-foreground">no region data</Cell></tr>}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Select a country to drill into regions. Map view intentionally omitted.</p>
            )}
          </div>
        </div>
      </Section>

      {/* Funnel */}
      <Section title="Funnel (per-session)" subtitle={dataSinceLabel}>
        <table className="w-full">
          <thead><tr>
            <Head>Stage</Head><Head>Sessions</Head><Head>Events</Head><Head>Conv. from prev</Head>
          </tr></thead>
          <tbody>
            {agg.funnel.map((f) => (
              <tr key={f.event_type} className="border-t border-border">
                <Cell className="font-mono text-xs">
                  {f.event_type}{f.context_only && <span className="ml-2 text-[10px] uppercase text-muted-foreground">context</span>}
                </Cell>
                <Cell>{f.sessions}</Cell>
                <Cell>{f.count}</Cell>
                <Cell>{f.conversion_from_prev_pct === null ? "—" : `${f.conversion_from_prev_pct}%`}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Stage order is config-extensible; page_view is context only. tool_start_click fires on first intake interaction (PP-1 semantic).
        </p>
      </Section>

      {/* Campaigns */}
      <Section title="Campaigns (UTM split)" subtitle={dataSinceLabel}>
        <div className="max-h-96 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card"><tr>
              <Head>utm_source</Head><Head>utm_medium</Head><Head>utm_campaign</Head>
              <Head>Sessions</Head><Head>Events</Head><Head></Head>
            </tr></thead>
            <tbody>
              {agg.campaigns.map((c) => {
                const key = `${c.utm_source ?? ""}|${c.utm_medium ?? ""}|${c.utm_campaign ?? ""}`;
                return (
                  <>
                    <tr key={key} className="border-t border-border">
                      <Cell>{c.utm_source ?? "—"}</Cell>
                      <Cell>{c.utm_medium ?? "—"}</Cell>
                      <Cell>{c.utm_campaign ?? "—"}</Cell>
                      <Cell>{c.sessions}</Cell>
                      <Cell>{c.events}</Cell>
                      <Cell>
                        <button type="button" className="text-xs underline text-muted-foreground"
                          onClick={() => setExpandedCampaign(expandedCampaign === key ? null : key)}>
                          {expandedCampaign === key ? "hide" : "pages"}
                        </button>
                      </Cell>
                    </tr>
                    {expandedCampaign === key && (
                      <tr key={`${key}-drill`}>
                        <td colSpan={6} className="bg-muted/30 px-3 py-2">
                          <table className="w-full">
                            <thead><tr><Head>Page</Head><Head>Events</Head></tr></thead>
                            <tbody>
                              {c.top_pages.map((p) => (
                                <tr key={p.page_path} className="border-t border-border">
                                  <Cell className="font-mono text-xs">{p.page_path}</Cell>
                                  <Cell>{p.count}</Cell>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {agg.campaigns.length === 0 && <tr><Cell className="text-muted-foreground">no UTM-tagged events in window</Cell></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground">
        Aggregates-only surface. No raw user_events rows, no per-user trails, no IP-derived data beyond country/region already stored on the row.
        Generated {agg.generated_at}.
      </p>
    </div>
  );
}

export default function AdminTraffic() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <TrafficInner />
    </AdminOnly>
  );
}
