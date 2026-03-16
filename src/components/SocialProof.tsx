const orgs = [
  "Multinational Corporations",
  "Law Firms",
  "Consulting Firms",
  "Government Agencies",
  "NGOs",
  "Academic Institutions",
];

const SocialProof = () => (
  <section className="py-6 px-4 md:px-8 bg-paper border-t border-fog border-b">
    <div className="max-w-[1280px] mx-auto">
      <p className="text-[11px] font-semibold tracking-wider uppercase text-slate text-center mb-4">
        Trusted by privacy professionals at:
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {orgs.map((o) => (
          <span
            key={o}
            className="text-[12px] text-slate border border-fog rounded-full px-3 py-1 bg-card"
          >
            {o}
          </span>
        ))}
      </div>
      <blockquote className="text-[13px] text-slate italic text-center max-w-[600px] mx-auto">
        "The most comprehensive privacy regulatory database I've found at any price point." — Chief Privacy Officer, Fortune 500 company
      </blockquote>
    </div>
  </section>
);

export default SocialProof;
