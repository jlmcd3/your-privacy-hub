import { useEffect, useState } from "react";

/**
 * Blank-screen diagnostic.
 * Runs once on mount, collects DOM size + computed styles for the main
 * container, finds the first visible element, and renders a fixed report.
 *
 * Enable with ?diag=1 in the URL, or by setting localStorage.diag = "1".
 */

interface ElementInfo {
  tag: string;
  id: string;
  className: string;
  rect: { x: number; y: number; width: number; height: number };
  text: string;
}

interface StyleSnapshot {
  display: string;
  visibility: string;
  opacity: string;
  width: string;
  height: string;
  background: string;
  color: string;
  position: string;
  overflow: string;
}

interface Report {
  url: string;
  viewport: { w: number; h: number; dpr: number };
  document: {
    readyState: DocumentReadyState;
    bodyChildren: number;
    totalNodes: number;
    bodySize: { width: number; height: number };
  };
  root: { exists: boolean; childCount: number; rect: DOMRect | null; styles: StyleSnapshot | null };
  main: { exists: boolean; rect: DOMRect | null; styles: StyleSnapshot | null };
  firstVisible: ElementInfo | null;
  errors: string[];
  timing: { collectedAtMs: number };
}

function snapshotStyles(el: Element): StyleSnapshot {
  const cs = window.getComputedStyle(el);
  return {
    display: cs.display,
    visibility: cs.visibility,
    opacity: cs.opacity,
    width: cs.width,
    height: cs.height,
    background: cs.backgroundColor,
    color: cs.color,
    position: cs.position,
    overflow: cs.overflow,
  };
}

function findFirstVisible(): ElementInfo | null {
  const all = document.body.querySelectorAll<HTMLElement>("*");
  for (const el of Array.from(all)) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const cs = window.getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || "",
      className: typeof el.className === "string" ? el.className : "",
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text: (el.textContent || "").trim().slice(0, 80),
    };
  }
  return null;
}

function collectReport(errors: string[]): Report {
  const root = document.getElementById("root");
  const main = document.querySelector("main");
  const body = document.body;
  return {
    url: window.location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    document: {
      readyState: document.readyState,
      bodyChildren: body.children.length,
      totalNodes: document.getElementsByTagName("*").length,
      bodySize: { width: body.scrollWidth, height: body.scrollHeight },
    },
    root: {
      exists: !!root,
      childCount: root?.children.length ?? 0,
      rect: root?.getBoundingClientRect() ?? null,
      styles: root ? snapshotStyles(root) : null,
    },
    main: {
      exists: !!main,
      rect: main?.getBoundingClientRect() ?? null,
      styles: main ? snapshotStyles(main) : null,
    },
    firstVisible: findFirstVisible(),
    errors,
    timing: { collectedAtMs: Math.round(performance.now()) },
  };
}

function isEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("diag") === "1") return true;
    return localStorage.getItem("diag") === "1";
  } catch {
    return false;
  }
}

export default function BlankScreenDiagnostic() {
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState(true);
  const [enabled] = useState(isEnabled);

  useEffect(() => {
    if (!enabled) return;
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => errors.push(`${e.message} @ ${e.filename}:${e.lineno}`);
    const onRejection = (e: PromiseRejectionEvent) => errors.push(`unhandledrejection: ${String(e.reason)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const run = () => setReport(collectReport(errors));
    // Wait one paint so React has mounted children.
    const t = window.setTimeout(run, 250);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [enabled]);

  if (!enabled || !report) return null;

  const blankSuspect =
    report.document.bodyChildren === 0 ||
    report.root.childCount === 0 ||
    (report.root.rect && report.root.rect.height < 10) ||
    !report.firstVisible;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        maxWidth: 460,
        maxHeight: "80vh",
        overflow: "auto",
        background: "rgba(15,23,42,0.96)",
        color: "#e2e8f0",
        font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
        border: `1px solid ${blankSuspect ? "#ef4444" : "#334155"}`,
        borderRadius: 8,
        padding: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ color: blankSuspect ? "#fca5a5" : "#86efac" }}>
          {blankSuspect ? "⚠ Blank-screen suspected" : "✓ Page rendered"}
        </strong>
        <div>
          <button
            onClick={() => setReport(collectReport([]))}
            style={{ marginRight: 6, background: "#334155", color: "#fff", border: 0, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}
          >
            Re-scan
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: "#334155", color: "#fff", border: 0, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {open && (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify(report, null, 2)}
        </pre>
      )}
      <div style={{ marginTop: 8, color: "#94a3b8" }}>
        Toggle: add <code>?diag=1</code> to URL or run <code>localStorage.diag='1'</code>.
      </div>
    </div>
  );
}
