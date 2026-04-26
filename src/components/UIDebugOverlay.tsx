import { useEffect, useRef, useState } from "react";

/**
 * Hidden UI debug overlay.
 *
 * Activation (any of):
 *   • Add `?uidebug=1` to the URL
 *   • Press Ctrl+Shift+D (or Cmd+Shift+D on macOS)
 *   • Set localStorage.uiDebug = "1"
 *
 * What it does, scoped to the current page:
 *   • Outlines every layout container (grid/flex) with ≥2 children.
 *   • Highlights containers and child cards that are visually empty
 *     (no rendered text/image/control inside, or large empty space).
 *   • Logs a structured table to the browser console: container, child,
 *     box size, content size, empty ratio, and any "missing prop" hints
 *     (e.g. children rendered as undefined / null / "" / NaN).
 *   • Shows a small floating panel with a summary + close button.
 *
 * Production-safe: renders nothing unless explicitly activated.
 */

type Finding = {
  kind: "empty-container" | "empty-child" | "stretched-empty" | "missing-prop";
  selector: string;
  childIndex?: number;
  boxHeight?: number;
  contentHeight?: number;
  emptyRatio?: number;
  note?: string;
};

const STORAGE_KEY = "uiDebug";
const EMPTY_RATIO = 0.35;
const MIN_BOX = 80;

function describe(el: Element): string {
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls =
    el.className && typeof el.className === "string"
      ? "." +
        el.className
          .trim()
          .split(/\s+/)
          .slice(0, 3)
          .join(".")
      : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
}

function measureContent(child: HTMLElement): number {
  const box = child.getBoundingClientRect();
  let bottom = box.top;
  const walker = document.createTreeWalker(child, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;
  while (node) {
    const r = node.getBoundingClientRect();
    const text = (node.textContent || "").trim();
    const cs = getComputedStyle(node);
    const visible =
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none";
    if (
      visible &&
      (text.length > 0 ||
        ["IMG", "SVG", "BUTTON", "INPUT", "VIDEO", "CANVAS"].includes(
          node.tagName,
        ))
    ) {
      if (r.bottom > bottom) bottom = r.bottom;
    }
    node = walker.nextNode() as HTMLElement | null;
  }
  return Math.max(0, bottom - box.top);
}

function findMissingPropHints(root: HTMLElement): Finding[] {
  // Heuristic: text nodes whose trimmed value is exactly "undefined", "null",
  // "NaN", or a literal "[object Object]" — a strong sign a prop was passed
  // through to JSX without a guard.
  const hints: Finding[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    const t = (n.nodeValue || "").trim();
    if (
      t === "undefined" ||
      t === "null" ||
      t === "NaN" ||
      t === "[object Object]"
    ) {
      const parent = n.parentElement;
      hints.push({
        kind: "missing-prop",
        selector: parent ? describe(parent) : "(unknown)",
        note: `Rendered literal "${t}" — likely an unguarded prop.`,
      });
    }
    n = walker.nextNode();
  }
  return hints;
}

function scan(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  const containers = Array.from(
    root.querySelectorAll<HTMLElement>("*"),
  ).filter((el) => {
    const cs = getComputedStyle(el);
    return (
      (cs.display === "grid" || cs.display === "flex") && el.children.length >= 2
    );
  });

  for (const container of containers) {
    const cBox = container.getBoundingClientRect();
    if (cBox.height < MIN_BOX) continue;

    const cs = getComputedStyle(container);
    const stretches = cs.alignItems === "stretch" || cs.alignItems === "normal";

    const children = Array.from(container.children) as HTMLElement[];
    let emptyChildren = 0;

    children.forEach((child, idx) => {
      const box = child.getBoundingClientRect();
      if (box.height < 40) return;
      const contentH = measureContent(child);
      const ratio = 1 - contentH / box.height;
      if (contentH === 0) {
        emptyChildren++;
        findings.push({
          kind: "empty-child",
          selector: describe(child),
          childIndex: idx,
          boxHeight: Math.round(box.height),
          contentHeight: 0,
          emptyRatio: 1,
          note: `Inside ${describe(container)}`,
        });
      } else if (stretches && ratio > EMPTY_RATIO && box.height >= MIN_BOX) {
        findings.push({
          kind: "stretched-empty",
          selector: describe(child),
          childIndex: idx,
          boxHeight: Math.round(box.height),
          contentHeight: Math.round(contentH),
          emptyRatio: Number(ratio.toFixed(2)),
          note: `Inside stretching ${describe(container)} — add items-start?`,
        });
      }
    });

    if (emptyChildren === children.length) {
      findings.push({
        kind: "empty-container",
        selector: describe(container),
        boxHeight: Math.round(cBox.height),
        note: `${children.length} children, all empty.`,
      });
    }
  }

  findings.push(...findMissingPropHints(root));
  return findings;
}

function paint(root: HTMLElement, findings: Finding[]) {
  // Wipe previous outlines.
  root.querySelectorAll<HTMLElement>("[data-uidebug]").forEach((el) => {
    el.style.outline = "";
    el.style.background = "";
    el.removeAttribute("data-uidebug");
  });

  // Outline every grid/flex container in blue.
  Array.from(root.querySelectorAll<HTMLElement>("*"))
    .filter((el) => {
      const cs = getComputedStyle(el);
      return (
        (cs.display === "grid" || cs.display === "flex") &&
        el.children.length >= 2
      );
    })
    .forEach((el) => {
      el.style.outline = "1px dashed rgba(59,130,246,0.55)";
      el.setAttribute("data-uidebug", "container");
    });

  // Highlight findings.
  for (const f of findings) {
    const matches = root.querySelectorAll<HTMLElement>(
      f.selector
        .replace(/^([a-z0-9-]+)/, "$1")
        .replace(/\./g, "."),
    );
    const target =
      f.childIndex != null && matches.length > 0
        ? matches[0]
        : matches[matches.length - 1];
    if (!target) continue;
    if (f.kind === "empty-container" || f.kind === "empty-child") {
      target.style.outline = "2px solid rgba(220,38,38,0.9)";
      target.style.background = "rgba(220,38,38,0.08)";
    } else if (f.kind === "stretched-empty") {
      target.style.outline = "2px solid rgba(234,179,8,0.95)";
      target.style.background = "rgba(234,179,8,0.10)";
    } else if (f.kind === "missing-prop") {
      target.style.outline = "2px solid rgba(168,85,247,0.95)";
      target.style.background = "rgba(168,85,247,0.10)";
    }
    target.setAttribute("data-uidebug", f.kind);
  }
}

function isActive(): boolean {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("uidebug") === "1") return true;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

interface UIDebugOverlayProps {
  /** Optional CSS selector to scope scanning. Defaults to <main> or <body>. */
  scope?: string;
  /** Friendly label shown in the panel + console header. */
  label?: string;
}

export default function UIDebugOverlay({
  scope,
  label = "UI debug",
}: UIDebugOverlayProps) {
  const [enabled, setEnabled] = useState<boolean>(() => isActive());
  const [findings, setFindings] = useState<Finding[]>([]);
  const rafRef = useRef<number | null>(null);

  // Keyboard toggle: Ctrl/Cmd + Shift + D
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setEnabled((v) => {
          const next = !v;
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Run scan when enabled (and on resize / after a beat for layout settle).
  useEffect(() => {
    if (!enabled) {
      // Clean up any leftover outlines.
      const root = (scope && document.querySelector<HTMLElement>(scope)) ||
        document.querySelector<HTMLElement>("main") ||
        document.body;
      root.querySelectorAll<HTMLElement>("[data-uidebug]").forEach((el) => {
        el.style.outline = "";
        el.style.background = "";
        el.removeAttribute("data-uidebug");
      });
      setFindings([]);
      return;
    }

    const run = () => {
      const root =
        (scope && document.querySelector<HTMLElement>(scope)) ||
        document.querySelector<HTMLElement>("main") ||
        document.body;
      const result = scan(root);
      paint(root, result);
      setFindings(result);

      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `%c[${label}] ${result.length} finding(s)`,
        "color:#3b82f6;font-weight:bold",
      );
      if (result.length > 0) {
        // eslint-disable-next-line no-console
        console.table(result);
      } else {
        // eslint-disable-next-line no-console
        console.log("No layout anomalies detected.");
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    };

    // Defer to next frame so layout has settled.
    rafRef.current = requestAnimationFrame(() => {
      // Wait one more frame + 200ms for fonts/images.
      setTimeout(run, 200);
    });

    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setTimeout(run, 100));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, scope, label]);

  if (!enabled) return null;

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      role="region"
      aria-label="UI debug overlay"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 2147483647,
        maxWidth: 320,
        background: "rgba(15,23,42,0.95)",
        color: "#fff",
        fontFamily:
          "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
        fontSize: 12,
        lineHeight: 1.4,
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <strong style={{ fontSize: 12 }}>{label}</strong>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(STORAGE_KEY, "0");
            } catch {
              /* ignore */
            }
            setEnabled(false);
          }}
          style={{
            background: "transparent",
            color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 11,
          }}
          aria-label="Close UI debug overlay"
        >
          ✕
        </button>
      </div>
      <div style={{ color: "#cbd5e1", marginBottom: 6 }}>
        {findings.length} finding{findings.length === 1 ? "" : "s"} ·{" "}
        <span style={{ color: "#fca5a5" }}>
          {counts["empty-container"] || 0} empty
        </span>
        {" · "}
        <span style={{ color: "#fde68a" }}>
          {counts["stretched-empty"] || 0} stretched
        </span>
        {" · "}
        <span style={{ color: "#d8b4fe" }}>
          {counts["missing-prop"] || 0} missing-prop
        </span>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 11 }}>
        Toggle: <kbd>⌘/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> · See console
        for details.
      </div>
    </div>
  );
}
