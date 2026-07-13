// Recursive typed editor for object/array intake values on the refine surface.
// The editor NEVER shows raw JSON to the user; it renders one control per leaf
// and reassembles the exact original shape on every keystroke via onChange.
//
// Leaf routing:
//   string       → <input> (< 80 chars) or <textarea>
//   string (enum)→ <select> against the option set from fieldEnums.ts
//   boolean      → Yes/No <select>
//   number       → numeric <input>; non-numeric rejected on blur
//   string[]     → list editor (add/remove rows) OR multi-checkbox when the
//                  keyPath is registered as an enum
//   object       → labeled group of leaf controls (recurse)
//   array<object>→ card list; add-item clones the first item's key shape with
//                  empty leaves
//   null/undef   → text input writing back null when left empty
//
// Storage contract (invariant): shapes and JSON types round-trip byte-identical
// for untouched leaves. Nothing here re-serialises to JSON.

import { useMemo } from "react";
import { X, Plus } from "lucide-react";
import { getEnumOptions } from "@/components/refine/fieldEnums";

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [k: string]: JsonValue };

interface EditorProps {
  toolType: string;
  keyPath: string;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Depth for indent styling; root is 0. */
  depth?: number;
  /** When true, this leaf/group renders without its own outer label
   *  (parent already rendered the field label). */
  suppressLabel?: boolean;
}

// -- Type inference for empty leaves --------------------------------------
// When a leaf's value is null/undefined we still need to know the shape to
// keep the round-trip stable. The parent seed provides the type via
// `inferKind` when it recurses; unknown falls back to string.

// -- Leaf renderers --------------------------------------------------------

function StringLeaf({
  value,
  onChange,
  enumOptions,
}: {
  value: string;
  onChange: (next: string) => void;
  enumOptions: readonly string[] | null;
}) {
  if (enumOptions) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm"
      >
        <option value="">— Select —</option>
        {enumOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  if (value.length > 80) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-20 w-full rounded-md border border-brand-cloud bg-background text-sm p-3"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm"
    />
  );
}

function BooleanLeaf({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <select
      value={value ? "true" : "false"}
      onChange={(e) => onChange(e.target.value === "true")}
      className="mt-1 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm"
    >
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

function NumberLeaf({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw.trim() === "") { onChange(null); return; }
        // let intermediate keystrokes through by falling back to previous value
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : value);
      }}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n) && e.target.value.trim() !== "") {
          // reject non-numeric on blur — restore prior number or null
          onChange(value);
        }
      }}
      className="mt-1 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm"
    />
  );
}

function NullableTextLeaf({ value, onChange }: { value: null | undefined; onChange: (next: string | null) => void }) {
  return (
    <input
      type="text"
      value=""
      onChange={(e) => onChange(e.target.value.trim() === "" ? null : e.target.value)}
      placeholder="(empty)"
      className="mt-1 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm text-slate placeholder:text-slate/60"
    />
  );
}

// -- String[] leaf ---------------------------------------------------------

function StringArrayLeaf({
  value,
  onChange,
  enumOptions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  enumOptions: readonly string[] | null;
}) {
  // Enum-registered → multi-select checkbox grid (same option set as first-run).
  if (enumOptions) {
    const set = new Set(value);
    return (
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {enumOptions.map((opt) => {
          const on = set.has(opt);
          return (
            <label key={opt} className="flex items-start gap-2 text-sm text-brand-navy cursor-pointer">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  const next = new Set(value);
                  if (e.target.checked) next.add(opt); else next.delete(opt);
                  // preserve original option ordering
                  onChange(enumOptions.filter((o) => next.has(o)));
                }}
                className="mt-1"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    );
  }
  // Free-form → list editor with add/remove rows.
  return (
    <div className="mt-1 space-y-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          {item.length > 80 ? (
            <textarea
              value={item}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 min-h-16 rounded-md border border-brand-cloud bg-background text-sm p-2"
            />
          ) : (
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 h-9 px-3 rounded-md border border-brand-cloud bg-background text-sm"
            />
          )}
          <button
            type="button"
            onClick={() => {
              const next = [...value];
              next.splice(i, 1);
              onChange(next);
            }}
            aria-label="Remove item"
            className="mt-1 p-1 text-slate hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal-text hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    </div>
  );
}

// -- Object group ----------------------------------------------------------

function ObjectGroup({
  toolType,
  keyPath,
  value,
  onChange,
  depth = 0,
}: {
  toolType: string;
  keyPath: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  depth?: number;
}) {
  const keys = Object.keys(value);
  return (
    <div
      className={
        depth === 0
          ? "space-y-3"
          : "space-y-3 pl-3 border-l-2 border-brand-cloud"
      }
    >
      {keys.map((k) => {
        const childPath = keyPath ? `${keyPath}.${k}` : k;
        return (
          <div key={k}>
            <div className="text-xs font-semibold text-brand-navy">{humanize(k)}</div>
            <StructuredFieldEditor
              toolType={toolType}
              keyPath={childPath}
              value={value[k]}
              onChange={(next) => onChange({ ...value, [k]: next })}
              depth={depth + 1}
              suppressLabel
            />
          </div>
        );
      })}
    </div>
  );
}

// -- Array-of-objects card list -------------------------------------------

function emptyShapeFrom(item: unknown): unknown {
  if (item == null) return null;
  if (Array.isArray(item)) return [];
  if (typeof item === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(item as Record<string, unknown>)) {
      const v = (item as Record<string, unknown>)[k];
      if (v == null) out[k] = null;
      else if (Array.isArray(v)) out[k] = [];
      else if (typeof v === "object") out[k] = emptyShapeFrom(v);
      else if (typeof v === "number") out[k] = 0;
      else if (typeof v === "boolean") out[k] = false;
      else out[k] = "";
    }
    return out;
  }
  if (typeof item === "number") return 0;
  if (typeof item === "boolean") return false;
  return "";
}

function ArrayOfObjectsList({
  toolType,
  keyPath,
  value,
  onChange,
  depth = 0,
}: {
  toolType: string;
  keyPath: string;
  value: unknown[];
  onChange: (next: unknown[]) => void;
  depth?: number;
}) {
  return (
    <div className={depth === 0 ? "space-y-3" : "space-y-3 pl-3 border-l-2 border-brand-cloud"}>
      {value.map((item, i) => (
        <div key={i} className="border border-brand-cloud rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-brand-mist">Item {i + 1}</div>
            <button
              type="button"
              onClick={() => {
                const next = [...value];
                next.splice(i, 1);
                onChange(next);
              }}
              aria-label={`Remove item ${i + 1}`}
              className="p-1 text-slate hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <StructuredFieldEditor
            toolType={toolType}
            keyPath={`${keyPath}[]`}
            value={item}
            onChange={(next) => {
              const arr = [...value];
              arr[i] = next;
              onChange(arr);
            }}
            depth={depth + 1}
            suppressLabel
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const template = value.length > 0 ? emptyShapeFrom(value[0]) : {};
          onChange([...value, template]);
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal-text hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    </div>
  );
}

// -- Public entry point ----------------------------------------------------

export function StructuredFieldEditor(props: EditorProps) {
  const { toolType, keyPath, value, onChange, depth = 0 } = props;
  const enumOptions = useMemo(() => getEnumOptions(toolType, keyPath), [toolType, keyPath]);

  if (value === null || value === undefined) {
    // Preserve null on empty; register as a nullable text leaf.
    return (
      <NullableTextLeaf
        value={value as null | undefined}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (typeof value === "string") {
    return <StringLeaf value={value} onChange={onChange} enumOptions={enumOptions} />;
  }
  if (typeof value === "boolean") {
    return <BooleanLeaf value={value} onChange={onChange} />;
  }
  if (typeof value === "number") {
    return <NumberLeaf value={value} onChange={onChange} />;
  }
  if (Array.isArray(value)) {
    const firstNonNull = value.find((v) => v != null);
    const looksLikeObjects =
      firstNonNull !== undefined &&
      typeof firstNonNull === "object" &&
      !Array.isArray(firstNonNull);
    if (looksLikeObjects) {
      return (
        <ArrayOfObjectsList
          toolType={toolType}
          keyPath={keyPath}
          value={value as unknown[]}
          onChange={onChange as (n: unknown[]) => void}
          depth={depth}
        />
      );
    }
    // Treat as string[] (coerce non-string primitives to string on display;
    // storage stays as user-typed strings — matches prior CSV/text behaviour).
    return (
      <StringArrayLeaf
        value={(value as unknown[]).map((v) => (v == null ? "" : String(v)))}
        onChange={(next) => onChange(next)}
        enumOptions={enumOptions}
      />
    );
  }
  if (typeof value === "object") {
    return (
      <ObjectGroup
        toolType={toolType}
        keyPath={keyPath}
        value={value as Record<string, unknown>}
        onChange={onChange as (n: Record<string, unknown>) => void}
        depth={depth}
      />
    );
  }
  return null;
}

// -- Read-only humanised summary for locked object/array values -----------
//
// The refine surface's "Locked from run 1" panel must not print raw JSON. This
// helper builds a compact human-readable summary of any JSON value.

export function summariseStructuredValue(v: unknown, depth = 0): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    const firstNonNull = v.find((x) => x != null);
    if (firstNonNull !== undefined && typeof firstNonNull === "object" && !Array.isArray(firstNonNull)) {
      return `${v.length} item${v.length === 1 ? "" : "s"}`;
    }
    return v.map((x) => (x == null ? "" : String(x))).filter(Boolean).join(", ") || "—";
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return "—";
    if (depth >= 1) return `${entries.length} field${entries.length === 1 ? "" : "s"}`;
    return entries
      .map(([k, val]) => `${humanize(k)}: ${summariseStructuredValue(val, depth + 1)}`)
      .join(" · ");
  }
  return String(v);
}

export type { JsonValue };
