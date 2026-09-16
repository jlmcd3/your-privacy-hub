import { EEA_AND_UK_COUNTRIES, OTHER_COUNTRIES } from "./countries";

interface CountryPickerProps {
  id: string;
  value: string;
  onChange: (isoCode: string) => void;
  /** Text shown for the empty option. */
  emptyLabel?: string;
  className?: string;
  onFocus?: () => void;
  /**
   * DPIA master review (2026-09-15, F06): "eea" lists only the EU/EEA
   * members — for the question about an establishment IN THE UNION, where
   * the UK and third countries cannot be the answer.
   */
  scope?: "all" | "eea";
  /** Offers "Another country not listed" (stored as OTHER). */
  allowOther?: boolean;
  /** Offers "Not sure" (stored as UNKNOWN) — distinct from the empty option. */
  allowUnknown?: boolean;
  /** id of the visible label, for assistive technology. */
  labelledBy?: string;
}

export const COUNTRY_OTHER_VALUE = "OTHER";
export const COUNTRY_UNKNOWN_VALUE = "UNKNOWN";

/**
 * Plain-language country picker that stores the ISO 3166-1 alpha-2 code.
 * The submitted value shape is identical to the free-text input it replaces.
 */
export function CountryPicker({
  id,
  value,
  onChange,
  emptyLabel = "Not answered",
  className,
  onFocus,
  scope = "all",
  allowOther = false,
  allowUnknown = false,
  labelledBy,
}: CountryPickerProps) {
  const europe = scope === "eea" ? EEA_AND_UK_COUNTRIES.filter((c) => c.code !== "GB") : EEA_AND_UK_COUNTRIES;
  const current = (value || "").toUpperCase();
  const known = new Set<string>([
    "", COUNTRY_OTHER_VALUE, COUNTRY_UNKNOWN_VALUE,
    ...europe.map((c) => c.code),
    ...(scope === "eea" ? [] : OTHER_COUNTRIES.map((c) => c.code)),
  ]);
  return (
    <select
      id={id}
      value={current}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      aria-labelledby={labelledBy}
      className={
        className ??
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      }
    >
      <option value="">{emptyLabel}</option>
      {/* A stored code this picker does not list (a legacy record, or a
          scope change) stays visible and selectable rather than silently
          reading as unanswered. */}
      {!known.has(current) && <option value={current}>{current} (stored value — not in this list)</option>}
      <optgroup label={scope === "eea" ? "EU and EEA" : "Europe (EEA and the UK)"}>
        {europe.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </optgroup>
      {scope !== "eea" && (
        <optgroup label="Elsewhere">
          {OTHER_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </optgroup>
      )}
      {(allowOther || allowUnknown) && (
        <optgroup label="Other answers">
          {allowOther && <option value={COUNTRY_OTHER_VALUE}>Another country not listed</option>}
          {allowUnknown && <option value={COUNTRY_UNKNOWN_VALUE}>Not sure</option>}
        </optgroup>
      )}
    </select>
  );
}

export default CountryPicker;
