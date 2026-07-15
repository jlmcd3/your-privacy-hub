import LegalPageLayout, { type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  { id: "introduction", label: "Introduction" },
  { id: "who-we-are", label: "1. Who We Are" },
  { id: "information-collected", label: "2. Information We Collect" },
  { id: "how-we-use", label: "3. How We Use Your Information" },
  { id: "third-party-providers", label: "4. Third-Party Service Providers" },
  { id: "advertising", label: "5. Advertising and Google AdSense" },
  { id: "cookies", label: "6. Cookies and Similar Technologies" },
  { id: "retention", label: "7. Data Retention" },
  { id: "your-rights", label: "8. Your Rights" },
  { id: "international", label: "9. International Data Transfers" },
  { id: "children", label: "10. Children's Privacy" },
  { id: "security", label: "11. Security" },
  { id: "third-party-links", label: "12. Third-Party Links" },
  { id: "changes", label: "13. Changes to This Policy" },
  { id: "contact", label: "14. Contact Us" },
];

const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
    {children}
  </a>
);

const Mail = ({ subject }: { subject?: string }) => (
  <a
    href={`mailto:hello@enduserprivacy.com${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`}
    className="text-primary hover:underline"
  >
    hello@enduserprivacy.com
  </a>
);

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      metaTitle="Privacy Policy | End User Privacy"
      metaDescription="How End User Privacy collects, uses, shares, and protects your information, including your rights under GDPR and US state privacy laws."
      lastUpdated="July 4, 2026"
      ariaLabel="Privacy Policy"
      sections={SECTIONS}
    >
      <div className="prose prose-sm max-w-none space-y-8 font-serif-text text-fluid-base text-ink">
          <section className="space-y-3">
            <h2 className="font-display text-foreground">Introduction</h2>
            <p>
              End User Privacy ("we," "us," or "our") operates enduserprivacy.com (the "Site"). This
              Privacy Policy explains what information we collect, how we use it, with whom we share
              it, and what rights you have in relation to it.
            </p>
            <p>
              We are committed to handling your information responsibly and transparently. If you have
              questions, contact us at <Mail />.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">1. Who We Are</h2>
            <p>
              End User Privacy is a privacy intelligence and compliance platform serving privacy
              professionals, including data protection officers, privacy counsel, compliance
              professionals, and related roles.
            </p>
            <p>
              For the purposes of UK and EU data protection law, End User Privacy is the data
              controller for personal data collected through the Site.
            </p>
            <p>Contact: <Mail /></p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              2. Information We Collect
            </h2>

            <h3 className="text-foreground">
              2.1 Information you provide directly
            </h3>
            <p>
              When you create an account, subscribe, or use our compliance tools, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name and email address (required for account creation)</li>
              <li>
                Professional role and industry (collected during onboarding and brief preference
                setup, used to personalise your intelligence report)
              </li>
              <li>
                Jurisdictions and topic preferences (used to personalise your weekly Privacy
                Intelligence Report)
              </li>
              <li>
                Compliance tool inputs — such as details about your organisation's processing
                activities, data transfers, incident scenarios, or legal basis assessments — which
                you enter when using tools such as the LIA, DPIA, DPA Generator, IR Playbook, RoPA
                Builder, or CPPA Suite
              </li>
              <li>
                Payment information (collected and processed by Stripe; we do not store your card
                details)
              </li>
              <li>Client names and industries (if you use the Clients feature)</li>
              <li>Any content you submit via contact forms or email</li>
            </ul>

            <h3 className="text-foreground">
              2.2 Information collected automatically
            </h3>
            <p>
              When you visit the Site, we and our third-party service providers automatically
              collect:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address and approximate geographic location (country/region level)</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited, time spent on pages, and navigation paths</li>
              <li>Referring URLs</li>
              <li>Device type (desktop or mobile)</li>
              <li>Cookies and similar tracking technologies (see Section 6)</li>
            </ul>

            <h3 className="text-foreground">
              2.3 Information from third parties
            </h3>
            <p>
              We do not purchase or acquire personal data from third-party data brokers. If you
              authenticate using a third-party login (such as Google OAuth), we receive the
              information you authorise that service to share with us, typically your name and email
              address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              3. How We Use Your Information
            </h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and operate the Site and its features</li>
              <li>To create and manage your account</li>
              <li>To process subscription payments through Stripe</li>
              <li>To generate your personalised weekly Privacy Intelligence Report</li>
              <li>To store and display your compliance tool outputs in My Reports</li>
              <li>
                To personalise the Privacy Intelligence Feed based on your watchlist and topic
                preferences
              </li>
              <li>
                To send transactional emails (account confirmation, password reset, payment
                receipts)
              </li>
              <li>
                To send your weekly Privacy Intelligence Report by email (subscribers only)
              </li>
              <li>To respond to your enquiries and support requests</li>
              <li>
                To improve the Site, diagnose technical issues, and conduct internal analytics
              </li>
              <li>To display advertising on the Site through Google AdSense (see Section 5)</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p>
              We do not use your personal data for automated decision-making or profiling that
              produces legal or similarly significant effects.
            </p>
            <p className="font-semibold">Legal bases (UK/EU GDPR):</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Contract performance: account creation, tool access, payment processing, report
                delivery
              </li>
              <li>
                Legitimate interests: internal analytics, security, fraud prevention, service
                improvement
              </li>
              <li>Consent: advertising cookies (where required by applicable law)</li>
              <li>Legal obligation: tax records, law enforcement requests</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              4. Third-Party Service Providers
            </h2>
            <p>
              We share your information with the following categories of third-party service
              providers who process data on our behalf:
            </p>

            <h3 className="text-foreground">
              Supabase (database and authentication infrastructure)
            </h3>
            <p>
              Supabase stores your account data, compliance tool outputs, brief preferences, and
              watchlist items on servers located in the United States. Supabase is SOC 2 Type II
              certified. Privacy policy:{" "}
              <ExtLink href="https://supabase.com/privacy">https://supabase.com/privacy</ExtLink>
            </p>

            <h3 className="text-foreground">
              Anthropic (AI processing)
            </h3>
            <p>
              When you use compliance tools or the platform generates your weekly report, inputs are
              sent to Anthropic's Claude API for AI-assisted analysis. Anthropic processes this data
              in the United States. Anthropic does not use API inputs to train its models. Privacy
              policy:{" "}
              <ExtLink href="https://www.anthropic.com/privacy">
                https://www.anthropic.com/privacy
              </ExtLink>
            </p>

            <h3 className="text-foreground">
              Stripe (payment processing)
            </h3>
            <p>
              Stripe processes subscription payments. We do not receive or store your full card
              details. Stripe is PCI DSS Level 1 certified. Privacy policy:{" "}
              <ExtLink href="https://stripe.com/privacy">https://stripe.com/privacy</ExtLink>
            </p>

            <h3 className="text-foreground">
              Google AdSense (advertising)
            </h3>
            <p>
              Google serves advertisements on the Site. Google may use cookies and similar
              technologies to display ads. We have configured our AdSense account to serve
              non-personalized ads, meaning ads are targeted based on page content rather than your
              personal browsing history. For more information on how Google uses information from
              sites that use its advertising services, see:{" "}
              <ExtLink href="https://policies.google.com/technologies/partner-sites">
                https://policies.google.com/technologies/partner-sites
              </ExtLink>
              . To opt out of Google's advertising:{" "}
              <ExtLink href="https://adssettings.google.com">
                https://adssettings.google.com
              </ExtLink>
            </p>

            <h3 className="text-foreground">
              Lovable (hosting infrastructure)
            </h3>
            <p>
              The Site is hosted on Lovable's platform, which uses Cloudflare and related
              infrastructure for content delivery.
            </p>

            <p className="font-semibold">We do not sell your personal data to any third party.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              5. Advertising and Google AdSense
            </h2>
            <p>The Site displays advertisements served by Google AdSense.</p>
            <p>
              Google AdSense uses cookies to serve ads on the Site. We have configured AdSense to
              use non-personalized ads, which means:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Google does not use your personal browsing history or cross-site tracking data to
                target ads shown on this Site
              </li>
              <li>Ads are targeted based on the content of the page you are reading</li>
              <li>
                Google may still use cookies for frequency capping (limiting how often you see the
                same ad) and fraud prevention
              </li>
            </ul>
            <p>
              Google's advertising cookie is named "ANID" and is set by google.com. You can opt out
              of Google advertising cookies by visiting{" "}
              <ExtLink href="https://adssettings.google.com">
                https://adssettings.google.com
              </ExtLink>{" "}
              or by installing the Google Analytics Opt-out Browser Add-on.
            </p>
            <p>
              We honor the Global Privacy Control (GPC) signal: if your browser sends GPC, we do
              not serve advertising to you at all. Advertising appears only for visitors who are
              not signed in; registered users browse ad-free.
            </p>
            <p>
              For visitors in the European Economic Area, the United Kingdom, and Switzerland: we
              do not currently serve advertising to these regions. If we begin serving ads there,
              we will first implement a Google-certified consent management platform and request
              your consent before any advertising cookie is set.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              6. Cookies and Similar Technologies
            </h2>
            <p>We use the following categories of cookies:</p>

            <h3 className="text-foreground">
              Strictly necessary cookies
            </h3>
            <p>These are required for the Site to function. They include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Authentication session cookies (set by Supabase) that keep you logged in during your
                visit
              </li>
              <li>Security cookies that prevent cross-site request forgery</li>
            </ul>
            <p>These cannot be disabled without breaking core functionality.</p>

            <h3 className="text-foreground">
              Functional cookies
            </h3>
            <p>
              These remember your preferences, such as your dismissed banners or UI state. They
              expire at the end of your session or within 30 days.
            </p>

            <h3 className="text-foreground">
              Analytics cookies
            </h3>
            <p>
              We use basic analytics to understand how visitors use the Site (pages visited, time on
              site, referral sources). This data is aggregated and not linked to individual
              identities.
            </p>

            <h3 className="text-foreground">
              Advertising cookies
            </h3>
            <p>
              Google AdSense sets cookies for non-personalized ad delivery (frequency capping and
              fraud prevention). See Section 5.
            </p>

            <h3 className="text-foreground">
              How to control cookies
            </h3>
            <p>
              You can control cookies through your browser settings. Note that disabling strictly
              necessary cookies will prevent you from logging in or using authenticated features.
            </p>
            <p>
              For EU/EEA/UK users: you may refuse non-essential cookies by adjusting your browser
              settings. Because we do not serve personalized ads, no advertising consent banner is
              displayed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              7. Data Retention
            </h2>
            <p>We retain your personal data as follows:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Account data: for the duration of your account, plus 90 days after account deletion
                to allow for recovery requests
              </li>
              <li>
                Compliance tool outputs (My Reports): retained permanently while your account is
                active; deleted 90 days after account deletion
              </li>
              <li>Payment records: 7 years, as required by US tax law</li>
              <li>Server logs: 30 days on a rolling basis</li>
              <li>Email correspondence: 2 years</li>
            </ul>
            <p>
              You may request deletion of your personal data at any time by contacting <Mail />. We
              will process deletion requests within 30 days, subject to any legal retention
              obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">8. Your Rights</h2>

            <h3 className="text-foreground">
              8.1 Rights under UK/EU GDPR
            </h3>
            <p>
              If you are located in the UK, EEA, or Switzerland, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Right of access: to obtain a copy of your personal data</li>
              <li>Right to rectification: to correct inaccurate data</li>
              <li>Right to erasure: to request deletion of your data</li>
              <li>Right to restriction: to limit how we process your data</li>
              <li>
                Right to data portability: to receive your data in a machine-readable format
              </li>
              <li>
                Right to object: to object to processing based on legitimate interests or for
                direct marketing
              </li>
              <li>
                Rights related to automated decision-making: we do not use automated decision-making
                that produces significant effects
              </li>
            </ul>
            <p>
              To exercise these rights, contact <Mail />. We will respond within 30 days. If you
              are unsatisfied with our response, you have the right to lodge a complaint with your
              supervisory authority. In the UK, this is the Information Commissioner's Office
              (ico.org.uk). In Ireland, this is the Data Protection Commission (dataprotection.ie).
            </p>

            <h3 className="text-foreground">
              8.2 Rights under US state privacy laws
            </h3>
            <p>
              California (CCPA/CPRA): You have the right to know what personal information we
              collect, to request deletion, to opt out of the sale of personal information (we do
              not sell personal information), and to non-discrimination for exercising your rights.
            </p>
            <p>
              Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), and other US state privacy
              laws: You have similar rights to access, correct, delete, and port your personal data,
              and to opt out of targeted advertising. Because we serve non-personalized ads, we do
              not engage in targeted advertising as defined under these laws.
            </p>
            <p>
              To exercise your US state privacy rights, email{" "}
              <Mail subject="Privacy Request" /> with "Privacy Request" in the subject line. We
              will respond within 45 days.
            </p>

            <h3 className="text-foreground">
              8.3 Email opt-out
            </h3>
            <p>
              You may opt out of the weekly Privacy Intelligence Report email at any time by
              updating your preferences at enduserprivacy.com/brief-preferences or by contacting
              us. Transactional emails (receipts, password resets) cannot be disabled while your
              account is active.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              9. International Data Transfers
            </h2>
            <p>
              End User Privacy is operated from the United States. Our primary service providers
              (Supabase, Anthropic, Stripe) process data in the United States.
            </p>
            <p>
              If you are located in the UK or EEA, your personal data is transferred to the United
              States. We rely on the following safeguards for these transfers:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase: relies on Standard Contractual Clauses (SCCs)</li>
              <li>Anthropic: relies on Standard Contractual Clauses (SCCs)</li>
              <li>Stripe: relies on the EU-U.S. Data Privacy Framework and SCCs</li>
            </ul>
            <p>
              You may request a copy of the applicable transfer mechanisms by contacting <Mail />.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              10. Children's Privacy
            </h2>
            <p>
              The Site is not directed at children under the age of 16. We do not knowingly collect
              personal data from children under 16. If you believe we have inadvertently collected
              data from a child under 16, please contact <Mail /> and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">11. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your
              personal data, including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encrypted connections (HTTPS/TLS) for all data in transit</li>
              <li>
                Supabase row-level security policies restricting data access to the account holder
              </li>
              <li>Hashed and salted password storage (managed by Supabase Auth)</li>
              <li>API key restrictions limiting third-party service access</li>
            </ul>
            <p>
              No security measure is perfect. In the event of a personal data breach that is likely
              to result in risk to your rights and freedoms, we will notify affected users and
              relevant supervisory authorities as required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              12. Third-Party Links
            </h2>
            <p>
              The Privacy Intelligence Feed contains links to external publications, regulatory
              announcements, and law firm articles. This Privacy Policy does not apply to those
              third-party websites. We encourage you to review the privacy policies of any
              third-party site you visit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              13. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes,
              we will update the "Last updated" date at the top of this page and, where required by
              law, notify you by email. Your continued use of the Site after changes are posted
              constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">14. Contact Us</h2>
            <p>
              For any questions, requests, or complaints regarding this Privacy Policy or our data
              practices, contact:
            </p>
            <p>
              End User Privacy
              <br />
              Email: <Mail />
              <br />
              Website: enduserprivacy.com
            </p>
            <p>
              For UK/EU data protection queries, you may also contact us at the same email address
              marked "Data Protection Enquiry."
            </p>
          </section>

          <p className="text-sm text-muted-foreground pt-4">© 2026 EUP, LLC</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
