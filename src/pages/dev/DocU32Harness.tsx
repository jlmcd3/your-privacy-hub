/**
 * Doc U U3-2 preview-only dev harness for AssistedInput + AssertionLevel
 * re-parenting proof. NOT LINKED FROM NAV. Read-only, no submission.
 * Renders each of the six Risk pilot pill sets with the AssertionLevel
 * mounted in the assertion slot, mirroring the wired production
 * composition so re-parented behaviour can be verified visually.
 *
 * IMPROVEMENT_KIT_ENABLED must be true for the assertion slot to render.
 */
import { useState } from "react";
import { AssistedInput } from "@/components/AssistedInput";
import { AssertionLevel } from "@/components/cppa/AssertionLevel";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import {
  IMPROVEMENT_KIT_ENABLED,
  type AssertionEntry,
} from "@/config/improvementKit";

const FIELDS = [
  "q19_admt_description",
  "i5_admt_training_source",
  "i5_admt_fairness_testing",
  "i5_admt_human_review",
  "i7_internal_contributors",
  "i7_external_consultees",
] as const;

export default function DocU32Harness() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f, ""])),
  );
  const [assertions, setAssertions] = useState<
    Record<string, AssertionEntry | undefined>
  >({});

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="border-b pb-3">
        <h1 className="text-xl font-semibold">
          Doc U U3-2 harness — AssistedInput + AssertionLevel re-parenting
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Preview-only. Flag: IMPROVEMENT_KIT_ENABLED =
          {" "}<span className="font-mono">{String(IMPROVEMENT_KIT_ENABLED)}</span>.
        </p>
      </header>

      {FIELDS.map((fid) => {
        const cfg = ASSISTED_INPUT_REGISTRY[fid];
        if (!cfg) return null;
        return (
          <section key={fid} data-harness-field={fid} className="space-y-2">
            <h2 className="text-sm font-semibold font-mono">{fid}</h2>
            <AssistedInput
              value={values[fid] ?? ""}
              onChange={(next) =>
                setValues((prev) => ({ ...prev, [fid]: next }))
              }
              pills={cfg.pills}
              rows={2}
              useExhibit={fid.startsWith("i7_")}
              placeholder={fid}
              assertionSlot={
                IMPROVEMENT_KIT_ENABLED ? (
                  <AssertionLevel
                    fieldId={fid}
                    value={assertions[fid]}
                    onChange={(next) =>
                      setAssertions((prev) => {
                        const copy = { ...prev };
                        if (next === undefined) delete copy[fid];
                        else copy[fid] = next;
                        return copy;
                      })
                    }
                  />
                ) : null
              }
            />
          </section>
        );
      })}
    </div>
  );
}
