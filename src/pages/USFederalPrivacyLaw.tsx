import PillarPage from "@/components/PillarPage";

const USFederalPrivacyLaw = () => (
  <PillarPage
    updateCategory="us-federal"
    title="U.S. Federal Privacy Law"
    subtitle="Overview of the U.S. federal privacy regulatory framework including FTC authority, HIPAA, COPPA, and federal privacy bill activity."
    icon="🏛️"
    lastUpdated="March 5, 2026"
    intro="The United States does not have a single comprehensive federal privacy law equivalent to the EU's GDPR. Instead, the federal privacy landscape consists of sector-specific statutes, FTC enforcement authority, and an evolving set of proposed but not-yet-enacted comprehensive privacy bills. This guide provides a structured overview of the existing federal privacy framework, key regulatory authorities, major legislation, and the ongoing push for comprehensive federal privacy legislation."
    sections={[
      {
        heading: "FTC Authority and Enforcement",
        content: "The Federal Trade Commission serves as the primary federal privacy and data security enforcement authority, operating under Section 5 of the FTC Act which prohibits 'unfair or deceptive acts or practices.' The FTC has used this broad authority to bring hundreds of enforcement actions for privacy and data security violations, establishing de facto privacy standards through consent decrees. Key FTC enforcement areas include: deceptive privacy practices, inadequate data security, children's privacy (COPPA), health data sharing, and dark patterns. In March 2026, the FTC proposed expanding COPPA protections to require verifiable parental consent for targeted advertising directed at children under 16."
      },
      {
        heading: "Sector-Specific Federal Privacy Laws",
        content: "Major federal privacy statutes include: HIPAA (Health Insurance Portability and Accountability Act) governing protected health information; COPPA (Children's Online Privacy Protection Act) protecting children under 13 online; GLBA (Gramm-Leach-Bliley Act) governing financial institution data practices; FERPA (Family Educational Rights and Privacy Act) protecting student education records; ECPA (Electronic Communications Privacy Act) governing wiretapping and electronic surveillance; and the Video Privacy Protection Act. Each statute has its own scope, requirements, enforcement mechanisms, and regulatory authority."
      },
      {
        heading: "Federal Privacy Bill Landscape",
        content: "Multiple comprehensive federal privacy bills have been introduced but none enacted as of March 2026. The American Data Privacy and Protection Act (ADPPA) advanced furthest in 2022, passing the House Energy and Commerce Committee with bipartisan support before stalling. Key points of contention include: federal preemption of state laws (particularly California's CPRA), private right of action provisions, FTC rulemaking authority, and algorithmic accountability requirements. The political dynamics remain challenging, with industry groups, consumer advocates, and state attorneys general holding divergent positions on preemption and enforcement mechanisms."
      },
      {
        heading: "Executive Orders and Agency Actions",
        content: "In the absence of comprehensive legislation, executive orders and agency actions have shaped federal privacy policy. Executive orders on AI safety include provisions addressing privacy risks from AI systems. The FTC has pursued an active rulemaking agenda, including commercial surveillance rules and updated COPPA rules. The HHS Office for Civil Rights continues to update HIPAA guidance for emerging technologies. The CFPB has addressed data privacy in the financial sector through its rulemaking on open banking and data rights. These agency actions, while significant, are subject to changes in administration priorities and judicial review."
      },
      {
        heading: "Implications for Compliance",
        content: "The sectoral approach creates significant compliance complexity for organizations operating across industries. Organizations must navigate overlapping and sometimes conflicting requirements from multiple federal statutes, FTC enforcement precedent, and the growing body of state privacy laws. Key compliance considerations include: identifying all applicable federal statutes based on data types and industry sectors, monitoring FTC enforcement trends and consent decree requirements, maintaining compliance with evolving state laws in the absence of federal preemption, and preparing for potential comprehensive federal legislation that could restructure the entire framework."
      },
    ]}
    relatedLinks={[
      { label: "U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
      { label: "U.S. State Privacy Authority Directory", href: "/us-state-privacy-authorities" },
      { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
    ]}
    directoryLink={{ label: "Browse All U.S. State Authorities", href: "/us-state-privacy-authorities" }}
  />
);

export default USFederalPrivacyLaw;
