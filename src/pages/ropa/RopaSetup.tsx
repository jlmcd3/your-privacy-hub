import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRopaSessionParam, withSession } from "@/lib/ropaSession";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useRopaStore } from "@/stores/ropaStore";
import { RopaShell } from "@/components/ropa/RopaShell";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { SECTORS } from "@/constants/sectors";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from 'lucide-react';


const SUPA = supabase as unknown as { from: (t: string) => any };

type EmployeeBand = "<50" | "50-249" | "250-999" | "1000+";

interface Profile {
  legal_entity_type: string;
  registered_address: string;
  registration_number: string;
  incorporation_jurisdiction: string;
  employee_band: EmployeeBand | "";
  is_controller: boolean;
  is_processor: boolean;
  has_dpo: "yes" | "no" | "";
  dpo_name: string;
  dpo_email: string;
  dpo_phone: string;
  eu_rep_name: string;
  eu_rep_email: string;
  uk_rep_name: string;
  uk_rep_email: string;
  rights_handling_process: string;
}

const EMPTY_PROFILE: Profile = {
  legal_entity_type: "",
  registered_address: "",
  registration_number: "",
  incorporation_jurisdiction: "",
  employee_band: "",
  is_controller: true,
  is_processor: false,
  has_dpo: "",
  dpo_name: "",
  dpo_email: "",
  dpo_phone: "",
  eu_rep_name: "",
  eu_rep_email: "",
  uk_rep_name: "",
  uk_rep_email: "",
  rights_handling_process: "",
};


const ENTITY_TYPES = [
  "Limited company",
  "LLC",
  "Partnership",
  "Sole trader",
  "Charity",
  "Public body",
  "Other",
];

const PRIMARY_REGIONS = [
  { code: "EU_EEA", label: "EU / EEA" },
  { code: "UK", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "BR", label: "Brazil" },
  { code: "APAC", label: "Asia-Pacific" },
  { code: "OTHER", label: "Other" },
];

interface Jurisdiction {
  code: string;
  name: string;
  region: string;
}

const JURISDICTIONS: Jurisdiction[] = [
  // EU / EEA
  { code: "EU_GDPR", name: "EU GDPR", region: "EU & UK" },
  { code: "UK_GDPR", name: "UK GDPR / Data Protection Act 2018", region: "EU & UK" },
  { code: "CH_FADP", name: "Switzerland (revFADP)", region: "EU & UK" },
  // US
  { code: "US_CCPA", name: "California (CCPA/CPRA)", region: "United States" },
  { code: "US_VA", name: "Virginia (VCDPA)", region: "United States" },
  { code: "US_CO", name: "Colorado (CPA)", region: "United States" },
  { code: "US_CT", name: "Connecticut (CTDPA)", region: "United States" },
  { code: "US_TX", name: "Texas (TDPSA)", region: "United States" },
  { code: "US_FL", name: "Florida (FDBR)", region: "United States" },
  // Americas
  { code: "BR_LGPD", name: "Brazil (LGPD)", region: "Americas" },
  { code: "CA_PIPEDA", name: "Canada (PIPEDA)", region: "Americas" },
  // APAC
  { code: "CN_PIPL", name: "China (PIPL)", region: "Asia-Pacific" },
  { code: "JP_APPI", name: "Japan (APPI)", region: "Asia-Pacific" },
  { code: "KR_PIPA", name: "South Korea (PIPA)", region: "Asia-Pacific" },
  { code: "AU_PRIVACY", name: "Australia (Privacy Act)", region: "Asia-Pacific" },
  { code: "IN_DPDPA", name: "India (DPDPA)", region: "Asia-Pacific" },
  // Other
  { code: "ZA_POPIA", name: "South Africa (POPIA)", region: "Other" },
];

const SUGGESTED_BY_REGION: Record<string, string[]> = {
  EU_EEA: ["EU_GDPR", "UK_GDPR", "CH_FADP"],
  UK: ["UK_GDPR", "EU_GDPR"],
  US: ["US_CCPA", "US_VA", "US_CO", "US_CT", "US_TX"],
  BR: ["BR_LGPD"],
  APAC: ["JP_APPI", "AU_PRIVACY", "KR_PIPA", "IN_DPDPA"],
  OTHER: ["EU_GDPR"],
};

const STEPS = [
  "Identity",
  "Data roles",
  "DPO",
  "Home base",
  "Jurisdictions",
  "Review",
];

function useDebouncedAutoSave(
  fn: () => Promise<void>,
  deps: unknown[],
  setStatus: (s: "idle" | "saving" | "saved") => void,
  delay = 800
) {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await fn();
        setStatus("saved");
      } catch {
        setStatus("idle");
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function RopaSetup() {
  const navigate = useNavigate();
  const { clientId, client } = useActiveClient();
  const createSession = useRopaStore((s) => s.createSession);
  const urlSessionId = useRopaSessionParam();
  const [searchParams] = useSearchParams();
  // `?new=1` forces a brand-new RoPA: do NOT resume any in-progress session
  // and do NOT hydrate the form from the workspace-scoped profile.
  const forceNew = searchParams.get("new") === "1";

  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [sector, setSector] = useState<string>("");
  const [primaryRegion, setPrimaryRegion] = useState<string>("");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Set<string>>(
    new Set()
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [hasExistingSession, setHasExistingSession] = useState<string | null>(null);

  // Load existing profile + session on mount.
  //
  // IMPORTANT: profile + jurisdiction rows are stored against `client_id` and
  // therefore persist on a personal workspace across multiple RoPAs. We must
  // only PRE-FILL the form when this Setup is resuming an actual session
  // (either a session id passed in the URL or a non-archived in-progress
  // session for this workspace). When the user is starting a brand new RoPA
  // — i.e. no in-progress session exists — the form must come up blank so
  // the previous RoPA's DPO / EU rep / jurisdictions / org name do not leak
  // into the new one.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      // When forceNew is set, skip both lookups — start completely blank.
      if (forceNew) {
        setHasExistingSession(null);
        setProfile(EMPTY_PROFILE);
        setSelectedJurisdictions(new Set());
        setOrgName("");
        return;
      }

      // First, figure out whether we are resuming an editable session.
      let sess: { id: string; status: string; org_name: string | null } | null = null;
      if (urlSessionId) {
        const { data } = await SUPA.from("ropa_sessions")
          .select("id, status, client_id, org_name")
          .eq("id", urlSessionId)
          .maybeSingle();
        if (
          data &&
          data.client_id === clientId &&
          ["in_progress", "review"].includes(data.status)
        ) {
          sess = { id: data.id, status: data.status, org_name: data.org_name ?? null };
        }
      }
      if (!sess) {
        const { data } = await SUPA.from("ropa_sessions")
          .select("id, status, org_name")
          .eq("client_id", clientId)
          .in("status", ["in_progress", "review"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sess = data ? { id: data.id, status: data.status, org_name: data.org_name ?? null } : null;
      }
      if (cancelled) return;
      if (sess) setHasExistingSession(sess.id);

      // Only hydrate the form from the workspace-scoped profile / jurisdictions
      // when we are resuming an existing session. Brand-new RoPAs start blank.
      if (!sess) {
        setProfile(EMPTY_PROFILE);
        setSelectedJurisdictions(new Set());
        setOrgName("");
        return;
      }

      if (sess.org_name) setOrgName(sess.org_name);

      const { data: prof } = await SUPA.from("ropa_client_profiles")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (cancelled) return;
      if (prof) {
        setProfile((p) => ({
          ...p,
          legal_entity_type: prof.legal_entity_type ?? "",
          registered_address: prof.registered_address ?? "",
          registration_number: prof.registration_number ?? "",
          incorporation_jurisdiction: prof.incorporation_jurisdiction ?? "",
          rights_handling_process: prof.rights_handling_process ?? "",

          employee_band: (prof.employee_band as EmployeeBand) ?? "",
          is_controller: prof.is_controller ?? true,
          is_processor: prof.is_processor ?? false,
          has_dpo: prof.dpo_email ? "yes" : "",
          dpo_name: prof.dpo_name ?? "",
          dpo_email: prof.dpo_email ?? "",
          dpo_phone: prof.dpo_phone ?? "",
          eu_rep_name: prof.eu_rep_name ?? "",
          eu_rep_email: prof.eu_rep_email ?? "",
          uk_rep_name: prof.uk_rep_name ?? "",
          uk_rep_email: prof.uk_rep_email ?? "",
        }));
      }
      const { data: jurs } = await SUPA.from("ropa_jurisdiction_selections")
        .select("jurisdiction_code")
        .eq("client_id", clientId);
      if (cancelled) return;
      if (jurs?.length) {
        setSelectedJurisdictions(
          new Set(jurs.map((j: { jurisdiction_code: string }) => j.jurisdiction_code))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, urlSessionId, forceNew]);

  // Auto-save profile on change
  useDebouncedAutoSave(
    async () => {
      if (!clientId) return;
      await SUPA.from("ropa_client_profiles").upsert(
        {
          client_id: clientId,
          legal_entity_type: profile.legal_entity_type || null,
          registered_address: profile.registered_address || null,
          registration_number: profile.registration_number || null,
          incorporation_jurisdiction: profile.incorporation_jurisdiction || null,
          rights_handling_process: profile.rights_handling_process || null,

          employee_band: profile.employee_band || null,
          is_controller: profile.is_controller,
          is_processor: profile.is_processor,
          dpo_name: profile.dpo_name || null,
          dpo_email: profile.dpo_email || null,
          dpo_phone: profile.dpo_phone || null,
          eu_rep_name: profile.eu_rep_name || null,
          eu_rep_email: profile.eu_rep_email || null,
          uk_rep_name: profile.uk_rep_name || null,
          uk_rep_email: profile.uk_rep_email || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" }
      );
    },
    [profile, clientId],
    setSaveStatus
  );

  const orgIsNonEUUK = primaryRegion !== "EU_EEA" && primaryRegion !== "UK";
  const showEURep =
    orgIsNonEUUK && selectedJurisdictions.has("EU_GDPR");
  const showUKRep =
    orgIsNonEUUK && selectedJurisdictions.has("UK_GDPR");

  const jurisdictionsByRegion = useMemo(() => {
    const grouped: Record<string, Jurisdiction[]> = {};
    for (const j of JURISDICTIONS) {
      grouped[j.region] ||= [];
      grouped[j.region].push(j);
    }
    return grouped;
  }, []);

  const canProceed = (() => {
    switch (step) {
      case 0:
        return (
          orgName.trim().length > 0 &&
          profile.legal_entity_type &&
          sector &&
          profile.employee_band
        );
      case 1:
        return profile.is_controller || profile.is_processor;
      case 2:
        return profile.has_dpo !== "";
      case 3:
        return primaryRegion !== "";
      case 4:
        return selectedJurisdictions.size >= 1;
      default:
        return true;
    }
  })();

  const applySuggested = () => {
    if (!primaryRegion) return;
    const next = new Set(selectedJurisdictions);
    for (const code of SUGGESTED_BY_REGION[primaryRegion] ?? []) next.add(code);
    setSelectedJurisdictions(next);
  };

  const toggleJur = (code: string) => {
    const next = new Set(selectedJurisdictions);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelectedJurisdictions(next);
  };

  const handleConfirm = async () => {
    if (!clientId) {
      setValidationError("Select an organisation first");
      return;
    }
    setValidationError(null);
    setSubmitting(true);

    try {
      // Store sector on the workspace, but NEVER rename the workspace itself —
      // the org being documented in this RoPA is recorded on the session.
      // This write is the canonical source for the sector value used by the
      // RoPA document generator; log the values for traceability.
      console.log("[RopaSetup] writing sector to clients", { clientId, sector: sector || null });
      await SUPA.from("clients")
        .update({ sector: sector || null })
        .eq("id", clientId);

      // Replace jurisdiction selections
      await SUPA.from("ropa_jurisdiction_selections")
        .delete()
        .eq("client_id", clientId);
      const rows = Array.from(selectedJurisdictions).map((code) => {
        const j = JURISDICTIONS.find((x) => x.code === code)!;
        return {
          client_id: clientId,
          jurisdiction_code: code,
          jurisdiction_name: j.name,
          jurisdiction_region: j.region,
        };
      });
      if (rows.length)
        await SUPA.from("ropa_jurisdiction_selections").insert(rows);

      // Create or reuse session, then save the org name on the session.
      let sessionId = hasExistingSession;
      if (!sessionId) sessionId = await createSession(clientId);
      await SUPA.from("ropa_sessions")
        .update({ org_name: orgName.trim() || null })
        .eq("id", sessionId);

      navigate(withSession("/ropa/activities", sessionId));

    } catch (e) {
      setValidationError("Could not save setup. Please try again.");
      console.error(e);

    } finally {
      setSubmitting(false);
    }
  };

  if (!clientId) {
    return (
      <RopaShell title="Setup — RoPA Builder" heading="Setup — RoPA Builder">
        <p className="text-muted-foreground">
          Select an organisation from the switcher to begin.
        </p>
      </RopaShell>
    );
  }

  return (
    <RopaShell title="Setup — RoPA Builder" heading="Setup — RoPA Builder">
      <div className="flex justify-between items-start mb-4">
        <RopaBreadcrumb
          steps={STEPS.map((label) => ({ label }))}
          currentIndex={step}
        />
        <AutosaveIndicator
          saving={saveStatus === "saving"}
          savedAt={saveStatus === "saved" ? new Date() : null}
          className="ml-4 mt-1"
        />
      </div>

      {hasExistingSession && step === 0 && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-muted/30 flex items-center justify-between gap-4">
          <p className="text-sm">
            You have an in-progress RoPA session for this organisation.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(withSession("/ropa/activities", hasExistingSession))}
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setHasExistingSession(null);
                setProfile(EMPTY_PROFILE);
                setSelectedJurisdictions(new Set());
                setOrgName("");
                setPrimaryRegion("");
                setStep(0);
              }}
              className="text-sm underline text-muted-foreground"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-6">
        {/* STEP 1 — Identity */}
        {step === 0 && (
          <>
            <h2 className="font-serif">Tell us about your organisation</h2>
            <Field label="Organisation name" required>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </Field>
            <Field label="Legal entity type" required>
              <select
                value={profile.legal_entity_type}
                onChange={(e) =>
                  setProfile({ ...profile, legal_entity_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">— Select —</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Registered address">
              <textarea
                rows={3}
                value={profile.registered_address}
                onChange={(e) =>
                  setProfile({ ...profile, registered_address: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Why we ask: Art.30(1)(a) requires the record to give the name and
                contact details of the controller. The CNIL Article 30 register
                model records the registered address of the entity.
              </p>
            </Field>
            <Field label="Company / registration number">
              <input
                type="text"
                value={profile.registration_number}
                onChange={(e) =>
                  setProfile({ ...profile, registration_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Why we ask: it identifies the controller unambiguously for
                Art.30(1)(a) purposes where group entities share a trading name.
              </p>
            </Field>
            <Field label="Incorporation jurisdiction">
              <input
                type="text"
                value={profile.incorporation_jurisdiction}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    incorporation_jurisdiction: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Why we ask: the place of incorporation drives establishment
                analysis and whether an Art.27 representative is needed, and the
                CNIL register model records it alongside the controller's identity.
              </p>
            </Field>

            <Field label="Primary industry sector" required>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">— Select —</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Employee band" required>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["<50", "50-249", "250-999", "1000+"] as EmployeeBand[]).map(
                  (b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() =>
                        setProfile({ ...profile, employee_band: b })
                      }
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        profile.employee_band === b
                          ? "border-primary bg-primary/10 font-semibold"
                          : "border-border"
                      }`}
                    >
                      {b === "<50" ? "Under 50" : b}
                    </button>
                  )
                )}
              </div>
            </Field>
            <p className="text-xs text-muted-foreground">
              Smaller organisations have a narrower formal RoPA obligation, but
              this tool covers all sizes equally.
            </p>
          </>
        )}

        {/* STEP 2 — Data roles */}
        {step === 1 && (
          <>
            <h2 className="font-serif">What is your role?</h2>
            <p className="text-sm text-muted-foreground">
              Most organisations are controllers. You can be both.
            </p>
            <RoleCard
              label="Controller"
              description="You decide why and how personal data is processed."
              checked={profile.is_controller}
              onChange={(v) => setProfile({ ...profile, is_controller: v })}
            />
            <RoleCard
              label="Processor"
              description="You process personal data on behalf of another organisation."
              checked={profile.is_processor}
              onChange={(v) => setProfile({ ...profile, is_processor: v })}
            />
            {!profile.is_controller && !profile.is_processor && (
              <p className="text-sm text-destructive">
                Select at least one role.
              </p>
            )}
          </>
        )}

        {/* STEP 3 — DPO */}
        {step === 2 && (
          <>
            <h2 className="font-serif">
              Do you have a Data Protection Officer?
            </h2>
            <div className="flex flex-col md:flex-row gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setProfile({ ...profile, has_dpo: v })}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm capitalize ${
                    profile.has_dpo === v
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {profile.has_dpo === "yes" && (
              <div className="space-y-3 pt-2">
                <Field label="DPO name">
                  <input
                    type="text"
                    value={profile.dpo_name}
                    onChange={(e) =>
                      setProfile({ ...profile, dpo_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </Field>
                <Field label="DPO email">
                  <input
                    type="email"
                    value={profile.dpo_email}
                    onChange={(e) =>
                      setProfile({ ...profile, dpo_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </Field>
                <Field label="DPO phone">
                  <input
                    type="tel"
                    value={profile.dpo_phone}
                    onChange={(e) =>
                      setProfile({ ...profile, dpo_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </Field>
              </div>
            )}
            {/* RC-Cleanup3: legacy has_dpo === "unsure" is no longer stored; the
                DPO recommendation block below renders only for a definite "no".
                Legacy rows with "unsure" render as unselected (no button
                highlighted) and the block is hidden until the user re-answers. */}
            {profile.has_dpo === "no" &&
              profile.employee_band === "<50" && (
                <div className="p-3 bg-muted/40 border border-border rounded-lg text-sm text-muted-foreground">
                  Under-50 organisations are rarely required to appoint a DPO.
                  We'll skip representative fields for now.
                </div>
              )}
            <Field label="Rights-handling process">
              <textarea
                rows={3}
                value={profile.rights_handling_process}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    rights_handling_process: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Why we ask: how access, erasure, objection, and portability
                requests reach you, are verified, and are fulfilled. The CNIL
                register model records this once for the organisation; any
                activity that handles requests differently can override it.
              </p>
            </Field>
          </>

        )}

        {/* STEP 4 — Primary jurisdiction */}
        {step === 3 && (
          <>
            <h2 className="font-serif">Where are you based?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRIMARY_REGIONS.map((r) => (
                <button
                  key={r.code}
                  onClick={() => setPrimaryRegion(r.code)}
                  className={`p-4 rounded-lg border text-left ${
                    primaryRegion === r.code
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 5 — Jurisdictions */}
        {step === 4 && (
          <>
            <h2 className="font-serif">
              Where do you operate, and whose personal data do you process?
            </h2>
            <button
              onClick={applySuggested}
              disabled={!primaryRegion}
              className="w-full bg-primary text-primary-foreground font-semibold px-4 py-3 rounded-lg disabled:opacity-50"
            >
              Show suggested jurisdictions for{" "}
              {PRIMARY_REGIONS.find((r) => r.code === primaryRegion)?.label ??
                "your home base"}{" "}
              →
            </button>
            <div className="space-y-4">
              {Object.entries(jurisdictionsByRegion).map(([region, items]) => (
                <details
                  key={region}
                  open={items.some((j) => selectedJurisdictions.has(j.code))}
                  className="border border-border rounded-lg"
                >
                  <summary className="cursor-pointer px-4 py-3 font-semibold text-sm">
                    {region}
                  </summary>
                  <div className="p-4 pt-0 space-y-2">
                    {items.map((j) => (
                      <label
                        key={j.code}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedJurisdictions.has(j.code)}
                          onChange={() => toggleJur(j.code)}
                        />
                        {j.name}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            {selectedJurisdictions.has("CN_PIPL") && (
              <div className="p-3 border border-border rounded-lg bg-muted/40 text-sm">
                <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> China PIPL imposes data localisation. You may need to keep
                personal data of Chinese residents within China.
              </div>
            )}
            {(showEURep || showUKRep) && (
              <div className="p-4 border border-border rounded-lg space-y-3">
                <p className="text-sm font-semibold">
                  Representative details required
                </p>
                {showEURep && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="EU representative name">
                      <input
                        type="text"
                        value={profile.eu_rep_name}
                        onChange={(e) =>
                          setProfile({ ...profile, eu_rep_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </Field>
                    <Field label="EU representative email">
                      <input
                        type="email"
                        value={profile.eu_rep_email}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            eu_rep_email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </Field>
                  </div>
                )}
                {showUKRep && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="UK representative name">
                      <input
                        type="text"
                        value={profile.uk_rep_name}
                        onChange={(e) =>
                          setProfile({ ...profile, uk_rep_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </Field>
                    <Field label="UK representative email">
                      <input
                        type="email"
                        value={profile.uk_rep_email}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            uk_rep_email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* STEP 6 — Review */}
        {step === 5 && (
          <>
            <h2 className="font-serif">Review &amp; confirm</h2>
            <ReviewRow
              label="Organisation"
              value={`${orgName} · ${profile.legal_entity_type} · ${sector}`}
              onEdit={() => setStep(0)}
            />
            <ReviewRow
              label="Employees"
              value={profile.employee_band || "—"}
              onEdit={() => setStep(0)}
            />
            <ReviewRow
              label="Roles"
              value={[
                profile.is_controller && "Controller",
                profile.is_processor && "Processor",
              ]
                .filter(Boolean)
                .join(", ") || "—"}
              onEdit={() => setStep(1)}
            />
            <ReviewRow
              label="DPO"
              value={
                profile.has_dpo === "yes"
                  ? `${profile.dpo_name || "(unnamed)"} — ${
                      profile.dpo_email || "no email"
                    }`
                  : profile.has_dpo === "no"
                    ? "None"
                    : "Not answered"
              }
              onEdit={() => setStep(2)}
            />
            <ReviewRow
              label="Home base"
              value={
                PRIMARY_REGIONS.find((r) => r.code === primaryRegion)?.label ||
                "—"
              }
              onEdit={() => setStep(3)}
            />
            <ReviewRow
              label="Jurisdictions"
              value={
                Array.from(selectedJurisdictions)
                  .map((c) => JURISDICTIONS.find((j) => j.code === c)?.name)
                  .filter(Boolean)
                  .join(", ") || "—"
              }
              onEdit={() => setStep(4)}
            />
          </>
        )}

        {/* Nav */}
        <ValidationErrorSummary message={validationError} className="mt-4" />
        <div className="flex items-center justify-between pt-4 border-t border-border">

          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm underline text-muted-foreground disabled:opacity-30"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="bg-primary text-primary-foreground font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="bg-primary text-primary-foreground font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Confirm & continue →"}
            </button>
          )}
        </div>
      </div>
    </RopaShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function RoleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <span className="text-xs inline-flex items-center gap-1">{checked ? <><CheckCircle2 size={14} strokeWidth={1.75} className="text-brand-teal" aria-hidden />On</> : "Off"}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </button>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value}</p>
      </div>
      <button onClick={onEdit} className="text-xs underline text-primary">
        Edit
      </button>
    </div>
  );
}
