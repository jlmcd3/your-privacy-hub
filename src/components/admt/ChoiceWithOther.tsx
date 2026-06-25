// src/components/admt/ChoiceWithOther.tsx
// A ChoiceRadio plus an "Other (describe)" escape hatch. Use wherever a preset
// list may not fit the user's real situation — the free text is captured so the
// generator assesses the user's actual case instead of a forced-fit preset.
import { ChoiceRadio } from "./ChoiceRadio";

export const OTHER_OPTION = "Other — my situation differs (describe)";

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  otherText: string;
  onOtherText: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  columns?: boolean;
};

export const ChoiceWithOther = ({
  options, value, onChange, otherText, onOtherText, onFocus, placeholder, columns,
}: Props) => {
  const opts = options.includes(OTHER_OPTION) ? options : [...options, OTHER_OPTION];
  return (
    <div className="space-y-2">
      <ChoiceRadio options={opts} value={value} onChange={onChange} onFocus={onFocus} columns={columns} />
      {value === OTHER_OPTION && (
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={2}
          value={otherText}
          onChange={(e) => onOtherText(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder || "Describe your situation in your own words — we'll assess what you actually do."}
        />
      )}
    </div>
  );
};

export default ChoiceWithOther;
