// Admin review list for enforcement records that cannot render a proper
// headline name or the analysis fields (key compliance failure / preventive
// measures). Rows are flagged by the corpus quality pass; this page is a
// read-only worklist.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface FlaggedRow {
  id: string;
  subject: string | null;
  regulator: string | null;
  jurisdiction: string | null;
  decision_date: string | null;
  case_reference: string | null;
  source_url: string | null;
  quality_flags: string[] | null;
}

const FLAG_LABEL: Record<string, string> = {
  subject_missing: "No name on record",
  subject_fragment: "Name is a text fragment",
  missing_key_compliance_failure: "No key compliance failure",
  missing_preventive_measures: "No what-should-have-been-done",
};

export default function AdminEnforcementQuality() {
  const [rows, setRows] = useState<FlaggedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("list_flagged_enforcement_actions", {
        _limit: 500,
        _offset: 0,
      });
      setRows(((data as unknown as FlaggedRow[]) ?? []));
      setLoading(false);
    })();
  }, []);

  const flags = Object.keys(FLAG_LABEL);
  const visible =
    filter === "all"
      ? rows
      : rows.filter((r) => (r.quality_flags ?? []).includes(filter));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-serif mb-2">Enforcement record review list</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Records that cannot display a proper name or the analysis sections.
          Showing the {rows.length} most recent flagged records.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {["all", ...flags].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs rounded-full border px-3 py-1 ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {f === "all" ? "All" : FLAG_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing flagged.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => (
              <li key={r.id} className="border rounded-md p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    to={`/enforcement/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {r.subject?.trim() || r.case_reference || "(no name)"}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {[r.regulator, r.jurisdiction, r.decision_date?.slice(0, 10)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(r.quality_flags ?? []).map((f) => (
                    <Badge key={f} variant="secondary">
                      {FLAG_LABEL[f] ?? f}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
