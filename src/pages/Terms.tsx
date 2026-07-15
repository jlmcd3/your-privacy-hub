import LegalPageLayout, { type LegalSection } from "@/components/LegalPageLayout";

const SECTIONS: LegalSection[] = [
  { id: "acknowledgements", label: "Your Acknowledgements" },
  { id: "site", label: "The Site" },
  { id: "orders-pricing", label: "Orders & Pricing" },
  { id: "third-parties", label: "Third Parties" },
  { id: "license", label: "License & Restrictions" },
  { id: "term-termination", label: "Term & Termination" },
  { id: "confidentiality", label: "Confidentiality" },
  { id: "feedback", label: "Feedback License" },
  { id: "modifications", label: "Modifications to This Agreement" },
  { id: "legal-matters", label: "Legal Matters" },
  { id: "general", label: "General" },
];

const Terms = () => {
  return (
    <LegalPageLayout
      title="EndUserPrivacy Terms of Service"
      metaTitle="Terms of Service | End User Privacy"
      metaDescription="Terms of Service governing use of enduserprivacy.com, including acknowledgements, orders, licenses, confidentiality, and limitation of liability."
      lastUpdated="May 15, 2026"
      ariaLabel="Terms of Service"
      sections={SECTIONS}
    >
      <div className="prose prose-sm max-w-none space-y-8 font-serif-text text-fluid-base text-ink">
          <section className="space-y-3">
            <p>
              These Terms of Service (the "Agreement") govern use of the enduserprivacy.com
              website (the "Site") and all information, tools, documents, agreements and services
              available through the Site provided by Enduserprivacy ("we", "us" and "our"). By using
              the Site or purchasing any documents and/or agreements made available through the
              Site, you, the individual using the Site and/or placing an order through the Site
              ("you" and "your"), agree to all of the provisions of this Agreement. By agreeing to
              this Agreement, you represent that you are at least the age of majority in your state
              or province of residence, or that you are the age of majority in your state or
              province of residence and you have given us your consent to allow any of your minor
              dependents to use this site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              Your Acknowledgements
            </h2>
            <p>
              YOU ACKNOWLEDGE AND AGREE THAT ENDUSERPRIVACY DOES NOT OFFER OR PROVIDE LEGAL ADVICE,
              LEGAL REPRESENTATION OR LEGAL OPINIONS. YOU SHOULD CONSULT A LICENSED ATTORNEY FOR
              ANY LEGAL ADVICE ON ANY SUBJECT MATTER INCLUDED IN ANY ENDUSERPRIVACY DOCUMENTS MADE
              AVAILABLE TO YOU. ANY RELIANCE ON THE MATERIAL MADE AVAILABLE THROUGH ENDUSERPRIVACY
              IS AT YOUR OWN RISK.
            </p>
            <p>
              YOU ACKNOWLEDGE AND AGREE THAT AGREEMENTS AND DOCUMENTS MADE AVAILABLE THROUGH
              ENDUSERPRIVACY ARE LICENSED TO YOU FOR YOUR PERSONAL USE ONLY AND EXCEPT FOR SUCH
              LICENSE FOR YOUR INDIVIDUAL USE, MAY NOT BE COPIED, SOLD, LICENSED, RE-SOLD,
              SUBLICENSED, PUBLISHED, REPUBLISHED, OR TRANSFERRED IN ANY MANNER BY YOU OR ANY THIRD
              PARTY, OR USED OR STORED ON ANY COMPUTING DEVICE NOT WITHIN YOUR DIRECT CONTROL
              ("RESTRICTIONS").
            </p>
            <p>
              IF YOU REVIEW OUR PRODUCTS, YOU ACKNOWLEDGE AND AGREE THAT THE TEXT OF YOUR REVIEW
              MAY BE PUBLISHED ON ENDUSERPRIVACY.COM AND THAT IF ANY SPECIAL OFFERS ARE CONNECTED
              WITH A REVIEW, A NEGATIVE REVIEW, AS DETERMINED BY ENDUSERPRIVACY IN ITS SOLE
              DISCRETION, REVOKES ANY SUCH OFFERS MADE TO YOU.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">The Site</h2>
            <p>
              Any new features or tools which are added to the Site shall also be subject to this
              Agreement. You can review the most current version of the Terms of Service at any
              time on this page. You agree that from time to time we may remove the service for
              indefinite periods of time or cancel the Site or any products made available through
              the Site service at any time, without notice to you. You expressly agree that your
              use of, or inability to use, the Site is at your sole risk.
            </p>
            <p>
              We reserve the right to update, change or replace any part of this Agreement by
              posting updates and/or changes to the Site. It is your responsibility to check this
              page periodically for changes. Your continued use of or access to the Site following
              the posting of any changes constitutes acceptance of those changes. Our store is
              hosted on Shopify Inc. They provide us with the online e-commerce platform that
              allows us to sell our products and services to you. You may not use our products for
              any illegal or unauthorized purpose nor may you, in the use of the Service, violate
              any laws in your jurisdiction (including but not limited to copyright laws).
            </p>
            <p>
              You must not transmit any worms or viruses or any code of a destructive nature. A
              breach or violation of any of the Terms will result in an immediate termination of
              your Services. We reserve the right to refuse service to anyone for any reason at
              any time. You understand that your content (not including credit card information),
              may be transferred unencrypted and involve (a) transmissions over various networks;
              and (b) changes to conform and adapt to technical requirements of connecting networks
              or devices. Credit card information is always encrypted during transfer over networks.
            </p>
            <p>
              We are not responsible if information made available on the Site or in documents or
              agreements or other materials made available through the Site is not accurate,
              complete or current. The material on this site is provided for general information
              only and should not be relied upon or used as the sole basis for making decisions
              without consulting primary, more accurate, more complete or more timely sources of
              information. Any reliance on the material on this site is at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">Orders &amp; Pricing</h2>
            <p>
              Prices for our products are subject to change without notice. We reserve the right at
              any time to modify or discontinue access to the Site (or any part or content thereof)
              without notice at any time. We shall not be liable to you or to any third-party for
              any modification, price change, suspension or discontinuance of the Site or any
              products or materials that were or are made available on the Site.
            </p>
            <p>
              We reserve the right, but are not obligated, to limit the sales of our products or
              Services to any person, geographic region or jurisdiction. We may exercise this right
              on a case-by-case basis. We reserve the right to limit the quantities of any products
              or services that we offer. All descriptions of products or product pricing are
              subject to change at any time without notice, at our sole discretion. We reserve the
              right to discontinue any product at any time. Any offer for any product or service
              made on this site is void where prohibited.
            </p>
            <p>
              We reserve the right to refuse any order you place with us. We may, in our sole
              discretion, limit or cancel quantities purchased per person, per household or per
              order. These restrictions may include orders placed by or under the same customer
              account, the same credit card, and/or orders that use the same billing and/or
              shipping address. In the event that we make a change to or cancel an order, we may
              attempt to notify you by contacting the e-mail and/or billing address/phone number
              provided at the time the order was made. We reserve the right to limit or prohibit
              orders that, in our sole judgment, appear to be placed by dealers, resellers or
              distributors.
            </p>
            <p>
              You agree to provide current, complete and accurate purchase and account information
              for all purchases made at our store. You agree to promptly update your account and
              other information, including your email address and credit card numbers and
              expiration dates, so that we can complete your transactions and contact you as
              needed.
            </p>
            <p className="font-semibold">
              BY PLACING AN ORDER, YOU CONSENT TO ALLOW ENDUSERPRIVACY AND ITS PAYMENT PROCESSORS
              TO CHARGE YOUR METHOD OF PAYMENT FOR THE AMOUNTS DUE FOR YOUR ORDER, PLUS APPLICABLE
              TAXES, IF ANY. YOU AGREE THAT ENDUSERPRIVACY AND ITS OWNERS, OFFICERS, DIRECTORS,
              EMPLOYEES, AGENTS, SUCCESSORS AND ASSIGNS SHALL NOT HAVE ANY LIABILITY TO YOU FOR
              ANY ACTS OR OMISSIONS OF PAYMENT PROCESSORS OR ORDER FULFILLMENT PROVIDERS ENGAGED
              TO PROCESS AND FULFILL YOUR ORDERS.
            </p>
            <p className="font-semibold">
              YOU ACKNOWLEDGE AND AGREE THAT ALL DIGITAL DOWNLOADABLE PRODUCTS MADE AVAILABLE
              THROUGH THE SITE ARE NOT RETURNABLE AND THAT ONCE YOU ARE CHARGED FOR YOUR ORDER,
              YOU WILL NOT BE ABLE TO RETURN ITEMS IN YOUR ORDER AND YOU WILL NOT BE ENTITLED TO
              ANY REFUNDS. YOU ALSO AGREE THAT YOU WILL NOT CONTEST ANY CHARGES TO THE METHOD OF
              PAYMENT USED TO COMPLETE YOUR ORDER UNLESS THERE IS AN ERROR IN YOUR ORDER OR AN
              ERROR CALCULATING SUCH CHARGES.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground">Third Parties</h3>
            <p>
              We may provide you with access to third-party tools over which we neither monitor nor
              have any control nor input. You acknowledge and agree that we provide access to such
              tools "as is" and "as available" without any warranties, representations or
              conditions of any kind and without any endorsement. We shall have no liability
              whatsoever arising from or relating to your use of optional third-party tools. Any
              use by you of optional tools offered through the site is entirely at your own risk
              and discretion and you should ensure that you are familiar with and approve of the
              terms on which tools are provided by the relevant third-party provider(s). We may
              also, in the future, offer new products, services and/or features through the website
              (including, the release of new tools and resources). Such new features and/or
              services shall also be subject to this Agreement.
            </p>
            <p>
              Certain content, products and services available via our Service may include
              materials from third-parties. Third-party links on this site may direct you to
              third-party websites that are not affiliated with us. We are not responsible for
              examining or evaluating the content or accuracy and we do not warrant and will not
              have any liability or responsibility for any third-party materials or websites, or
              for any other materials, products, or services of third-parties.
            </p>
            <p>
              We are not liable for any harm or damages related to the purchase or use of goods,
              services, resources, content, or any other transactions made in connection with any
              third-party websites. Please review carefully the third-party's policies and
              practices and make sure you understand them before you engage in any transaction.
              Complaints, claims, concerns, or questions regarding third-party products should be
              directed to the third-party.
            </p>
            <p>
              Occasionally there may be information on our Site or in products or documents made
              available through the Site that contain errors, inaccuracies or omissions that may
              relate to product descriptions, pricing, promotions, offers, product shipping
              charges, terms and conditions, transit times and availability. We reserve the right
              to, but are not obligated to, correct any errors, inaccuracies or omissions, and to
              change or update information or cancel orders if any information in the Service or
              on any related website is inaccurate at any time without prior notice (including
              after you have submitted your order).
            </p>
            <p>
              We undertake no obligation to update, amend or clarify information in the Site or
              within products or documents made available through the Site or on any related
              website, including without limitation, pricing information, except as required by
              law. No specified update or refresh date applied in the Service or on any related
              website, should be taken to indicate that all information in the Service or on any
              related website has been modified or updated.
            </p>
            <p>
              In addition to other prohibitions as set forth in this Agreement, you are prohibited
              from using the Site or its content: (a) for any unlawful purpose; (b) to solicit
              others to perform or participate in any unlawful acts; (c) to violate any
              international, federal, provincial or state regulations, rules, laws, or local
              ordinances; (d) to infringe upon or violate our intellectual property rights or the
              intellectual property rights of others; (e) to harass, abuse, insult, harm, defame,
              slander, disparage, intimidate, or discriminate based on gender, sexual orientation,
              religion, ethnicity, race, age, national origin, or disability; (f) to submit false
              or misleading information; (g) to upload or transmit viruses or any other type of
              malicious code that will or may be used in any way that will affect the functionality
              or operation of the Service or of any related website, other websites, or the
              Internet; (h) to collect or track the personal information of others; (i) to spam,
              phish, pharm, pretext, spider, crawl, or scrape; (j) for any obscene or immoral
              purpose; or (k) to interfere with or circumvent the security features of the Service
              or any related website, other websites, or the Internet. We reserve the right to
              terminate your use of the Site or products and documents ordered through the Site
              for violating any of the prohibited uses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              License &amp; Restrictions
            </h2>
            <p>
              <strong>License:</strong> Subject to the terms of this Agreement, we hereby grant to
              you a personal, non-exclusive, non-transferable, non-sublicensable license to copy
              and modify agreements and documents you order through the Site solely for your own
              use. Except for the foregoing license, no other rights or licenses are granted to
              you, whether express or implied, and we and our suppliers own all right, title and
              interest in and to the Sites and all documents, agreements and other materials on or
              available through the Site.
            </p>
            <p>
              <strong>License Restrictions:</strong> In consideration of the license granted to
              you, you agree not to, or permit any third party to: (i) copy, reproduce, modify,
              damage, frame, disassemble, decompile, reverse engineer or create derivative works
              of all or part of the Site or the agreements or documents made available through the
              Site except as expressly authorized in this Agreement; (ii) with, modify, circumvent,
              disrupt, disable or interfere with the Site or services made available through the
              Site; (iii) use the Site or materials made available through the Site for illegal
              purposes, or in a manner which violates or infringes upon the intellectual property
              rights or other rights of any other party, or that may result in civil or criminal
              liability; (iv) use the Site in any manner that could damage, disable, overburden,
              or impair or interfere in any way with the use or enjoyment of the Site by others;
              (v) sell, rent, lease, sublicense, distribute, redistribute, syndicate, create
              derivative works of, assign or otherwise transfer or provide access to, in whole or
              in part, the documents, agreements and other materials made available through the
              Site to any third party. SOME OR ALL DOCUMENTS AND AGREEMENTS MADE AVAILABLE THROUGH
              THE SITE MAY BE TRACKED THROUGH RIGHTS MANAGEMENT METHODS, AND YOU EXPRESSLY
              ACKNOWLEDGE AND AGREE THAT SUCH TRACKING IS AUTHORIZED BY YOU AND YOU HEREBY PROVIDE
              YOUR EXPRESS CONSENT TO THE SAME. IN NO EVENT WILL YOU USE, OR ALLOW THE USE OF, THE
              SITE OR DOCUMENTS OR AGREEMENTS OR OTHER MATERIALS MADE AVAILABLE THROUGH THE SITE
              TO CREATE, SUPPORT, IMPROVE OR ENHANCE (DIRECTLY OR INDIRECTLY) OR OFFER A
              SUBSTANTIALLY SIMILAR PRODUCT OR SERVICE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              Term &amp; Termination
            </h2>
            <p>
              The obligations and liabilities of the parties incurred prior to the termination
              date shall survive the termination of this agreement for all purposes. If in our
              sole judgment you fail, or we suspect that you have failed, to comply with any term
              or provision of this Agreement, or for any reason or no reason, we also terminate
              this Agreement at any time without notice and you will remain liable for all amounts
              due up to and including the date of termination; and/or accordingly may deny you
              access to our Site (or any part thereof) and/or terminate your license to use the
              products, agreements, and or documents that you've licensed. The provisions of the
              following sections shall survive expiration or termination of this Agreement: "Your
              Acknowledgements," "The Site," "Orders &amp; Pricing," "License Restrictions," "Term
              &amp; Termination," "Confidentiality," "Feedback License," "Legal Matters,"
              "General."
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">Confidentiality</h2>
            <p>
              Each party agrees that all business, technical and financial information, and any
              form of agreements or contracts it obtains from the other party is the confidential
              property of the disclosing party ("Proprietary Information"). Except as expressly
              allowed in this Agreement, the receiving party will hold in confidence, using no
              less than reasonable care, and not use or disclose any Proprietary Information of
              the disclosing party. The receiving party shall not be obligated with respect to
              information the receiving party can document: (i) is or has become readily publicly
              available without restriction through no fault of the receiving party or its
              employees or agents; (ii) is received without restriction from a third party lawfully
              in possession of such information; (iii) was rightfully in the possession of the
              receiving party without restriction prior to its disclosure by the other party; or
              (iv) was independently developed by employees or consultants of the receiving party
              without use of or access to such Proprietary Information. Each party agrees that the
              disclosing party would be irreparably injured by a breach of the foregoing
              obligations by the receiving party or its representatives and that the disclosing
              party will be entitled to equitable relief, including injunctive relief and specific
              performance, in the event of any breach of the foregoing. Such remedies will not be
              deemed to be the exclusive remedies of a breach of the foregoing, but will be in
              addition to all other remedies available at law or in equity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">Feedback License</h2>
            <p>
              If you provide any idea, recommendation or other suggestion regarding possible
              corrections, improvements or extensions related to any aspect of the Site or
              documents or agreements made available through the Site (collectively, "Feedback")
              to us in any form or by any means (whether through the Services, or by direct
              communication (e.g., e-mail) with us or any of its officers, directors, employees,
              representatives, or agents), then you: (i) represent and warrant that the Feedback
              does not include your own or any third party's confidential or proprietary
              information or intellectual property rights; (ii) acknowledge and agree that Company
              is under no obligation of confidentiality, express or implied, with respect to the
              Feedback; and (ii) agree to grant and do hereby grant to us and our affiliates,
              licensees, successors and assigns a non-exclusive, transferable, perpetual,
              irrevocable, royalty-free, worldwide right and license to use, modify and make
              derivative works of the Feedback, in any manner and for any purpose, and to permit
              third parties to do the same.
            </p>
            <p>
              If, at our request, you send certain specific submissions (for example contest
              entries) or without a request from us you send creative ideas, suggestions,
              proposals, plans, or other materials, whether online, by email, by postal mail, or
              otherwise (collectively, 'comments'), you agree that we may, at any time, without
              restriction, edit, copy, publish, distribute, translate and otherwise use in any
              medium any comments that you forward to us. We are and shall be under no obligation
              (1) to maintain any comments in confidence; (2) to pay compensation for any
              comments; or (3) to respond to any comments.
            </p>
            <p>
              We may, but have no obligation to, monitor, edit or remove content that we determine
              in our sole discretion are unlawful, offensive, threatening, libelous, defamatory,
              pornographic, obscene or otherwise objectionable or violates any party's
              intellectual property or these Terms of Service.
            </p>
            <p>
              You agree that your comments will not violate any right of any third-party,
              including copyright, trademark, privacy, personality or other personal or proprietary
              right. You further agree that your comments will not contain libelous or otherwise
              unlawful, abusive or obscene material, or contain any computer virus or other
              malware that could in any way affect the operation of the Service or any related
              website. You may not use a false e-mail address, pretend to be someone other than
              yourself, or otherwise mislead us or third-parties as to the origin of any comments.
              You are solely responsible for any comments you make and their accuracy. We take no
              responsibility and assume no liability for any comments posted by you or any
              third-party. Your submission of personal information through the store is governed
              by our Privacy Policy. To view our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">
              Modifications to This Agreement
            </h2>
            <p>
              We reserve the right, in our sole discretion, to update, modify or replace this
              Agreement, in whole or in part, at any time; provided, however, that the updated,
              modified or new Agreement becomes effective: (i) immediately for a Free Trial, or
              upon renewal of your Subscription Period if you have a paid Account. We will notify
              you of any material change to this Agreement in advance of the effective date of
              any change, provided that price changes shall be managed as provided in the section
              entitled "Subscription Period and Subscription Fees" (above). Change notices may be
              communicated by postings at or through the geocode.earth web or by sending
              information regarding the changes to the email address you provided to us. You are
              responsible for periodically checking the geocode.earth website for changes.
              Continued access or use of the Services following any change to this Agreement
              constitutes your acceptance of those changes. This Agreement may not otherwise be
              amended, except by a written agreement executed by you and us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">Legal Matters</h2>
            <p>
              <u>No Warranties</u>. THE SITE, THE DOCUMENTS AND AGREEMENTS AND PRODUCTS MADE
              AVAILABLE THROUGH THE SITE, AND ALL OTHER DATA AND ELEMENTS PROVIDED THROUGH THE
              SITE ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, WHETHER EXPRESS OR IMPLIED,
              INCLUDING, BUT NOT LIMITED TO, ALL IMPLIED WARRANTIES OF ACCURACY, INTEGRATION,
              TITLE, NON-INFRINGEMENT, QUIET ENJOYMENT, MERCHANTABILITY, NON-INFRINGEMENT, AND
              FITNESS FOR A PARTICULAR PURPOSE, AND ALL WARRANTIES IMPLIED BY ANY COURSE OF
              PERFORMANCE OR USAGE OF TRADE, ALL OF WHICH ARE HEREBY EXPRESSLY DISCLAIMED.
              ENDUSERPRIVACY AND ITS AFFILIATES, LICENSORS, SUPPLIERS AND THEIR RESPECTIVE OWNERS,
              OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUCCESSORS AND ASSIGNS DO NOT WARRANT THAT:
              (A) ANY INFORMATION OR CONTENT MADE AVAILABLE TO YOU WILL BE TIMELY, ACCURATE,
              RELIABLE OR CORRECT; (B) THE SITE OR TRANSMISSION OF ORDERS WILL BE SECURE OR
              AVAILABLE AT ANY PARTICULAR TIME OR PLACE; (C) ANY DEFECTS OR ERRORS WILL BE
              CORRECTED; (D) THAT THE SERVICES WILL BE FREE OF VIRUSES OR OTHER HARMFUL
              COMPONENTS; OR (E) ANY RESULT OR OUTCOME CAN BE ACHIEVED. USE OF THE SERVICES IS
              SOLELY AT YOUR OWN RISK.
            </p>
            <p>
              <u>Limitation of Liability</u>. IN NO EVENT SHALL ENDUSERPRIVACY AND ITS AFFILIATES,
              LICENSORS, SUPPLIERS AND THEIR RESPECTIVE OWNERS, OFFICERS, DIRECTORS, EMPLOYEES,
              AGENTS, SUCCESSORS AND ASSIGNS BE LIABLE CONCERNING ANY SUBJECT MATTER RELATED TO
              THE SITE, THE DOCUMENTS OR AGREEMENTS OR PRODUCTS MADE AVAILABLE THROUGH THE SITE,
              THE CONTENT OR OTHER ASPECTS OF THE SITE OR PRODUCTS AVAILABLE THROUGH THE SITE,
              REGARDLESS OF THE FORM OF ANY CLAIM OR ACTION (WHETHER IN CONTRACT, NEGLIGENCE,
              STRICT LIABILITY OR OTHERWISE), FOR ANY (A) MATTER BEYOND ITS DIRECT CONTROL, (B)
              LOSS OR INACCURACY OF DATA, LOSS OR INTERRUPTION OF USE, DATA, OR COST OF PROCURING
              SUBSTITUTE TECHNOLOGIES, GOODS OR SERVICES, (C) INDIRECT, PUNITIVE, INCIDENTAL,
              RELIANCE, SPECIAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO,
              LOSS OF BUSINESS, REVENUES, PROFITS OR GOODWILL, OR (D) DAMAGES, IN THE AGGREGATE,
              IN EXCESS OF AMOUNTS YOU PAID FOR YOUR ORDERS IN THE ONE-MONTH PERIOD PRIOR TO THE
              DATE THE CLAIM AROSE, OR US$50.00, WHICHEVER IS LESS, EVEN IF ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              <u>Limits</u>. SOME STATES AND OTHER JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR
              LIMITATION OF LIABILITY FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO THE ABOVE
              LIMITATIONS AND EXCLUSIONS MAY NOT APPLY TO YOU.
            </p>
            <p>
              <u>Indemnification</u>: You agree to indemnify, defend and hold Enduserprivacy and
              its owners, directors, officers, employees, affiliates, agents, contractors, interns,
              suppliers, service providers, licensors, successors and assigns harmless from and
              against all claims, liabilities, losses, expenses, damages, fines, penalties, and
              costs and expenses, including but not limited to reasonable attorneys' fees and
              costs of expert witnesses arising out of your use of the Site website or any
              materials made available through Enduserprivacy, including but not limited to any
              third-party claims, arising out of your use of the Site or arising out of or related
              to the documents and materials made available through the Site, including but not
              limited to: (i) a violation or breach of this Agreement by you, (ii) any activity
              related to access or use of the Site or documents or agreements made available to
              you through the Site, or (iii) use of your credit card information by payment
              processors.
            </p>
            <p>
              <u>Government Licensees</u>: The Site and documents, agreements and materials made
              available through the Site are "Commercial Items", as that term is defined at 48
              C.F.R. §2.101, consisting of "Commercial Computer Software" and "Commercial Computer
              Software Documentation", as such terms are used in 48 C.F.R. §12.212 or 48 C.F.R.
              §227.7202, as applicable. Consistent with 48 C.F.R. §12.212 or 48 C.F.R. §227.7202-1
              through 227.7202-4, as applicable, the Commercial Computer Software and Commercial
              Computer Software Documentation are being licensed to U.S. Government end users (a)
              only as Commercial Items and (b) with only those rights as are granted to all other
              end users pursuant to this Agreement and conditions herein, provided that if any
              part of this Agreement is invalid or unenforceable against you, as a government end
              user, because of applicable local, national, state or federal law, then that portion
              shall be deemed invalid or unenforceable, as the case may be, and instead construed
              in a manner most consistent with applicable governing law.
            </p>
            <p>
              <u>Covenants</u>. YOU COVENANT AND AGREE THAT YOU SHALL NOT, AND SHALL NOT AUTHORIZE
              OR APPROVE ANY THIRD PARTY TO, ASSERT AGAINST ENDUSERPRIVACY OR ITS LICENSORS OR
              THEIR RESPECTIVE OWNERS, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUCCESSORS AND
              ASSIGNS, ANY CLAIMS THAT ANY MATERIALS ON THE SITE OR MADE AVAILABLE THROUGH THE
              SITE INFRINGE OR MISAPPROPRIATE YOUR RIGHTS OR THE RIGHTS OF ANY THIRD PARTY.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-foreground">General</h2>
            <p>
              Your rights and obligations under this Agreement are personal to you, and are not
              assignable, transferable or sublicensable by you except with our prior written
              consent. We may subcontract, delegate, assign or otherwise transfer any or all of
              its rights and obligations hereunder without your consent and without notice to you.
              All waivers, consents and modifications must be in a writing signed by both parties,
              except as otherwise provided in this Agreement. No failure or delay in exercising
              any right hereunder will operate as a waiver thereof, nor will any partial exercise
              of any right or power hereunder preclude further exercise of that right or power.
              No agency, partnership, joint venture, or employment relationship is created as a
              result of the Services or this Agreement, and neither party has any authority of any
              kind to bind the other in any respect. Unless otherwise provided in this Agreement,
              all notices under this Agreement will be in writing, in English and will be deemed
              to have been duly given: when received, if personally delivered or sent by certified
              or registered mail or express courier; or when receipt is electronically confirmed,
              if transmitted by e-mail, which shall constitute written notice. Neither party shall
              be liable hereunder by reason of any failure or delay in the performance of its
              obligations hereunder (except for payments of money) on account of strikes,
              shortages, failure of suppliers, riots, insurrection, fires, floods, storms,
              earthquakes, acts of God, war, governmental action, labor conditions, or any other
              cause which is beyond the reasonable control of such party. The terms of any written
              ordering document or similar form from you will not apply, except to the extent that
              we have accepted the written ordering document expressly states that a provision of
              this Agreement is to be superseded and we have accepted that document in writing. If
              any provision of this Agreement is deemed by any court of competent jurisdiction to
              be unenforceable or invalid, that provision shall be limited or eliminated to the
              minimum extent necessary so that this Agreement shall otherwise remain in full force
              and effect. This Agreement shall be governed by the laws of the State of California
              without regard to conflicts of laws provisions thereof, and you and Enduserprivacy
              consent to the exclusive jurisdiction and venue of the California state courts in
              and for Santa Clara County, California for any action arising out of or related to
              this Agreement. The headings used in this Agreement are included for convenience
              only and will not limit or otherwise affect this Agreement. The parties agree that
              the United Nations Convention on the International Sale of Goods and the Uniform
              Computer Information Transactions Act shall not apply to this Agreement, regardless
              of the states in which the parties are located, do business or are incorporated.
              This Agreement is the complete and exclusive statement of the mutual understanding
              of the parties and supersedes and cancels all previous written and oral agreements
              and communications relating to the subject matter of this Agreement.
            </p>
            <p>All rights not expressly granted herein are reserved.</p>
            <p>
              If you have any questions regarding these TOS or your dealings with the Service,
              please contact us at{" "}
              <a
                href="mailto:orders@enduserprivacy.com"
                className="text-primary hover:underline"
              >
                orders@enduserprivacy.com
              </a>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Last Updated.
              <br />
              May 15, 2026
              <br />© 2026 EUP, LLC
            </p>
          </section>
        </div>
    </LegalPageLayout>
  );
};

export default Terms;
