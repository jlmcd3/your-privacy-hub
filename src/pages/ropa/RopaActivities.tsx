import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { useRopaSessionParam, withSession, ROPA_SESSION_QS_KEY } from "@/lib/ropaSession";
import { toast } from "sonner";
import SectorPrimerDialog from "@/components/ropa/SectorPrimerDialog";

const SUPA = supabase as unknown as { from: (t: string) => any };

interface ActivityTemplate {
  id: string;
  template_key: string;
  display_name: string;
  description: string;
  category: string;
  is_high_risk: boolean;
  display_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  hr_employment: "HR & Employment",
  marketing: "Marketing",
  customer_service: "Customer Service",
  patient_records: "Patient Records",
  technology: "Technology",
  finance_legal: "Finance & Legal",
  third_party: "Third Party",
  operations: "Operations",
  other: "Other",
};

const SECTOR_DEFAULTS: Record<string, string[]> = {
  "Financial Services": [
    "hr_payroll", "hr_recruitment", "marketing_email", "customer_accounts",
    "customer_support", "customer_kyc", "customer_crm", "tech_it_systems",
    "finance_invoicing", "finance_credit", "legal_compliance", "third_party_vendors",
  ],
  Technology: [
    "hr_payroll", "hr_recruitment", "marketing_email", "marketing_analytics",
    "marketing_advertising", "customer_accounts", "customer_support",
    "tech_it_systems", "tech_cloud", "third_party_vendors",
  ],
  Healthcare: [
    "hr_payroll", "hr_recruitment", "customer_accounts", "customer_support",
    "tech_it_systems", "tech_security", "legal_compliance", "ops_research",
    "patient_medical_records", "patient_appointments", "patient_billing_insurance",
    "patient_telehealth", "patient_communications",
  ],
  Retail: [
    "hr_payroll", "hr_recruitment", "marketing_email", "marketing_analytics",
    "customer_accounts", "customer_support", "customer_crm", "finance_invoicing",
    "tech_it_systems", "third_party_vendors",
  ],
  Consulting: [
    "hr_payroll", "hr_recruitment", "customer_accounts", "customer_support",
    "customer_crm", "finance_invoicing", "legal_contracts", "third_party_vendors",
  ],
};

const FALLBACK_DEFAULTS = [
  "hr_payroll", "hr_recruitment", "marketing_email", "customer_accounts",
  "customer_support", "finance_invoicing", "tech_it_systems",
];

interface CustomActivity {
  id: string; // local
  display_name: string;
  description: string;
  category: string;
}

export default function RopaActivities() {
  const navigate = useNavigate();
  const { clientId } = useActiveClient();
  const urlSessionId = useRopaSessionParam();
  const [, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [openCategory, setOpenCategory] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sector, setSector] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Activities that already exist for this session (from a previous visit).
  // Keyed by template_key for templated rows; custom rows are keyed by id.
  const [existingTemplateKeys, setExistingTemplateKeys] = useState<Set<string>>(
    new Set()
  );
  const [existingFirstActivityId, setExistingFirstActivityId] = useState<
    string | null
  >(null);
  const [existingCount, setExistingCount] = useState(0);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [primerEvaluated, setPrimerEvaluated] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const { data: tmpls } = await SUPA.from("ropa_activity_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      const { data: cli } = await SUPA.from("clients")
        .select("sector")
        .eq("id", clientId)
        .single();

      // Prefer the session passed in via `?session=`. Validate it belongs to
      // the current client. Otherwise fall back to "latest non-archived".
      let resolved: { id: string } | null = null;
      if (urlSessionId) {
        const { data } = await SUPA.from("ropa_sessions")
          .select("id, client_id, status")
          .eq("id", urlSessionId)
          .maybeSingle();
        if (
          data &&
          data.client_id === clientId &&
          ["in_progress", "review"].includes(data.status)
        ) {
          resolved = { id: data.id };
        }
      }
      if (!resolved) {
        const { data } = await SUPA.from("ropa_sessions")
          .select("id")
          .eq("client_id", clientId)
          .in("status", ["in_progress", "review"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        resolved = data ?? null;
      }

      if (cancelled) return;
      setTemplates((tmpls ?? []) as ActivityTemplate[]);
      setSector(cli?.sector ?? "");
      setSessionId(resolved?.id ?? null);

      // Lock the URL to this session so back-nav from later steps lands here.
      if (resolved?.id && resolved.id !== urlSessionId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set(ROPA_SESSION_QS_KEY, resolved!.id);
            return next;
          },
          { replace: true }
        );
      }

      // Load any activities already attached to this session so the user
      // sees their previous picks pre-selected when they navigate back here.
      if (resolved?.id) {
        const { data: existing } = await SUPA.from(
          "ropa_processing_activities"
        )
          .select("id, template_key")
          .eq("session_id", resolved.id)
          .order("display_order", { ascending: true });
        if (cancelled) return;
        const keys = new Set<string>();
        for (const a of (existing ?? []) as {
          id: string;
          template_key: string | null;
        }[]) {
          if (a.template_key) keys.add(a.template_key);
        }
        setExistingTemplateKeys(keys);
        setExistingCount((existing ?? []).length);
        setExistingFirstActivityId(
          (existing ?? [])[0]?.id ?? null
        );
        // Pre-tick the templated activities so the UI reflects current state.
        setSelected((prev) => {
          const next = new Set(prev);
          for (const k of keys) next.add(k);
          return next;
        });
      } else {
        setExistingTemplateKeys(new Set());
        setExistingCount(0);
        setExistingFirstActivityId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, urlSessionId, setSearchParams]);

  // Show the sector primer once per RoPA session, immediately after sector
  // selection, before any activity has been added. Dismissal is tracked in
  // sessionStorage so the modal never reappears for this session.
  useEffect(() => {
    if (primerEvaluated) return;
    if (!sessionId || !sector) return;
    if (existingCount > 0) {
      setPrimerEvaluated(true);
      return;
    }
    const key = `ropa-primer-dismissed-${sessionId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key) === "1") {
      setPrimerEvaluated(true);
      return;
    }
    setPrimerOpen(true);
    setPrimerEvaluated(true);
  }, [sessionId, sector, existingCount, primerEvaluated]);

  const dismissPrimer = () => {
    if (sessionId && typeof window !== "undefined") {
      sessionStorage.setItem(`ropa-primer-dismissed-${sessionId}`, "1");
    }
    setPrimerOpen(false);
  };

  const useSampleAsFirstActivity = (sample: { label: string; description: string }) => {
    setCustomActivities((cs) => [
      ...cs,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        display_name: sample.label,
        description: sample.description,
        category: "other",
      },
    ]);
    dismissPrimer();
  };

  const grouped = useMemo(() => {
    const g: Record<string, ActivityTemplate[]> = {};
    for (const t of templates) {
      g[t.category] ||= [];
      g[t.category].push(t);
    }
    return g;
  }, [templates]);

  const totalSelected = selected.size + customActivities.length;

  const loadTypical = () => {
    const defaults = SECTOR_DEFAULTS[sector] ?? FALLBACK_DEFAULTS;
    const next = new Set(selected);
    const nextOpen = { ...openCategory };
    for (const key of defaults) {
      next.add(key);
      const tmpl = templates.find((t) => t.template_key === key);
      if (tmpl) nextOpen[tmpl.category] = true;
    }
    setSelected(next);
    setOpenCategory(nextOpen);
  };

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const addCustom = (category: string, name: string, description: string) => {
    if (!name.trim()) return;
    setCustomActivities((cs) => [
      ...cs,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        display_name: name.trim(),
        description: description.trim(),
        category,
      },
    ]);
  };

  const removeCustom = (id: string) => {
    setCustomActivities((cs) => cs.filter((c) => c.id !== id));
  };

  const beginDocumenting = async () => {
    if (!clientId || !sessionId) {
      toast.error("Complete setup first.");
      navigate("/ropa/setup?new=1");
      return;
    }
    if (totalSelected === 0) return;

    setSubmitting(true);
    try {
      // Only insert template_keys that aren't already attached to this
      // session, so coming back here and clicking "Begin documenting" again
      // doesn't create duplicates. We intentionally don't delete unchecked
      // existing activities — use the delete button in the Q&A sidebar for
      // that, which also wipes their answers/flags.
      const newTemplateKeys = Array.from(selected).filter(
        (key) => !existingTemplateKeys.has(key)
      );

      const rows = [
        ...newTemplateKeys.map((key) => {
          const t = templates.find((x) => x.template_key === key)!;
          return {
            session_id: sessionId,
            client_id: clientId,
            template_key: key,
            display_name: t.display_name,
            category: t.category,
            is_high_risk: t.is_high_risk,
            display_order: t.display_order,
          };
        }),
        ...customActivities.map((c, i) => ({
          session_id: sessionId,
          client_id: clientId,
          template_key: null,
          display_name: c.display_name,
          category: c.category,
          is_high_risk: false,
          display_order: 9000 + i,
        })),
      ];

      let firstNewId: string | null = null;
      if (rows.length > 0) {
        const { data: inserted, error } = await SUPA.from(
          "ropa_processing_activities"
        )
          .insert(rows)
          .select("id");
        if (error) throw error;
        firstNewId = inserted?.[0]?.id ?? null;
      }

      // Update total_activities to reflect every row now attached.
      await SUPA.from("ropa_sessions")
        .update({
          total_activities: existingCount + rows.length,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      const goToId = firstNewId ?? existingFirstActivityId;
      if (goToId) {
        navigate(withSession(`/ropa/activity/${goToId}`, sessionId));
      } else {
        navigate(`/ropa/review/${sessionId}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not create activities. Try again.");
    } finally {
      setSubmitting(false);
    }
  };


  if (!clientId) {
    return (
      <RopaShell title="Select Activities — RoPA Builder" heading="Select Activities">
        <p className="text-muted-foreground">
          Select an organisation from the switcher to begin.
        </p>
      </RopaShell>
    );
  }

  return (
    <RopaShell title="Select Activities — RoPA Builder" heading="">
      <SectorPrimerDialog
        open={primerOpen}
        sector={sector}
        onDismiss={dismissPrimer}
        onUseSampleActivity={useSampleAsFirstActivity}
      />
      {(() => {
        const { steps, currentIndex } = getRopaSteps("activities", sessionId);
        return <RopaBreadcrumb steps={steps} currentIndex={currentIndex} />;
      })()}

      {existingCount > 0 && existingFirstActivityId && (
        <div className="mb-4 p-3 border border-border rounded-lg bg-muted/30 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            You already have <strong>{existingCount}</strong> activit
            {existingCount === 1 ? "y" : "ies"} added to this RoPA. Your previous
            picks are pre-selected below. Add more or jump straight back into Q&amp;A.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                navigate(
                  withSession(
                    `/ropa/activity/${existingFirstActivityId}`,
                    sessionId
                  )
                )
              }
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
              Continue to Q&amp;A
            </button>
          </div>
        </div>
      )}

      <button
        onClick={loadTypical}
        className="w-full bg-foreground text-background font-semibold text-sm px-4 py-2.5 rounded-lg mb-4 text-left"
      >
        Prefill typical activities for {sector || "your sector"} and adjust as needed →
      </button>



      <div className="space-y-3 mb-32">
        {Object.entries(grouped).map(([cat, items]) => (
          <details
            key={cat}
            open={openCategory[cat] ?? false}
            onToggle={(e) =>
              setOpenCategory((s) => ({
                ...s,
                [cat]: (e.target as HTMLDetailsElement).open,
              }))
            }
            className="border border-border rounded-lg bg-card"
          >
            <summary className="cursor-pointer px-4 py-3 font-semibold text-sm flex items-center justify-between">
              <span>{CATEGORY_LABELS[cat] ?? cat}</span>
              <span className="text-xs text-muted-foreground">
                {items.filter((i) => selected.has(i.template_key)).length}/
                {items.length} selected
              </span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {items.map((t) => (
                <label
                  key={t.id}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(t.template_key)}
                    onChange={() => toggle(t.template_key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {t.display_name}
                      </span>
                      {t.is_high_risk && (
                        <span className="text-xs bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded">
                          May require DPIA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </label>
              ))}

              {customActivities
                .filter((c) => c.category === cat)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 p-3 border border-primary/40 rounded-lg bg-primary/5"
                  >
                    <input type="checkbox" checked readOnly className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {c.display_name}
                        </span>
                        <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                          Custom
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeCustom(c.id)}
                      className="text-xs underline text-muted-foreground"
                    >
                      Remove
                    </button>
                  </div>
                ))}

              <CustomActivityForm
                onAdd={(name, desc) => addCustom(cat, name, desc)}
              />
            </div>
          </details>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40">
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">
              {totalSelected} {totalSelected === 1 ? "activity" : "activities"}{" "}
              selected
            </p>
            <p className="text-xs text-muted-foreground">
              Answering questions is free · Document generation $40 (subscribers) or $79 standalone
            </p>
          </div>
          <button
            disabled={totalSelected === 0 || submitting}
            onClick={beginDocumenting}
            className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Begin documenting →"}
          </button>
        </div>
      </div>
    </RopaShell>
  );
}

function CustomActivityForm({
  onAdd,
}: {
  onAdd: (name: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm underline text-primary"
      >
        + Add activity not listed
      </button>
    );
  }
  return (
    <div className="p-3 border border-dashed border-border rounded-lg space-y-2">
      <input
        type="text"
        placeholder="Activity name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
      />
      <input
        type="text"
        placeholder="Short description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name, desc);
            setName("");
            setDesc("");
            setOpen(false);
          }}
          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          Add
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setName("");
            setDesc("");
          }}
          className="text-xs underline text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
