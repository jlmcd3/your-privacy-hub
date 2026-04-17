import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import { useToolPrice } from "@/hooks/useToolPrice";

const DATA_CATEGORIES = [
  "Contact data", "Purchase/transaction history", "Browsing/behavioural data",
  "Location data", "Employment data", "Financial data", "Health or medical data",
  "Biometric data", "Special category data", "Communications data", "Device/technical data", "Other",
];
const RELATIONSHIPS = [
  "Existing customer", "Prospective customer", "Employee", "Former employee",
  "Website visitor (no account)", "B2B contact", "Member of the public", "Other",
];
const JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
];
const SECTORS = [
  "Technology/SaaS", "Healthcare", "Financial services", "Retail/ecommerce",
  "Media/publishing", "Marketing/advertising", "Professional services", "Education",
  "Government/public sector", "Other",
];

// Price tiers managed by useToolPrice hook (subscriber-aware)

const MultiPills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const LIAssessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("li_assessment");

  const [processingDescription, setProcessingDescription] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [statedPurpose, setStatedPurpose] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const validate = () => {
    if (processingDescription.trim().length < 50) return "Processing description must be at least 50 characters.";
    if (!dataCategories.length) return "Select at least one data category.";
    if (!relationship) return "Select your relationship with data subjects.";
    if (!jurisdictions.length) return "Select at least one jurisdiction.";
    if (!statedPurpose.trim()) return "Stated purpose is required.";
    return null;
  };

  const handlePurchase = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Please complete the form first", description: err, variant: "destructive" });
      return;
    }
    if (!user) {
      navigate(`/login?return=${encodeURIComponent("/li-assessment")}`);
      return;
    }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
        body: {
          tool_type: "li_assessment",
          user_id: user.id,
          intake_data: {
            processing_description: processingDescription,
            data_categories: dataCategories,
            relationship_type: relationship,
            jurisdictions,
            sector: sector || null,
            stated_purpose: statedPurpose,
            alternatives_considered: alternatives || null,
          },
          return_url: window.location.origin,
        },
      });
      if (error || !data?.url) throw error ?? new Error("Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err?.message?.includes("stripe_not_configured") || err?.context?.status === 503
        ? "Payments are not yet configured. Please check back soon."
        : err.message ?? "Try again.";
      toast({ title: "Checkout unavailable", description: msg, variant: "destructive" });
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`Legitimate Interest Analyzer — from $${pricing.subscriberPrice} | EndUserPrivacy`}</title>
        <meta name="description" content={`Assess whether your proposed processing can rely on legitimate interest under GDPR Article 6(1)(f). One-time purchase from $${pricing.subscriberPrice}.`} />
      </Helmet>
      <Navbar />

      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            ⚖️ Compliance Framework Tool · ${pricing.price}{pricing.isSubscriber && pricing.standalonePrice > pricing.price ? ` (subscriber rate · standalone $${pricing.standalonePrice})` : ""}
          </span>
          <h1 className="text-3xl md:text-4xl font-serif mb-3">Legitimate Interest Analyzer</h1>
          <p className="text-slate-300 text-lg">
            Assess whether your proposed processing can rely on legitimate interest under GDPR Article 6(1)(f) or UK GDPR equivalent.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            This tool draws on tracked regulatory decisions to provide a precedent landscape for your proposed processing activity.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-6">
        <section className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How this assessment works</h2>
          <ol className="space-y-2 list-decimal pl-5 text-foreground">
            <li>Describe your proposed processing activity in plain language.</li>
            <li>Our analysis engine matches your activity against tracked regulatory decisions and guidance from EU, UK, and global data protection authorities.</li>
            <li>You receive a three-part test analysis, precedent landscape, and recommended documentation — structured as a compliance framework for review with your legal counsel.</li>
          </ol>
          <div className="mt-4 p-4 bg-muted/50 border-l-4 border-muted-foreground/30 rounded text-sm text-muted-foreground">
            This is a compliance framework tool, not legal advice. All findings should be reviewed with qualified legal counsel before relying on legitimate interest as a processing legal basis.
          </div>
        </section>

        <form onSubmit={(e) => { e.preventDefault(); handlePurchase(); }} className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <Label htmlFor="desc" className="text-base">Describe your proposed processing activity *</Label>
            <Textarea
              id="desc"
              value={processingDescription}
              onChange={(e) => setProcessingDescription(e.target.value)}
              placeholder="Example: We use purchase history and browsing behaviour to generate personalised product recommendations for existing customers, displayed in the app and via email, without requesting additional consent."
              className="mt-2 min-h-32"
            />
            <p className="text-xs text-muted-foreground mt-1">Be specific about what data you use, why, and for whom. Min 50 characters.</p>
          </div>

          <div>
            <Label className="text-base">Data categories involved *</Label>
            <div className="mt-2"><MultiPills options={DATA_CATEGORIES} value={dataCategories} onChange={setDataCategories} /></div>
          </div>

          <div>
            <Label htmlFor="rel" className="text-base">Your relationship with data subjects *</Label>
            <select id="rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-base">Jurisdictions where this processing applies *</Label>
            <div className="mt-2"><MultiPills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
          </div>

          <div>
            <Label htmlFor="sector" className="text-base">Your sector (optional)</Label>
            <select id="sector" value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="purpose" className="text-base">How would you describe this purpose to data subjects? *</Label>
            <Textarea id="purpose" value={statedPurpose} onChange={(e) => setStatedPurpose(e.target.value)} placeholder="The purpose as you would write it in a privacy notice." className="mt-2" />
          </div>

          <div>
            <Label htmlFor="alt" className="text-base">What alternatives to legitimate interest have you considered?</Label>
            <Textarea id="alt" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} placeholder="e.g. We considered consent but believe it would be unworkable because..." className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">The necessity test requires demonstrating that processing is necessary. Documenting considered alternatives strengthens your assessment.</p>
          </div>
        </form>

        <ToolSamplePreview
          toolType="li"
          toolName="Legitimate Interest Analyzer"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessment;
