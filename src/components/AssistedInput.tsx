import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ExhibitTextarea,
  EXHIBIT_SENTINEL,
  isExhibit,
} from "@/components/ExhibitTextarea";
import {
  SLOT_TOKEN_RE,
  SLOT_WARNING_TEXT,
  type AssistedInputPill,
} from "@/config/assistedInput";

/**
 * <AssistedInput> — Doc U v2 sec 2.3 + v3 sec A4 + v3.1 AM-2.
 *
 * Curated pill row above a textarea. Tapping a pill APPENDS its
 * snippet as plain editable text using the field's separator. A pill
 * reads "selected" only while its snippet appears verbatim in the
 * value; editing past a snippet silently deselects the pill and
 * keeps the text. Tapping a selected pill removes its snippet and
 * tidies separators. Typing is never blocked or overwritten.
 *
 * Optional `assertionSlot` children render below the textarea (the
 * Doc R integration point; empty by default for products that do
 * not carry AssertionLevel yet).
 *
 * Optional `useExhibit`: composes with <ExhibitTextarea>. While the
 * exhibit sentinel is selected, pills are disabled (exhibit wins).
 */

export interface AssistedInputProps {
  value: string;
  onChange: (next: string) => void;
  pills: readonly AssistedInputPill[];
  /** Snippet separator. Default "; " for list-style fields. */
  separator?: string;
  /** Rendered below the textarea (Doc R assertion slot). */
  assertionSlot?: React.ReactNode;
  /** Compose with <ExhibitTextarea>. Exhibit sentinel disables pills. */
  useExhibit?: boolean;
  /** Additional passthrough to the underlying textarea. */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  /** Optional aria-describedby hint text rendered below the pills. */
  hint?: string;
  /**
   * Set by parent when a step is about to advance; if true, and the
   * current value still contains an unresolved slot token from a
   * pill, the inline warning is shown. Warning also appears on blur.
   */
  forceSlotWarning?: boolean;
}

const DEFAULT_SEPARATOR = "; ";

/** Escape a string for use in a RegExp literal. */
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Tidy separators after removing a snippet. */
function tidy(value: string, sep: string): string {
  const s = reEscape(sep);
  let out = value;
  // collapse "sepsep" runs
  out = out.replace(new RegExp(`(?:${s}){2,}`, "g"), sep);
  // trim leading / trailing separator (with optional whitespace)
  out = out.replace(new RegExp(`^\\s*${s}`), "");
  out = out.replace(new RegExp(`${s}\\s*$`), "");
  return out.trim();
}

/** Append snippet with separator when needed; no double append. */
function appendSnippet(value: string, snippet: string, sep: string): string {
  if (!value || value.trim().length === 0) return snippet;
  if (value.includes(snippet)) return value;
  const needsSep = !value.endsWith(sep);
  return needsSep ? `${value}${sep}${snippet}` : `${value}${snippet}`;
}

/** Remove first occurrence of snippet and tidy. */
function removeSnippet(value: string, snippet: string, sep: string): string {
  const idx = value.indexOf(snippet);
  if (idx < 0) return value;
  const before = value.slice(0, idx);
  const after = value.slice(idx + snippet.length);
  return tidy(before + after, sep);
}

export function AssistedInput({
  value,
  onChange,
  pills,
  separator = DEFAULT_SEPARATOR,
  assertionSlot,
  useExhibit = false,
  placeholder,
  id,
  name,
  disabled,
  rows = 4,
  className,
  textareaClassName,
  hint,
  forceSlotWarning,
}: AssistedInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [blurred, setBlurred] = React.useState(false);

  const generatedId = React.useId();
  const fieldId = id || `assisted-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const warnId = `${fieldId}-slot-warning`;

  const exhibitActive = useExhibit && isExhibit(value);
  const pillsDisabled = disabled || exhibitActive;

  // Split visible / overflow: max 6 inline, else 5 + More popover.
  const { inline, overflow } = React.useMemo(() => {
    if (pills.length <= 6) return { inline: pills, overflow: [] as AssistedInputPill[] };
    return { inline: pills.slice(0, 5), overflow: pills.slice(5) };
  }, [pills]);

  const isSelected = React.useCallback(
    (p: AssistedInputPill) => !exhibitActive && value.includes(p.snippet),
    [value, exhibitActive],
  );

  /** Focus textarea and select the first slot in `snippet` (AM-2 a). */
  const selectFirstSlotIn = React.useCallback(
    (snippet: string, nextValue: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const slot = snippet.match(SLOT_TOKEN_RE);
      if (!slot) return;
      const snippetStart = nextValue.indexOf(snippet);
      if (snippetStart < 0) return;
      const slotStart = snippetStart + snippet.indexOf(slot[0]);
      const slotEnd = slotStart + slot[0].length;
      // Defer to next tick so React commits the value first.
      requestAnimationFrame(() => {
        ta.focus();
        try {
          ta.setSelectionRange(slotStart, slotEnd);
        } catch {
          /* jsdom / older browsers: no-op */
        }
      });
    },
    [],
  );

  const handleTogglePill = (p: AssistedInputPill) => {
    if (pillsDisabled) return;
    if (isSelected(p)) {
      onChange(removeSnippet(value, p.snippet, separator));
      return;
    }
    const next = appendSnippet(value, p.snippet, separator);
    onChange(next);
    if (SLOT_TOKEN_RE.test(p.snippet)) {
      selectFirstSlotIn(p.snippet, next);
    }
  };

  // AM-2 b: warning when an unresolved "[...]" token from any
  // currently-selected pill snippet remains in the value.
  const selectedWithSlot = React.useMemo(
    () => pills.some((p) => value.includes(p.snippet) && SLOT_TOKEN_RE.test(p.snippet)),
    [pills, value],
  );
  const showSlotWarning =
    !exhibitActive && selectedWithSlot && (blurred || !!forceSlotWarning);

  const describedBy = [hint ? hintId : null, showSlotWarning ? warnId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  const renderPill = (p: AssistedInputPill) => {
    const selected = isSelected(p);
    return (
      <button
        key={p.id}
        type="button"
        role="button"
        aria-pressed={selected}
        aria-describedby={hint ? hintId : undefined}
        disabled={pillsDisabled}
        onClick={() => handleTogglePill(p)}
        className={cn(
          "inline-flex items-center min-h-11 min-w-11 px-3 py-1.5 rounded-full",
          "text-sm border transition-colors select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-input hover:bg-muted",
          pillsDisabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {p.label}
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {pills.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Suggested answers"
        >
          {inline.map(renderPill)}
          {overflow.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pillsDisabled}
                  className="min-h-11 rounded-full"
                >
                  More
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="flex flex-wrap gap-2">
                  {overflow.map(renderPill)}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {useExhibit ? (
        <ExhibitTextarea
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={textareaClassName}
          aria-describedby={describedBy}
          onBlur={() => setBlurred(true)}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          id={fieldId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={textareaClassName}
          aria-describedby={describedBy}
          onBlur={() => setBlurred(true)}
        />
      )}

      {showSlotWarning && (
        <p
          id={warnId}
          role="alert"
          className="text-xs text-destructive"
        >
          {SLOT_WARNING_TEXT}
        </p>
      )}

      {assertionSlot ? <div>{assertionSlot}</div> : null}
    </div>
  );
}

export { EXHIBIT_SENTINEL };
