import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type SaveState = "idle" | "saving" | "saved";

interface AutosaveIndicatorProps {
  /** Pass a value that changes whenever a save occurs (e.g. a timestamp) */
  savedAt?: Date | null;
  /** Pass true while a save is in progress */
  saving?: boolean;
  className?: string;
}

export function AutosaveIndicator({
  savedAt,
  saving = false,
  className = "",
}: AutosaveIndicatorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (saving) {
      setSaveState("saving");
      return;
    }
    if (savedAt) {
      setSaveState("saved");
      const t = setTimeout(() => setSaveState("idle"), 4000);
      return () => clearTimeout(t);
    }
  }, [saving, savedAt]);

  if (saveState === "idle") return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs transition-opacity duration-300 ${className}`}
      style={{ color: saveState === "saved" ? "#059669" : "#94a3b8" }}
      aria-live="polite"
    >
      {saveState === "saving" ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Check className="w-3 h-3" />
          Saved
          {savedAt && (
            <span className="text-slate-400 ml-0.5">
              {savedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </>
      )}
    </span>
  );
}

export default AutosaveIndicator;
