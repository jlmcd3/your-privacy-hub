/**
 * Shared homepage orientation strip — sits directly below the regional hero
 * and above the geography cards. Copy is identical for both EU and US variants.
 */
export default function HomeOrientationStrip() {
  return (
    <section className="bg-brand-cloud border-b border-brand-cloud">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <p className="text-sm md:text-base text-slate text-center max-w-3xl mx-auto leading-relaxed">
          EndUserPrivacy.com is a privacy-intelligence platform: a news Feed of
          regulatory developments worldwide, updated daily with analysis; Research
          pages on privacy authorities and laws across every major jurisdiction; and
          self-serve compliance Tools that generate the assessments and documents
          privacy laws require — CPPA, GDPR, and beyond. Subscribe for the Feed and
          Intelligence reports, or use any Tool standalone.
        </p>
      </div>
    </section>
  );
}
