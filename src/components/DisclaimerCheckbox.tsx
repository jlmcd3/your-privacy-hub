interface DisclaimerCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Pre-generation acknowledgment placed on every tool intake screen,
 * immediately above the generate / purchase button.
 *
 * Important: this is a RECORD, not a GATE. It does not block submission.
 * The corresponding row written to `tool_acknowledgments` simply timestamps
 * that the user was shown and accepted the disclaimer at the time of generation.
 */
export default function DisclaimerCheckbox({ checked, onChange }: DisclaimerCheckboxProps) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0 accent-amber-600"
      />
      <span className="text-[11px] text-amber-800 leading-relaxed">
        This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.
      </span>
    </label>
  );
}
