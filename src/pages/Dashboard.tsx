import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const currentWeek = () => {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const sampleEnforcement = [
  { regulator: "ICO (UK)", target: "ClearView Analytics Ltd", fine: "€8.5M", category: "AI / Facial Recognition" },
  { regulator: "CNIL (France)", target: "AdTrack SAS", fine: "€3.2M", category: "Adtech / Consent" },
  { regulator: "Texas AG (US)", target: "DataBroker Inc.", fine: "$1.4M", category: "Data Broker Violations" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsPremium(data?.is_premium ?? false);
      });
  }, [user]);

  if (isPremium === null) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <Navbar />
        <div className="flex items-center justify-center py-24 px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-[28px] text-foreground mb-3">
              Premium Dashboard
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              Upgrade to Premium to access the full intelligence dashboard, including the Weekly Brief, enforcement data, and trend analysis.
            </p>
            <button
              onClick={() => navigate("/subscribe")}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-[14px] font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
            Premium Intelligence
          </p>
          <h1 className="font-display text-[28px] md:text-[34px] text-foreground leading-tight">
            Weekly Intelligence Brief
          </h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            Week of {currentWeek()}
          </p>
        </div>

        <div className="space-y-10">
          {/* Executive Summary */}
          <Section title="Executive Summary">
            <p>
              This week's most consequential developments span AI data processing enforcement and
              accelerating U.S. state-level activity. The EDPB issued binding guidance restricting
              the use of personal data for large language model training without explicit consent,
              while the Texas Attorney General opened the first enforcement action under the TDPSA.
              Meanwhile, Brazil's ANPD signaled coordinated action with EU regulators on cross-border
              data broker investigations.
            </p>
          </Section>

          {/* U.S. Federal */}
          <Section title="U.S. Federal Analysis">
            <p>
              The FTC continued its focus on AI-adjacent enforcement, issuing a proposed order against
              a major data analytics firm for deceptive practices in algorithmic decision-making.
              Congressional activity remained stalled, with the APRA markup postponed indefinitely.
              HHS published updated HIPAA guidance on telehealth data sharing post-PHE expiration.
            </p>
          </Section>

          {/* U.S. State */}
          <Section title="U.S. State Analysis">
            <p>
              Texas AG Ken Paxton filed the first enforcement action under the Texas Data Privacy and
              Security Act (TDPSA), targeting a data broker for failure to honor opt-out requests.
              Oregon's consumer privacy act amendments took effect, expanding the definition of
              sensitive data to include neural and biometric inference data. Colorado published
              its first annual enforcement report under the CPA.
            </p>
          </Section>

          {/* EU & UK */}
          <Section title="EU & UK Analysis">
            <p>
              The EDPB adopted guidelines on the use of personal data for AI model training,
              establishing a high bar for legitimate interest claims. The ICO issued a £8.5M fine
              against ClearView Analytics for continued processing of UK residents' biometric data.
              France's CNIL opened a formal investigation into real-time bidding data flows involving
              three major ad exchanges.
            </p>
          </Section>

          {/* Global */}
          <Section title="Global Developments">
            <p>
              Brazil's ANPD published its first international cooperation agreement with the EDPB,
              focusing on cross-border data broker oversight. India's DPDPA implementation rules
              entered the public comment phase, with significant industry pushback on data
              localization requirements. South Korea's PIPC issued updated AI governance guidance
              aligned with the OECD AI Principles framework.
            </p>
          </Section>

          {/* Enforcement Table */}
          <Section title="Enforcement Summary">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold text-muted-foreground">Regulator</th>
                    <th className="py-2 pr-4 font-semibold text-muted-foreground">Target</th>
                    <th className="py-2 pr-4 font-semibold text-muted-foreground">Fine</th>
                    <th className="py-2 font-semibold text-muted-foreground">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleEnforcement.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 pr-4 text-foreground font-medium">{row.regulator}</td>
                      <td className="py-3 pr-4 text-foreground">{row.target}</td>
                      <td className="py-3 pr-4 text-foreground font-semibold">{row.fine}</td>
                      <td className="py-3 text-muted-foreground">{row.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Trend Signal */}
          <Section title="Trend Signal">
            <p>
              Three enforcement actions across EU, U.S., and Brazil this week point to coordinated
              regulatory pressure on data brokers — a pattern not observed at this frequency since
              2022. This suggests a potential shift from guidance-first to enforcement-first
              approaches in the data brokerage sector globally.
            </p>
          </Section>

          {/* Why This Matters */}
          <Section title="Why This Matters">
            <p>
              Organizations processing personal data for AI training, operating data brokerage
              services, or relying on cross-border data transfers should prioritize reviewing their
              legal bases for processing, opt-out mechanisms, and international transfer safeguards.
              The convergence of enforcement activity across multiple jurisdictions signals a new
              phase of coordinated regulatory action.
            </p>
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-[20px] text-foreground mb-3 pb-2 border-b border-border">
      {title}
    </h2>
    <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

export default Dashboard;
