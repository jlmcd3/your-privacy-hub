import { Helmet } from "react-helmet-async";
import PillarPage from "@/components/PillarPage";

const SECTIONS = [
  {
    heading: "Why Cross-Border Transfers Matter",
    content: `International transfers of personal data are among the most complex and consequential areas of global privacy compliance. The fundamental question — **can personal data leave the jurisdiction where it was collected?** — intersects with national sovereignty, surveillance law, trade policy, and fundamental rights.\n\nFor organizations operating across borders, getting transfers wrong can result in regulatory orders to suspend data flows, significant fines, and operational disruption. The Schrems II decision demonstrated that even long-standing transfer frameworks can be invalidated overnight.`,
  },
  {
    heading: "EU/EEA Transfer Mechanisms (GDPR Chapter V)",
    content: `The GDPR provides a structured hierarchy of transfer mechanisms:\n\n**Adequacy Decisions (Article 45):**\n• The European Commission has recognized approximately 15 countries/territories as providing "adequate" protection\n• Key adequacy decisions: UK (expires June 2025, renewal pending), Japan, South Korea, Canada (commercial), Israel, Switzerland, New Zealand\n• **EU-U.S. Data Privacy Framework (DPF)** — adopted July 2023 after Privacy Shield invalidation; allows transfers to self-certified U.S. organizations\n\n**Standard Contractual Clauses (Article 46(2)(c)):**\n• Most widely used mechanism for transfers to non-adequate countries\n• New SCCs adopted June 2021 with four modules (C-to-C, C-to-P, P-to-C, P-to-P)\n• Require a **Transfer Impact Assessment (TIA)** evaluating recipient country's surveillance laws\n• Supplementary measures may be required based on TIA findings\n\n**Binding Corporate Rules (Article 47):**\n• Intra-group transfer mechanism requiring DPA approval\n• Complex and time-consuming to implement (12-18+ months)\n• Gold standard for multinational corporate data flows\n\n**Derogations (Article 49):**\n• Explicit consent, contractual necessity, public interest, legal claims, vital interests\n• Interpreted narrowly by EDPB — not suitable for systematic or large-scale transfers`,
  },
  {
    heading: "EU-U.S. Data Privacy Framework",
    content: `The EU-U.S. Data Privacy Framework (DPF), adopted in July 2023, replaced the invalidated Privacy Shield:\n\n• **Self-certification** — U.S. organizations must certify to the Department of Commerce and commit to DPF Principles\n• **Executive Order 14086** — underpins the DPF by imposing proportionality and necessity requirements on U.S. signals intelligence\n• **Data Protection Review Court (DPRC)** — new redress mechanism for EU individuals to challenge U.S. surveillance\n• **Schrems III risk** — NOYB and other organizations have signaled challenges to the DPF; its long-term stability remains uncertain\n• **UK Extension** — the UK-U.S. Data Bridge extends similar protections for UK-to-U.S. transfers\n\nOrganizations should **not rely solely on the DPF** — maintain SCCs as a fallback mechanism and monitor CJEU litigation closely.`,
  },
  {
    heading: "Transfer Impact Assessments",
    content: `Post-Schrems II, **Transfer Impact Assessments (TIAs)** are required when relying on SCCs or BCRs:\n\n**Key steps:**\n1. **Map your transfers** — identify all personal data flows to third countries\n2. **Identify the transfer mechanism** — SCCs, BCRs, adequacy, or derogation\n3. **Assess recipient country law** — evaluate surveillance laws, government access powers, and rule of law\n4. **Evaluate practical risk** — consider whether authorities are likely to access the specific data\n5. **Implement supplementary measures** — encryption, pseudonymization, split processing, or contractual commitments\n6. **Document and review** — maintain records and reassess when circumstances change\n\nThe EDPB's Recommendations 01/2020 provide the authoritative framework for conducting TIAs.`,
  },
  {
    heading: "Asia-Pacific Transfer Frameworks",
    content: `Major APAC jurisdictions have developed distinct approaches to cross-border transfers:\n\n• **China PIPL (Articles 38-43)** — requires security assessments (mandatory for critical infrastructure operators and large-scale processing), standard contracts, or certification. The CAC has actively enforced cross-border transfer requirements\n• **Japan APPI** — permits transfers to countries with equivalent protection or to recipients meeting APPI-equivalent standards. Japan has mutual adequacy with the EU\n• **South Korea PIPA** — similar to GDPR approach; mutual adequacy with the EU since 2024\n• **India DPDP Act** — permits transfers to all countries except those specifically blacklisted by the government (blacklist not yet published)\n• **Singapore PDPA** — permits transfers where recipient provides comparable protection; no prescriptive mechanism required\n• **APEC CBPR System** — voluntary certification framework; members include U.S., Japan, South Korea, Singapore, and others. Transitioning to the **Global CBPR Forum**`,
  },
  {
    heading: "Practical Compliance Strategies",
    content: `1. **Create a data transfer map** — document every cross-border flow including recipient, mechanism, and assessment status\n2. **Layer your mechanisms** — use DPF certification plus SCCs plus supplementary measures for maximum resilience\n3. **Centralize TIA management** — maintain a register of assessments with review triggers\n4. **Monitor geopolitical developments** — adequacy decisions, Schrems III litigation, and trade agreements directly impact transfer strategies\n5. **Consider data localization options** — for highest-risk transfers, evaluate regional processing or storage\n6. **Implement technical measures** — end-to-end encryption, key management outside recipient jurisdiction, and pseudonymization reduce transfer risk\n7. **Review vendor contracts** — ensure all processors have appropriate transfer mechanisms in place`,
  },
];

export default function CrossBorderTransfersPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/cross-border-transfers" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cross-Border Data Transfers: GDPR, SCCs, DPF & Global Rules",
          "description": "Comprehensive guide to international data transfer mechanisms for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "Your Privacy Hub" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <PillarPage
        title="Cross-Border Data Transfers: GDPR, SCCs, DPF & Global Rules"
        subtitle="The definitive reference for privacy professionals on international data transfer mechanisms — from GDPR Chapter V and Standard Contractual Clauses to the EU-U.S. Data Privacy Framework, Transfer Impact Assessments, and Asia-Pacific frameworks."
        icon="🌐"
        lastUpdated="March 24, 2026"
        intro="International transfers sit on top of fragile legal foundations — Schrems II reset the world, the DPF could be next. This guide is the working reference for the mechanisms still in force today."
        sections={SECTIONS}
        relatedLinks={[
          { label: "🌍 Jurisdictions Map", href: "/jurisdictions" },
          { label: "⚖️ GDPR Enforcement", href: "/gdpr-enforcement" },
          { label: "📜 Global Privacy Laws", href: "/global-privacy-laws" },
          { label: "⭐ Subscribe — $39/month", href: "/subscribe" },
        ]}
        intelligenceLabel="What changed in cross-border transfers this week"
        updateOrFilter="title.ilike.%transfer%,title.ilike.%cross-border%,title.ilike.%adequacy%,title.ilike.%SCCs%,topic_tags.cs.{cross-border}"
        heroStats={[
          { value: "~15", label: "EU adequacy decisions" },
          { value: "4 modules", label: "2021 SCCs issued" },
          { value: "Jul 2023", label: "EU–US DPF adopted" },
          { value: "Schrems III", label: "challenge ongoing" },
        ]}
        emailCaptureText="Get Schrems III alerts and transfer mechanism updates"
        midPageCtaMessage="Intelligence subscribers see the full APAC transfer mechanism comparison — Japan, South Korea, India, Australia, Singapore, and all emerging frameworks."
        toolCta={{
          heading: "Transfer Impact Assessment builder",
          description: "Walks your team through all six required TIA steps, jurisdiction by jurisdiction. Structured output ready for DPA review.",
          link: "/dpia-framework",
          linkLabel: "Start your TIA →",
        }}
      />
    </>
  );
}
