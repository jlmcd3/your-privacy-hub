import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms of Service | EndUserPrivacy</title>
        <meta name="description" content="Terms of service for EndUserPrivacy.com including copyright, acceptable use, subscriptions, and limitation of liability." />
      </Helmet>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 16, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">1. Copyright Notice</h2>
            <p>
              All content published on EndUserPrivacy.com — including but not limited to articles, analyses,
              summaries, commentary, data compilations, graphics, logos, and software — is the exclusive
              property of EndUserPrivacy and is protected by United States and international copyright laws.
            </p>
            <p>
              © {new Date().getFullYear()} EndUserPrivacy. All rights reserved. No portion of this site may
              be reproduced, duplicated, copied, sold, resold, or otherwise exploited for any commercial
              purpose without express written consent from EndUserPrivacy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">2. Prohibition on Scraping &amp; Reproduction</h2>
            <p>
              You may not use any automated means — including but not limited to bots, crawlers, scrapers,
              spiders, data-mining tools, or artificial intelligence training systems — to access, collect,
              copy, or aggregate any content from this website without prior written authorization.
            </p>
            <p>Specifically prohibited activities include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Systematic downloading or caching of pages or data from this site.</li>
              <li>Reproducing, republishing, or redistributing site content in any format.</li>
              <li>Using site content to train, fine-tune, or evaluate machine-learning or AI models.</li>
              <li>Creating derivative works based on our analyses, summaries, or commentary.</li>
              <li>Framing or embedding site content on third-party websites without permission.</li>
            </ul>
            <p>
              Unauthorized scraping or reproduction constitutes a violation of these Terms and may result
              in legal action, including claims for statutory damages under the Computer Fraud and Abuse
              Act (CFAA) and applicable copyright statutes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">3. Proprietary Compilations &amp; Database Rights</h2>
            <p>
              The <strong>Weekly Privacy Brief</strong> and the <strong>Enforcement Action Database</strong> are
              proprietary compilations created through substantial investment of time, expertise, and resources.
              These compilations are protected under:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>U.S. Copyright Law (17 U.S.C. § 101 et seq.)</strong> — as original works of authorship
                reflecting creative selection, coordination, and arrangement of information.
              </li>
              <li>
                <strong>Database copyright protections</strong> — the selection, organization, and presentation
                of data within these compilations constitute protectable expression.
              </li>
              <li>
                <strong>Unfair competition and misappropriation doctrines</strong> — unauthorized extraction or
                reuse of substantial portions of these databases is prohibited.
              </li>
            </ul>
            <p>
              Extracting, reusing, or redistributing all or a substantial portion of the data contained in
              these compilations — whether by automated or manual means — is strictly prohibited without a
              commercial license agreement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">4. Permitted Uses</h2>
            <p>
              You may access and use this site for personal, non-commercial purposes. Brief quotations with
              proper attribution and a link back to the original content are permitted under fair use
              principles. Any other use requires our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">5. Enforcement</h2>
            <p>
              EndUserPrivacy actively monitors for unauthorized use of its content. We reserve the right to
              pursue all available legal remedies against any person or entity that violates these Terms,
              including injunctive relief, actual damages, and recovery of attorneys' fees.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">6. Contact</h2>
            <p>
              For licensing inquiries or to request permission to use our content, please contact us at{" "}
              <a href="mailto:legal@enduserprivacy.com" className="text-primary hover:underline">
                legal@enduserprivacy.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
