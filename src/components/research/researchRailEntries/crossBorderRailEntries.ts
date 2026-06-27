// Section reference entries for /cross-border-transfers.
// Section ids must match those declared in CrossBorderTransfers.tsx.

import type { RailEntry } from "@/components/intake/StatuteRail";

const GDPR_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";
const SCC_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021D0914";
const DPF_URL = "https://www.dataprivacyframework.gov/";
const EDPB_TIA_URL = "https://www.edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en";

export const CROSS_BORDER_SECTION_RAIL: Record<string, RailEntry> = {
  "eu-mechanisms": {
    fieldLabel: "Chapter V transfer mechanisms",
    citation: "GDPR Arts. 44–49",
    citationUrl: GDPR_URL,
    plainSummary:
      "GDPR Chapter V prohibits any transfer of personal data to a third country unless one of the conditions in Articles 44–49 is met: an adequacy decision (Art. 45), appropriate safeguards (Art. 46 — SCCs, BCRs, codes of conduct, certifications), or a specific derogation (Art. 49). Article 44 is the gateway clause: every onward transfer must independently satisfy Chapter V.",
    regulationText:
      "Art. 44: Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers of personal data from the third country or an international organisation to another third country or to another international organisation. All provisions in this Chapter shall be applied in order to ensure that the level of protection of natural persons guaranteed by this Regulation is not undermined.",
  },

  adequacy: {
    fieldLabel: "Current adequacy decisions",
    citation: "GDPR Art. 45",
    citationUrl: GDPR_URL,
    plainSummary:
      "An adequacy decision is a Commission finding that a third country, territory, sector, or international organisation ensures an 'essentially equivalent' level of data protection. Transfers under adequacy require no transfer-specific instrument (though a controller–processor DPA under Art. 28 still applies). Active adequacy decisions cover ~15 jurisdictions, including the UK (under review), Japan, South Korea, Switzerland, Canada (commercial), and DPF-certified U.S. entities.",
    regulationText:
      "Art. 45(1): A transfer of personal data to a third country or an international organisation may take place where the Commission has decided that the third country, a territory or one or more specified sectors within that third country, or the international organisation in question ensures an adequate level of protection. Such a transfer shall not require any specific authorisation.",
    enforcementNote:
      "Adequacy decisions are reviewed at least every four years (Art. 45(3)). The UK adequacy decision (2021) is currently under post-DPDI Act review. The EU–US DPF (Jul 2023) faces an active Schrems III challenge before the CJEU.",
  },

  dpf: {
    fieldLabel: "EU-U.S. Data Privacy Framework",
    citation: "Commission Implementing Decision (EU) 2023/1795",
    citationUrl: DPF_URL,
    plainSummary:
      "The EU-U.S. DPF, adopted July 2023, allows transfers to U.S. organisations that self-certify to the Department of Commerce. It is underwritten by Executive Order 14086 (which imposes necessity and proportionality on U.S. signals intelligence) and a new Data Protection Review Court providing redress for EU data subjects. The UK-U.S. Data Bridge (Oct 2023) extends materially equivalent protections to UK transfers.",
    regulationText:
      "Commission Implementing Decision of 10 July 2023 pursuant to Regulation (EU) 2016/679 of the European Parliament and of the Council on the adequate level of protection of personal data under the EU-US Data Privacy Framework: the United States ensures an adequate level of protection — comparable to that of the European Union — for personal data transferred from the Union to organisations in the United States that are included in the 'Data Privacy Framework List'.",
    enforcementNote:
      "NOYB (Max Schrems) has publicly signalled it will challenge the DPF, mirroring its Privacy Shield (Schrems II) and Safe Harbour (Schrems I) challenges. Mature transfer programmes maintain 2021 SCCs as a fallback in case of invalidation.",
  },

  tia: {
    fieldLabel: "Transfer Impact Assessments",
    citation: "Schrems II (C-311/18); EDPB Recommendations 01/2020",
    citationUrl: EDPB_TIA_URL,
    plainSummary:
      "Schrems II requires controllers relying on Art. 46 transfer tools (SCCs, BCRs) to verify, on a case-by-case basis, whether the law and practice of the destination country undermines the protection promised by the instrument — and to implement supplementary measures (encryption, pseudonymisation, split processing, contractual additions) where necessary. The EDPB's six-step methodology in Recommendations 01/2020 is the authoritative framework.",
    regulationText:
      "SCCs Clause 14(a) (Commission Decision 2021/914): The Parties warrant that they have no reason to believe that the laws and practices in the third country of destination applicable to the processing of the personal data by the data importer, including any requirements to disclose personal data or measures authorising access by public authorities, prevent the data importer from fulfilling its obligations under these Clauses.",
    enforcementNote:
      "The Austrian DSB and CNIL Google Analytics decisions (2022) confirmed that transfers to U.S. recipients required supplementary measures beyond SCCs even before the DPF entered into force. Several EU DPAs have begun requiring documented TIAs as a precondition to closing investigations.",
  },

  derogations: {
    fieldLabel: "Article 49 derogations",
    citation: "GDPR Art. 49; EDPB Guidelines 2/2018",
    citationUrl: GDPR_URL,
    plainSummary:
      "Article 49 permits transfers in the absence of an adequacy decision or appropriate safeguards in narrow, exceptional circumstances: explicit consent, contract necessity, important reasons of public interest, legal claims, vital interests, or transfers from public registers. The EDPB reads Art. 49 derogations as last-resort, non-systematic, and occasional. The 'compelling legitimate interests' sub-derogation (Art. 49(1) final paragraph) further requires DPA notification and documented balancing.",
    regulationText:
      "Art. 49(1): In the absence of an adequacy decision pursuant to Article 45(3), or of appropriate safeguards pursuant to Article 46, including binding corporate rules, a transfer or a set of transfers of personal data to a third country or an international organisation shall take place only on one of the following conditions: (a) the data subject has explicitly consented to the proposed transfer, after having been informed of the possible risks of such transfers… (b) the transfer is necessary for the performance of a contract between the data subject and the controller…",
  },

  apac: {
    fieldLabel: "Asia-Pacific transfer frameworks",
    citation: "PIPL Arts. 38–43; APPI Art. 28; PIPA Arts. 28-8 et seq.",
    citationUrl: "https://personalinformation.protection.cac.gov.cn/",
    plainSummary:
      "APAC frameworks diverge sharply. China's PIPL (Arts. 38–43) imposes a tiered regime: CAC security assessment for high-volume or critical-infrastructure exporters, CAC-approved standard contracts for mid-volume, and certification as a third option. Japan APPI and South Korea PIPA rely on equivalent-protection models (and enjoy reciprocal EU adequacy). India's DPDP Act permits transfers except to a future government blacklist. Singapore PDPA uses a comparable-protection standard.",
    regulationText:
      "PIPL Art. 38: Where personal information handlers truly need to provide personal information outside the borders of the People's Republic of China for business or other such requirements, they shall satisfy one of the following conditions: (1) Passing a security assessment organized by the State cybersecurity and informatization department… (2) Undergoing personal information protection certification… (3) Concluding a contract with the foreign receiving side under a standard contract formulated by the State cybersecurity and informatization department…",
    enforcementNote:
      "CAC's 2024 thresholds significantly relaxed the security-assessment trigger (now ≥1M individuals or ≥10K sensitive PI subjects per year). The Didi RMB 8.026B fine (Jul 2022) remains the largest data-export-related enforcement action globally.",
  },

  enforcement: {
    fieldLabel: "Cross-border transfer enforcement",
    citation: "DPC Meta decision IN-21-9-1; Schrems II C-311/18",
    citationUrl: "https://www.dataprotection.ie/en/news-media/data-protection-commission-announces-conclusion-inquiry-meta-ireland",
    plainSummary:
      "Cross-border transfer enforcement has been concentrated in CJEU rulings (Schrems I/II) and a small number of headline DPA decisions. The DPC's €1.2B Meta fine (May 2023) — the largest GDPR fine to date — was specifically grounded in continued EU–U.S. transfers without an adequate Art. 46 mechanism. Austrian DSB and CNIL Google Analytics decisions established that transfers to U.S. cloud and analytics providers required supplementary measures beyond SCCs.",
    regulationText:
      "DPC Decision IN-21-9-1 (Meta Platforms Ireland, 12 May 2023): The Commission orders MPIL to bring its processing operations into compliance with Chapter V GDPR by ceasing the unlawful processing, including storage, in the U.S. of personal data of EEA users transferred in violation of the GDPR, within 6 months of the date of notification of the Commission's decision.",
    enforcementNote:
      "Aggregate cross-border-transfer fines exceeded €1.5B by end-2024. The 'effective implementation' of supplementary measures — not merely their inclusion in paper SCCs — is increasingly the focal point of DPA inquiry.",
  },
};
