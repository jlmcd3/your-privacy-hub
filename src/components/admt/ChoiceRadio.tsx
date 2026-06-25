// src/components/admt/ChoiceRadio.tsx
// Single-select choice control that can be DESELECTED: clicking the active
// option clears the value back to "". Signature matches the legacy <Radio>.
type Props = {
  name?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  columns?: boolean;
};

export const ChoiceRadio = ({ options, value, onChange, onFocus, columns }: Props) => (
  <div
    className={columns ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "flex flex-col gap-2"}
    onFocus={onFocus}
    role="radiogroup"
  >
    {options.map((opt) => {
      const selected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(selected ? "" : opt)}
          onFocus={onFocus}
          className={`px-3 py-2 text-sm rounded-md border text-left transition-colors flex items-start gap-2 ${
            selected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-input"
          }`}
        >
          <span
            aria-hidden
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border ${
              selected ? "border-primary-foreground bg-primary-foreground" : "border-muted-foreground"
            }`}
          />
          <span className="leading-snug">{opt}</span>
        </button>
      );
    })}
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="self-start text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Clear selection
      </button>
    )}
  </div>
);

export default ChoiceRadio;
