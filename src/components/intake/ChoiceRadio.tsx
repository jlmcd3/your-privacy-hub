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
  /** Accessible name for the group (ADMT F12). Prefer aria-labelledby. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Statute-rail hook; forwarded to the group element (was dropped before). */
  "data-rail-key"?: string;
  "data-field"?: string;
};

export const ChoiceRadio = ({ options, value, onChange, onFocus, columns, name, ...rest }: Props) => {
  // ADMT F12 (2026-09-15): arrow keys move the selection within the group,
  // as a native radio group does; Space/Enter on a focused option is the
  // button's own click. Deselect stays on click of the selected option.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const i = options.indexOf(value);
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const next = options[(i < 0 ? (dir > 0 ? 0 : options.length - 1) : (i + dir + options.length) % options.length)];
    onChange(next);
    const target = e.currentTarget.querySelector<HTMLElement>(`[data-opt="${CSS.escape(next)}"]`);
    target?.focus();
  };
  return (
  <div
    className={columns ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "flex flex-col gap-2"}
    onFocus={onFocus}
    onKeyDown={onKeyDown}
    role="radiogroup"
    data-name={name}
    {...rest}
  >
    {options.map((opt) => {
      const selected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          role="radio"
          data-opt={opt}
          aria-checked={selected}
          tabIndex={selected || (!value && opt === options[0]) ? 0 : -1}
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
};

export default ChoiceRadio;
