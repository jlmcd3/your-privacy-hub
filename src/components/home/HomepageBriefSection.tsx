import BriefBuilder from "@/components/subscribe/BriefBuilder";
import SectionShell from "./SectionShell";

export default function HomepageBriefSection() {
  return (
    <SectionShell
      eyebrow="Weekly Intelligence Brief"
      headline="Build a sample brief for your role"
      subline="Choose your jurisdiction, responsibilities, and topic tracks to preview the Monday brief format."
      ctaLabel="See plans →"
      ctaHref="/subscribe"
    >
      <div id="brief" className="scroll-mt-20 px-5 py-5">
        <BriefBuilder />
      </div>
    </SectionShell>
  );
}