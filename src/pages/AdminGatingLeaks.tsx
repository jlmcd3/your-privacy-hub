import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NavReportButton from "@/components/admin/NavReportButton";
import report from "@/data/gating-leak-report.json";

interface Finding {
  severity: "high" | "medium" | "info";
  type: string;
  route?: string;
  component?: string;
  file: string;
  message: string;
  labels?: string[];
}

const sevStyle = (s: string) => {
  switch (s) {
    case "high":
      return "bg-red-50 border-red-200 text-red-800";
    case "medium":
      return "bg-amber-50 border-amber-200 text-amber-800";
    default:
      return "bg-slate-50 border-slate-200 text-slate-700";
  }
};

export default function AdminGatingLeaks() {
  const findings = (report.findings as Finding[]) ?? [];
  const bySeverity = {
    high: findings.filter((f) => f.severity === "high"),
    medium: findings.filter((f) => f.severity === "medium"),
    info: findings.filter((f) => f.severity === "info"),
  };

  return (
    <>
      <Helmet>
        <title>Gating Leak Scanner — Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Gating Leak Scanner</h1>
            <p className="text-sm text-slate mt-1">
              Cross-references route protection against user-visible Pro/Premium
              labels. Re-run with{" "}
              <code className="bg-fog px-1.5 py-0.5 rounded text-[12px]">
                node scripts/scan-gating-leaks.mjs
              </code>
              .
            </p>
            <p className="text-[12px] text-slate mt-2">
              Last run: {new Date(report.generatedAt).toLocaleString()} ·{" "}
              {report.routesScanned} routes · {report.filesScanned} files
            </p>
          </div>
          <NavReportButton />
        </header>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-3xl font-bold text-red-700">
              {report.summary.high}
            </div>
            <div className="text-[12px] uppercase tracking-wider text-red-700 font-semibold">
              High
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-3xl font-bold text-amber-700">
              {report.summary.medium}
            </div>
            <div className="text-[12px] uppercase tracking-wider text-amber-700 font-semibold">
              Medium
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-3xl font-bold text-slate-700">
              {report.summary.info}
            </div>
            <div className="text-[12px] uppercase tracking-wider text-slate-700 font-semibold">
              Info
            </div>
          </div>
        </div>

        {(["high", "medium", "info"] as const).map((sev) => {
          const items = bySeverity[sev];
          if (!items.length) return null;
          return (
            <section key={sev} className="mb-8">
              <h2 className="text-lg font-semibold text-navy mb-3 capitalize">
                {sev} ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((f, i) => (
                  <article
                    key={i}
                    className={`rounded-xl border p-4 ${sevStyle(f.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-[12px] font-mono uppercase tracking-wider opacity-70">
                        {f.type}
                      </div>
                      {f.route && (
                        <code className="text-[12px] bg-white/70 px-2 py-0.5 rounded border border-current/20">
                          {f.route}
                        </code>
                      )}
                    </div>
                    <p className="text-[14px] mb-2">{f.message}</p>
                    <div className="text-[12px] font-mono opacity-80">
                      {f.file}
                    </div>
                    {f.labels && f.labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.labels.map((l, j) => (
                          <span
                            key={j}
                            className="text-[11px] bg-white/70 px-2 py-0.5 rounded border border-current/20 font-mono"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
