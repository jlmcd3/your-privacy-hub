import { useState } from "react";
import { Helmet } from "react-helmet-async";

/**
 * Admin-only visual regression page (Phase 4 / Phase 3 deliverable).
 * Renders any public route inside fixed-width iframes so you can eyeball
 * how layouts behave at the in-between breakpoints that don't get tested
 * by mobile / desktop alone.
 *
 * Lives at /admin/responsive — gated by AdminOnly in App.tsx.
 */

const PRESET_WIDTHS = [360, 480, 600, 768, 900, 1024, 1280, 1440, 1600];

const DEFAULT_ROUTES: { label: string; path: string }[] = [
  { label: "Home", path: "/" },
  { label: "Newsfeed", path: "/updates" },
  { label: "Cookie Consent Guide", path: "/cookie-consent" },
  { label: "Cross-Border Transfers", path: "/cross-border-transfers" },
  { label: "Health Data Privacy", path: "/health-data-privacy" },
  { label: "Biometric Privacy", path: "/biometric-privacy" },
  { label: "Global Authorities", path: "/global-privacy-authorities" },
  { label: "US State Comparison", path: "/us-state-comparison" },
  { label: "Glossary", path: "/glossary" },
  { label: "Subscribe", path: "/subscribe" },
];

export default function ResponsivePreview() {
  const [path, setPath] = useState("/");
  const [widths, setWidths] = useState<number[]>([360, 768, 1024, 1280]);
  const [customWidth, setCustomWidth] = useState("");

  const toggleWidth = (w: number) => {
    setWidths((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort((a, b) => a - b),
    );
  };

  const addCustom = () => {
    const w = parseInt(customWidth, 10);
    if (!Number.isFinite(w) || w < 200 || w > 2400) return;
    if (!widths.includes(w)) setWidths([...widths, w].sort((a, b) => a - b));
    setCustomWidth("");
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Responsive Preview · Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="border-b border-brand-cloud bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-lg font-semibold text-brand-navy">Responsive Preview</h1>
            <p className="text-xs text-slate">
              Renders the chosen route inside fixed-width iframes. Use to spot
              layout breakage between standard breakpoints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate uppercase tracking-wide">
              Route
            </label>
            <select
              value={DEFAULT_ROUTES.find((r) => r.path === path) ? path : "__custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v !== "__custom") setPath(v);
              }}
              className="text-sm border border-brand-cloud rounded px-2 py-1 bg-card"
            >
              {DEFAULT_ROUTES.map((r) => (
                <option key={r.path} value={r.path}>
                  {r.label}
                </option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/path"
              className="text-sm border border-brand-cloud rounded px-2 py-1 bg-card flex-1 min-w-[200px] max-w-[400px] font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate uppercase tracking-wide">
              Widths
            </label>
            {PRESET_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleWidth(w)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  widths.includes(w)
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "bg-card text-slate border-brand-cloud hover:border-slate"
                }`}
              >
                {w}px
              </button>
            ))}
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="custom"
              className="text-xs border border-brand-cloud rounded px-2 py-1 w-20"
            />
            <button
              type="button"
              onClick={addCustom}
              className="text-xs px-2 py-1 rounded border border-brand-cloud hover:bg-brand-cloud"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-4 flex gap-4 overflow-x-auto">
        {widths.map((w) => (
          <div key={w} className="flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-mono text-slate">{w}px</span>
              <button
                type="button"
                onClick={() => toggleWidth(w)}
                className="text-xs text-brand-mist hover:text-severity-warning"
                title="Remove"
              >
                ×
              </button>
            </div>
            <iframe
              src={path}
              title={`Preview at ${w}px`}
              style={{ width: `${w}px`, height: "900px" }}
              className="border border-brand-cloud rounded bg-white shadow-eup-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
