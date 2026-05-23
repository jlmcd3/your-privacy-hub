// Admin dashboard for the /admin/test-* tool exercise pages. Lets an admin
// pick any subset (or all) of the test pages and open each selected one in
// its own tab so they run in parallel without leaving this page.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, PlayCircle } from "lucide-react";

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

export default function TestsDashboard() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    // Open each in its own tab so they run in parallel.
    chosen.forEach((t) => window.open(t.path, "_blank", "noopener,noreferrer"));
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
                Pick any combination of tool test pages and run them. Each
                selected test opens in its own tab so they can run in parallel.
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
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}
