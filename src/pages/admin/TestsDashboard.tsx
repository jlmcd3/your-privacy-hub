// Admin dashboard for the /admin/test-* tool exercise pages. Lets an admin
// pick any subset (or all) of the test pages and run each selected one inline
// in an embedded iframe so they can be reviewed without leaving this page.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, PlayCircle, X, RotateCw } from "lucide-react";

type TestEntry = {
  id: string;
  label: string;
  path: string;
  group: "Assessments" | "Documents" | "CPPA" | "Notices" | "Other";
};

const TESTS: TestEntry[] = [
  { id: "lia", label: "LI Assessment", path: "/admin/test-lia", group: "Assessments" },
  { id: "dpia", label: "DPIA Framework", path: "/admin/test-dpia", group: "Assessments" },
  { id: "governance", label: "Governance Assessment", path: "/admin/test-governance", group: "Assessments" },
  { id: "biometric", label: "Biometric Checker", path: "/admin/test-biometric", group: "Assessments" },
  { id: "dpa", label: "DPA Generator", path: "/admin/test-dpa", group: "Documents" },
  { id: "ir", label: "IR Playbook", path: "/admin/test-ir-playbook", group: "Documents" },
  { id: "ropa", label: "RoPA Builder", path: "/admin/test-ropa", group: "Documents" },
  { id: "us-notice", label: "US Privacy Notice", path: "/admin/test-us-notice", group: "Notices" },
  { id: "eu-notice", label: "EU Privacy Notice", path: "/admin/test-eu-notice", group: "Notices" },
  { id: "cppa-scope", label: "CPPA Scope Checker", path: "/admin/test-cppa-scope", group: "CPPA" },
  { id: "cppa-risk", label: "CPPA Risk Assessment", path: "/admin/test-cppa-risk", group: "CPPA" },
  { id: "cppa-cyber", label: "CPPA Cybersecurity Audit", path: "/admin/test-cppa-cyber", group: "CPPA" },
  { id: "registration", label: "Registration Manager", path: "/admin/test-registration", group: "Other" },
  { id: "brief", label: "Intelligence Brief", path: "/admin/test-brief", group: "Other" },
];

const GROUP_ORDER: TestEntry["group"][] = [
  "Assessments",
  "Documents",
  "CPPA",
  "Notices",
  "Other",
];

type RunEntry = TestEntry & { nonce: number };

export default function TestsDashboard() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<RunEntry[]>([]);

  const allSelected = selected.size === TESTS.length;
  const someSelected = selected.size > 0 && !allSelected;

  const grouped = useMemo(() => {
    const map = new Map<string, TestEntry[]>();
    for (const t of TESTS) {
      const arr = map.get(t.group) || [];
      arr.push(t);
      map.set(t.group, arr);
    }
    return map;
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(TESTS.map((t) => t.id)));
  }

  function runSelected() {
    const chosen = TESTS.filter((t) => selected.has(t.id));
    setRunning(chosen.map((t) => ({ ...t, nonce: Date.now() })));
  }

  function closeRun(id: string) {
    setRunning((prev) => prev.filter((r) => r.id !== id));
  }

  function reloadRun(id: string) {
    setRunning((prev) =>
      prev.map((r) => (r.id === id ? { ...r, nonce: Date.now() } : r)),
    );
  }

  function clearRuns() {
    setRunning([]);
  }

  return (
    <>
      <Navbar />
      <Helmet>
        <title>Admin · Tests | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-navy">Tool Tests</h1>
              <p className="text-sm text-slate mt-1">
                Pick any combination of tool test pages and run them. Selected
                tests load inline below so you can review them without leaving
                this page.
              </p>
            </div>
            <Button
              onClick={runSelected}
              disabled={selected.size === 0}
              className="gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              Run selected ({selected.size})
            </Button>
          </div>

          <Card className="p-4 mb-6 border border-fog">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Select all tests"
              />
              <span className="text-sm font-semibold text-navy">
                Select all ({TESTS.length})
              </span>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="ml-3 text-xs text-cobalt hover:underline bg-transparent border-none cursor-pointer"
                >
                  Clear
                </button>
              )}
            </label>
          </Card>

          <div className="space-y-6">
            {GROUP_ORDER.map((group) => {
              const items = grouped.get(group);
              if (!items?.length) return null;
              return (
                <div key={group}>
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">
                    {group}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((t) => {
                      const checked = selected.has(t.id);
                      return (
                        <Card
                          key={t.id}
                          className={`p-3 border transition-colors ${
                            checked ? "border-cobalt bg-cobalt/5" : "border-fog"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(t.id)}
                                aria-label={t.label}
                              />
                              <span className="text-sm text-navy truncate">
                                {t.label}
                              </span>
                            </label>
                            <Link
                              to={t.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate hover:text-cobalt no-underline inline-flex items-center gap-1 shrink-0"
                              title="Open in a new tab"
                            >
                              Open
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {running.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-navy text-xl">
                  Test runs ({running.length})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearRuns}
                  className="gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Close all
                </Button>
              </div>
              <div className="space-y-4">
                {running.map((r) => (
                  <Card key={r.id} className="border border-fog overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-fog bg-cloud">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-navy truncate">
                          {r.label}
                        </span>
                        <code className="text-xs text-slate-500 truncate">
                          {r.path}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reloadRun(r.id)}
                          className="h-7 px-2 gap-1"
                          title="Reload"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                        <Link
                          to={r.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 text-slate hover:text-cobalt rounded-md hover:bg-fog/40"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => closeRun(r.id)}
                          className="h-7 px-2"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <iframe
                      key={r.nonce}
                      src={r.path}
                      title={r.label}
                      className="w-full h-[720px] bg-white border-0"
                      loading="lazy"
                    />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}
