import { EEA_AND_UK_COUNTRIES, OTHER_COUNTRIES } from "./countries";

interface CountryPickerProps {
  id: string;
  value: string;
  onChange: (isoCode: string) => void;
  /** Text shown for the empty option. */
  emptyLabel?: string;
  className?: string;
  onFocus?: () => void;
}

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
}: CountryPickerProps) {
  return (
    <select
      id={id}
      value={(value || "").toUpperCase()}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      }
    >
      <option value="">{emptyLabel}</option>
      <optgroup label="Europe (EEA and the UK)">
        {EEA_AND_UK_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </optgroup>
      <optgroup label="Elsewhere">
        {OTHER_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </optgroup>
    </select>
  );
}

export default CountryPicker;
