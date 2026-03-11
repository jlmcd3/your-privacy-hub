import PillarPage from "@/components/PillarPage";

const USStatePrivacyLaws = () => (
  <PillarPage
    title="U.S. State Privacy Laws"
    subtitle="Comprehensive guide to enacted and pending state privacy legislation across all 50 states, including enforcement authority, effective dates, and compliance requirements."
    icon="🗺️"
    lastUpdated="March 10, 2026"
    intro="The United States lacks a comprehensive federal privacy law, creating a complex patchwork of state-level legislation that privacy professionals must navigate. As of March 2026, 20 states have enacted comprehensive privacy laws, with several more pending. This guide provides a structured overview of the entire U.S. state privacy landscape, covering enacted laws, pending legislation, enforcement authority, and key compliance requirements for each jurisdiction."
    sections={[
      {
        heading: "The State Privacy Law Landscape",
        content: "Since California's Consumer Privacy Act (CCPA) took effect in 2020 — later strengthened by the California Privacy Rights Act (CPRA) — state legislatures across the country have followed suit. Virginia's Consumer Data Protection Act (VCDPA), Colorado's Privacy Act (CPA), Connecticut's Data Privacy Act (CTDPA), and Utah's Consumer Privacy Act (UCPA) represented the initial wave. By 2025, states including Texas, Oregon, Montana, Indiana, Tennessee, Iowa, Delaware, New Hampshire, New Jersey, Nebraska, Maryland, Minnesota, Rhode Island, and Kentucky had enacted their own comprehensive privacy statutes. Each law varies in scope, consumer rights, business obligations, enforcement mechanisms, and effective dates."
      },
      {
        heading: "Key Consumer Rights Across State Laws",
        content: "Most state privacy laws grant consumers a common set of rights: the right to know what personal data is collected, the right to delete personal data, the right to opt out of the sale of personal data, and the right to correct inaccurate data. However, significant differences exist. California's CPRA provides the broadest set of rights, including the right to limit the use of sensitive personal information. Texas's TDPSA includes broad definitions of sensitive data. Several states have introduced rights related to automated decision-making, with California's CPPA finalizing ADMT regulations in March 2026."
      },
      {
        heading: "Enforcement Authority",
        content: "Enforcement authority varies significantly across states. California is unique in having a dedicated privacy enforcement agency — the California Privacy Protection Agency (CPPA). Most other states vest enforcement authority in the state Attorney General. No state privacy law currently provides a private right of action for general privacy violations, though California's CCPA allows limited private action for data breaches involving unencrypted personal information. The Texas Attorney General's office has been particularly active, filing the first enforcement action under the TDPSA in March 2026."
      },
      {
        heading: "Compliance Considerations",
        content: "Organizations subject to multiple state privacy laws face significant compliance complexity. Key considerations include: determining applicability thresholds (which vary by state based on revenue, data volume, or percentage of revenue from data sales), implementing consent mechanisms for sensitive data processing, establishing universal opt-out mechanisms, conducting data protection assessments where required, and maintaining privacy notices that satisfy requirements across all applicable jurisdictions. Many organizations are adopting a 'highest common denominator' approach, implementing controls that satisfy the most stringent state requirements."
      },
      {
        heading: "Pending Legislation and Trends",
        content: "Several states have privacy bills pending as of March 2026, including New York's comprehensive privacy act. Key trends include: expanding definitions of sensitive data to include neural and biometric data, introducing AI-specific provisions and automated decision-making transparency requirements, strengthening children's privacy protections, and increasing enforcement budgets and activity. The absence of federal preemption means this trend toward state-level privacy legislation is expected to continue."
      },
    ]}
    relatedLinks={[
      { label: "U.S. State Privacy Authority Directory", href: "/us-state-privacy-authorities" },
      { label: "U.S. Federal Privacy Law", href: "/us-federal-privacy-law" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
      { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
    ]}
    directoryLink={{ label: "Browse All State Authorities", href: "/us-state-privacy-authorities" }}
  />
);

export default USStatePrivacyLaws;
