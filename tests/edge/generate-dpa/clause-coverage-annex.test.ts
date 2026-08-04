// DPA-ANNEX (Master Spec §4.11, item 10) — deterministic Art. 28(3)
// clause-coverage checker tests. The checker must be purely deterministic:
// same text + same provision row ⇒ same verdicts, no model involvement.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkArt28Coverage,
  parseArt28Segments,
  renderArt28CoverageAnnex,
  splitDpaSections,
  ANNEX_HEADING,
} from "../../../supabase/functions/_shared/dpa-clause-coverage.ts";

// Provision-store shape for `gdpr-art-28` (approved verbatim excerpt).
const ART28_EXCERPT = `1. Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures in such a manner that processing will meet the requirements of this Regulation and ensure the protection of the rights of the data subject.

2. The processor shall not engage another processor without prior specific or general written authorisation of the controller. In the case of general written authorisation, the processor shall inform the controller of any intended changes concerning the addition or replacement of other processors, thereby giving the controller the opportunity to object to such changes.

3. Processing by a processor shall be governed by a contract or other legal act under Union or Member State law, that is binding on the processor with regard to the controller and that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller. That contract or other legal act shall stipulate, in particular, that the processor:

(a)

processes the personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which the processor is subject; in such a case, the processor shall inform the controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest;

(b)

ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality;

(c)

takes all measures required pursuant to Article 32;

(d)

respects the conditions referred to in paragraphs 2 and 4 for engaging another processor;

(e)

taking into account the nature of the processing, assists the controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the controller's obligation to respond to requests for exercising the data subject's rights laid down in Chapter III;

(f)

assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor;

(g)

at the choice of the controller, deletes or returns all the personal data to the controller after the end of the provision of services relating to processing, and deletes existing copies unless Union or Member State law requires storage of the personal data;

(h)

makes available to the controller all information necessary to demonstrate compliance with the obligations laid down in this Article and allow for and contribute to audits, including inspections, conducted by the controller or another auditor mandated by the controller.

With regard to point (h) of the first subparagraph, the processor shall immediately inform the controller if, in its opinion, an instruction infringes this Regulation or other Union or Member State data protection provisions.`;

const PROVISION = {
  key: "gdpr-art-28",
  status: "approved",
  citation: "GDPR Art. 28",
  excerpt: ART28_EXCERPT,
};

// A known contract text drafted to cover every mandatory clause.
const FULL_CONTRACT = `DATA PROCESSING AGREEMENT

1. SUBJECT-MATTER AND DURATION
This Agreement is a binding legal act which sets out the subject-matter and duration of the processing, its nature and purpose, the type of personal data and the categories of data subjects, and the obligations and rights of the Controller. It stipulates in particular the following.

2. DOCUMENTED INSTRUCTIONS
The Processor processes the personal data only on documented instructions from the Controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by applicable law to which the Processor is subject; in such a case the Processor informs the Controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest.

3. CONFIDENTIALITY OF PERSONNEL
The Processor ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

4. SECURITY MEASURES
The Processor takes all measures required pursuant to Article 32, implementing pseudonymisation, encryption, resilience and regular testing of the security of processing.

5. SUB-PROCESSORS
The Processor respects the conditions referred to in paragraphs 2 and 4 of Article 28 for engaging another processor, and does not engage another processor without prior specific or general written authorisation of the Controller, informing the Controller of any intended changes concerning the addition or replacement of other processors.

6. ASSISTANCE WITH DATA SUBJECT RIGHTS
Taking into account the nature of the processing, the Processor assists the Controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the Controller's obligation to respond to requests for exercising the data subject's rights laid down in Chapter III.

7. ASSISTANCE WITH ARTICLES 32 TO 36
The Processor assists the Controller in ensuring compliance with the obligations pursuant to Articles 32 to 36, taking into account the nature of processing and the information available to the Processor.

8. RETURN OR DELETION
At the choice of the Controller, the Processor deletes or returns all the personal data to the Controller after the end of the provision of services relating to processing, and deletes existing copies unless applicable law requires storage of the personal data.

9. AUDITS AND INFORMATION
The Processor makes available to the Controller all information necessary to demonstrate compliance with the obligations laid down in this Article and allows for and contributes to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller.

10. INSTRUCTION INFRINGEMENT NOTICE
The Processor shall immediately inform the Controller if, in its opinion, an instruction infringes the GDPR or other applicable data protection provisions.

SIGNED for and on behalf of the Controller:
Name: ____________  Title: ____________  Date: ____________
SIGNED for and on behalf of the Processor:
Name: ____________  Title: ____________  Date: ____________`;

// Truncated text: cut after clause 4 — (e), (f), (g), (h) and the second
// subparagraph are genuinely absent.
const TRUNCATED_CONTRACT = FULL_CONTRACT.split("5. SUB-PROCESSORS")[0];

Deno.test("DPA-ANNEX — provision excerpt parses into chapeau + (a)-(h) + second subparagraph", () => {
  const segs = parseArt28Segments(ART28_EXCERPT);
  const keys = segs.map((s) => s.clause);
  assertEquals(keys[0], "chapeau");
  for (const l of ["a", "b", "c", "d", "e", "f", "g", "h"]) assert(keys.includes(l), `missing ${l}`);
  assert(keys.includes("second_subparagraph"));
  assertEquals(segs.length, 10);
});

Deno.test("DPA-ANNEX — all-present contract: every mandatory clause found with a location", () => {
  const cov = checkArt28Coverage(FULL_CONTRACT, PROVISION);
  assertEquals(cov.clauses.length, 10);
  const absent = cov.clauses.filter((c) => c.status === "absent").map((c) => c.clause);
  assertEquals(absent, [], `unexpected absent clauses: ${absent.join(", ")}`);
  assertEquals(cov.present_count, 10);
  assertEquals(cov.absent_count, 0);
  for (const c of cov.clauses) {
    assert(c.location && c.location.length > 0, `no location for ${c.clause}`);
  }
});

Deno.test("DPA-ANNEX — truncated contract: tail clauses detected as absent", () => {
  const cov = checkArt28Coverage(TRUNCATED_CONTRACT, PROVISION);
  const absent = new Set(cov.clauses.filter((c) => c.status === "absent").map((c) => c.clause));
  for (const l of ["e", "f", "g", "h", "second_subparagraph"]) {
    assert(absent.has(l), `clause ${l} should be absent in truncated text`);
  }
  assert(cov.absent_count >= 5);
  for (const c of cov.clauses) {
    if (c.status === "absent") assertEquals(c.location, null);
  }
});

Deno.test("DPA-ANNEX — deterministic: repeated runs produce identical verdicts", () => {
  const a = checkArt28Coverage(FULL_CONTRACT, PROVISION);
  const b = checkArt28Coverage(FULL_CONTRACT, PROVISION);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

Deno.test("DPA-ANNEX — renderer emits clause / requirement / status / location rows", () => {
  const cov = checkArt28Coverage(TRUNCATED_CONTRACT, PROVISION);
  const annex = renderArt28CoverageAnnex(cov);
  assert(annex.startsWith(ANNEX_HEADING));
  assert(annex.includes("GDPR Art. 28(3) — chapeau"));
  assert(annex.includes("GDPR Art. 28(3)(a)"));
  assert(annex.includes("GDPR Art. 28(3)(h)"));
  assert(annex.includes("GDPR Art. 28(3) — second subparagraph"));
  assert(annex.includes("Absent"), "absent clauses render honestly");
  // The annex never rewrites the contract text.
  assert(!annex.includes("SIGNED for and on behalf"));
});

Deno.test("DPA-ANNEX — no provision excerpt ⇒ no annex, no invented statutory text", () => {
  const cov = checkArt28Coverage(FULL_CONTRACT, {
    key: "gdpr-art-28", status: "pending", citation: "GDPR Art. 28", excerpt: null,
  });
  assertEquals(cov.clauses.length, 0);
  assertEquals(renderArt28CoverageAnnex(cov), "");
});

Deno.test("DPA-ANNEX — section splitter yields numbered sections for locations", () => {
  const sections = splitDpaSections(FULL_CONTRACT);
  assert(sections.some((s) => s.heading.startsWith("Section 2 —")));
  assert(sections.some((s) => /AUDITS/i.test(s.heading)));
});
