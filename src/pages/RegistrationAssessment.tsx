import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  JURISDICTION_OPTIONS, ORG_SIZES, INDUSTRIES, rememberAssessmentToken,
} from "@/data/registration_jurisdictions";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";

interface IntakeState {
  organization_name: string;
  organization_country: string;
  organization_size: string;
  industry: string;
  email: string;
  processes_personal_data: boolean;
  processes_special_categories: boolean;
  processes_children_data: boolean;
  uses_ai_systems: boolean;
  ai_high_risk: boolean;
  cross_border_transfers: boolean;
  acts_as_data_broker: boolean;
  has_eu_establishment: boolean;
  has_uk_establishment: boolean;
  markets_served: string[];
}

const EMPTY: IntakeState = {
  organization_name: "",
  organization_country: "",
  organization_size: "",
  industry: "",
  email: "",
  processes_personal_data: true,
  processes_special_categories: false,
  processes_children_data: false,
  uses_ai_systems: false,
  ai_high_risk: false,
  cross_border_transfers: false,
  acts_as_data_broker: false,
  has_eu_establishment: false,
  has_uk_establishment: false,
  markets_served: [],
};

export default function RegistrationAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [intake, setIntake] = useState<IntakeState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // Resume from token if provided
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-registration-assessment",
        { body: { shareable_token: token } }
      );
      if (!error && data?.assessment?.intake_data) {
        setIntake({ ...EMPTY, ...data.assessment.intake_data });
        toast.success("Loaded your saved answers");
      }
    })();
  }, [searchParams]);

  const groupedMarkets = useMemo(() => {
    const m: Record<string, typeof JURISDICTION_OPTIONS> = {};
    for (const j of JURISDICTION_OPTIONS) {
      (m[j.region] ||= []).push(j);
    }
    return m;
  }, []);

  function toggleMarket(code: string) {
    setIntake((s) => ({
      ...s,
      markets_served: s.markets_served.includes(code)
        ? s.markets_served.filter((c) => c !== code)
        : [...s.markets_served, code],
    }));
  }

  async function submit() {
    if (!intake.organization_country && intake.markets_served.length === 0) {
      toast.error("Tell us where you're based or which markets you serve");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke(
        "run-registration-assessment",
        { body: { intake_data: intake, user_id: user?.id || null } }
      );
      if (error) throw error;
      rememberAssessmentToken(data.shareable_token);
      navigate(`/registration-manager/result/${encodeURIComponent(data.shareable_token)}`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate assessment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>DPA & AI Act Registration Assessment — EndUserPrivacy</title>
        <meta name="description" content="Free 2-minute assessment that maps your organization to required DPA registrations, DPO appointments, and EU AI Act filings across 50+ jurisdictions." />
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/registration-manager" />
      </Helmet>
      <Navbar />
      <main>
        <PageContainer>
          <div className="max-w-3xl mx-auto py-10">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Where do you need to register?
              </h1>
              <p className="text-muted-foreground mt-2">
                Free 2-minute assessment. We map your organization to required DPA, DPO, and EU AI Act filings worldwide.
              </p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle>Step {step} of 3</CardTitle>
                <CardDescription>
                  {step === 1 && "About your organization"}
                  {step === 2 && "What data do you process?"}
                  {step === 3 && "Where do you operate?"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org">Organization name (optional)</Label>
                      <Input id="org" value={intake.organization_name}
                        onChange={(e) => setIntake({ ...intake, organization_name: e.target.value })} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Where is your org established?</Label>
                        <Select value={intake.organization_country}
                          onValueChange={(v) => setIntake({ ...intake, organization_country: v })}>
                          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(groupedMarkets).map(([region, items]) => (
                              <div key={region}>
                                <div className="px-2 py-1 text-xs text-muted-foreground">{region}</div>
                                {items.map((j) => (
                                  <SelectItem key={j.code} value={j.code}>{j.name}</SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Org size</Label>
                        <Select value={intake.organization_size}
                          onValueChange={(v) => setIntake({ ...intake, organization_size: v })}>
                          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                          <SelectContent>
                            {ORG_SIZES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={intake.industry}
                          onValueChange={(v) => setIntake({ ...intake, industry: v })}>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Contact email (optional)</Label>
                        <Input id="email" type="email" value={intake.email}
                          onChange={(e) => setIntake({ ...intake, email: e.target.value })}
                          placeholder="you@company.com" />
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <CheckRow checked={intake.processes_personal_data}
                      onChange={(v) => setIntake({ ...intake, processes_personal_data: v })}
                      label="We process personal data of identifiable individuals" />
                    <CheckRow checked={intake.processes_special_categories}
                      onChange={(v) => setIntake({ ...intake, processes_special_categories: v })}
                      label="We process special-category data (health, biometric, race, religion, sexual orientation, political opinion)" />
                    <CheckRow checked={intake.processes_children_data}
                      onChange={(v) => setIntake({ ...intake, processes_children_data: v })}
                      label="We process data of children under 16" />
                    <CheckRow checked={intake.uses_ai_systems}
                      onChange={(v) => setIntake({ ...intake, uses_ai_systems: v })}
                      label="We use or deploy AI systems that affect users (recommendations, scoring, automated decisions)" />
                    {intake.uses_ai_systems && (
                      <div className="ml-6">
                        <CheckRow checked={intake.ai_high_risk}
                          onChange={(v) => setIntake({ ...intake, ai_high_risk: v })}
                          label="At least one of our AI systems is high-risk under the EU AI Act (e.g. employment, credit, biometrics, education, critical infrastructure)" />
                      </div>
                    )}
                    <CheckRow checked={intake.cross_border_transfers}
                      onChange={(v) => setIntake({ ...intake, cross_border_transfers: v })}
                      label="We transfer personal data across borders (e.g. to US sub-processors)" />
                    <CheckRow checked={intake.acts_as_data_broker}
                      onChange={(v) => setIntake({ ...intake, acts_as_data_broker: v })}
                      label="We act as a data broker (sell or share personal data without a direct relationship to consumers)" />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base">Where are you established?</Label>
                      <CheckRow checked={intake.has_eu_establishment}
                        onChange={(v) => setIntake({ ...intake, has_eu_establishment: v })}
                        label="We have an EU establishment (office, employees, or subsidiary)" />
                      <CheckRow checked={intake.has_uk_establishment}
                        onChange={(v) => setIntake({ ...intake, has_uk_establishment: v })}
                        label="We have a UK establishment" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base">Which markets do you serve or monitor?</Label>
                      <p className="text-sm text-muted-foreground">
                        Pick every region where you offer goods/services or track behavior.
                      </p>
                      <div className="space-y-4 max-h-96 overflow-auto pr-2 border rounded-md p-4">
                        {Object.entries(groupedMarkets).map(([region, items]) => (
                          <div key={region}>
                            <div className="text-sm font-semibold text-foreground mb-2">{region}</div>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {items.map((j) => (
                                <label key={j.code} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox
                                    checked={intake.markets_served.includes(j.code)}
                                    onCheckedChange={() => toggleMarket(j.code)}
                                  />
                                  <span>{j.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={() => setStep(step + 1)}>Next</Button>
                  ) : (
                    <Button onClick={submit} disabled={submitting}>
                      {submitting ? "Generating..." : "Show me where I need to register"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="mt-6">
              <RegistrationDisclaimer />
            </div>
          </div>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-1" />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
