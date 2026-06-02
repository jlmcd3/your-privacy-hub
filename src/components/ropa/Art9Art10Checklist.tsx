import { useEffect, useState } from "react";
import { AlertTriangle, CheckSquare } from "lucide-react";

/**
 * Art. 9 / Art. 10 self-check.
 *
 * Always-expanded helper section shown under the data_categories step.
 * Purely informational: it gives the user a structured way to spot special
 * category (Art. 9) or criminal-offence (Art. 10) data and shows the right
 * follow-up callout. It does NOT add inputs to the rule engine — the
 * compliance roster (mem://features/ropa-rules-v1) stays the source of
 * truth. State is persisted to sessionStorage keyed by activity id so the
 * user's ticks survive navigation within the session.
 */

const ART9_CATEGORIES: { key: string; label: string }[] = [
  { key: "racial_ethnic", label: "Racial or ethnic origin" },
  { key: "political", label: "Political opinions" },
  { key: "religious", label: "Religious or philosophical beliefs" },
  { key: "trade_union", label: "Trade union membership" },
  { key: "genetic", label: "Genetic data" },
  { key: "biometric_id", label: "Biometric data used to uniquely identify a person" },
  { key: "health", label: "Data concerning health" },
  { key: "sex_life", label: "Data concerning sex life or sexual orientation" },
];

const ART10_CATEGORIES: { key: string; label: string }[] = [
  {
    key: "criminal_convictions",
    label: "Personal data relating to criminal convictions and offences",
  },
];

interface Props {
  activityId: string;
}

export default function Art9Art10Checklist({ activityId }: Props) {
  const storageKey = `ropa-art9-art10-${activityId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      setTicked(raw ? JSON.parse(raw) : {});
    } catch {
      setTicked({});
    }
  }, [storageKey]);

  const update = (key: string, value: boolean) => {
    setTicked((prev) => {
      const next = { ...prev, [key]: value };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const anyArt9 = ART9_CATEGORIES.some((c) => ticked[c.key]);
  const anyArt10 = ART10_CATEGORIES.some((c) => ticked[c.key]);

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckSquare className="w-4 h-4 text-brand-teal" />
        <h4 className="text-sm font-semibold">
          Special category & criminal-offence self-check
        </h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Tick anything this activity actually processes. We'll surface the
        follow-up condition you'll need to document.
      </p>

      <div className="grid sm:grid-cols-2 gap-x-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            GDPR Art. 9 — Special categories
          </p>
          <ul className="space-y-1.5">
            {ART9_CATEGORIES.map((c) => (
              <li key={c.key}>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={!!ticked[c.key]}
                    onChange={(e) => update(c.key, e.target.checked)}
                  />
                  <span>{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 sm:mt-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            GDPR Art. 10 — Criminal offences
          </p>
          <ul className="space-y-1.5">
            {ART10_CATEGORIES.map((c) => (
              <li key={c.key}>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={!!ticked[c.key]}
                    onChange={(e) => update(c.key, e.target.checked)}
                  />
                  <span>{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consequence callouts — forked by which articles are ticked. When
          both are ticked we render Art. 9 first, then Art. 10, in sequence. */}
      {anyArt9 && (
        <ConsequenceCallout
          title="You'll need an Art. 9(2) condition"
          body={
            <>
              Art. 9(1) prohibits processing special categories unless one of
              the Art. 9(2) conditions applies — typically (a) explicit
              consent, (b) employment / social security / social protection
              law, (h) preventive or occupational medicine, or (g) substantial
              public interest based on Union or Member State law. Document the
              specific Art. 9(2) sub-paragraph you're relying on, the safeguards
              in place, and (where applicable) the basis in Union or Member
              State law.
            </>
          }
        />
      )}

      {anyArt10 && (
        <ConsequenceCallout
          title="You'll need an Art. 10 legal authority"
          body={
            <>
              Art. 10 limits criminal-conviction processing to where it is
              carried out under the control of official authority OR
              authorised by Union or Member State law providing appropriate
              safeguards for the rights and freedoms of data subjects.
              Document the specific Union or Member State law you rely on
              (and the safeguards it requires), or confirm official-authority
              control. Any comprehensive register of criminal convictions
              must be kept only under the control of official authority.
            </>
          }
        />
      )}
    </div>
  );
}

function ConsequenceCallout({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="mt-3 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-r-lg p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
            {title}
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-100 leading-snug">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
