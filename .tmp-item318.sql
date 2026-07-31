-- ITEM 318 — UK GDPR Art. 22 series and Chapter V (Arts. 44-49A) verbatim ingestion

-- Source: https://www.legislation.gov.uk/eur/2016/679 (King's Printer of Acts of Parliament),

-- consolidated UK GDPR text, revision valid 2026-06-19, last modified 2026-06-22. Retrieved 2026-07-31.

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '22', 'Automated individual decision-making, including profiling', 'CHAPTER III', '[Ch. 3 Section 4A substituted for Art. 22 (19.6.2025 for specified purposes, 5.2.2026 in so far as not already in force) by Data (Use and Access) Act 2025 (c. 18), ss. 80(1), 142(1)(2)(h); S.I. 2026/82, reg. 2(j) (with reg. 5).]
No Article 22 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'https://www.legislation.gov.uk/eur/2016/679/article/22', 'cc6d5620999ecc53a05d48d22590a750ad093c734637632d73bd457419a0daea')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '22A', 'Automated processing and significant decisions', 'CHAPTER III', '1. For the purposes of Articles 22B and 22C—
  (a) a decision is based solely on automated processing if there is no meaningful human involvement in the taking of the decision, and
  (b) a decision is a significant decision, in relation to a data subject, if—
    (i) it produces a legal effect for the data subject, or
    (ii) it has a similarly significant effect for the data subject.
2. When considering whether there is meaningful human involvement in the taking of a decision, a person must consider, among other things, the extent to which the decision is reached by means of profiling.', 'https://www.legislation.gov.uk/eur/2016/679/article/22A', 'e0ef8cecfd828ddef52ce66f7967d766c1c91bc5753463a08eda8a396cdb20e6')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '22B', 'Restrictions on automated decision-making', 'CHAPTER III', '1. A significant decision based entirely or partly on processing described in Article 9(1) (processing of special categories of personal data) may not be taken based solely on automated processing, unless one of the following conditions is met.
2. The first condition is that the decision is based entirely on processing of personal data to which the data subject has given explicit consent.
3. The second condition is that—
  (a) the decision is—
    (i) necessary for entering into, or performing, a contract between the data subject and a controller, or
    (ii) required or authorised by law, and
  (b) point (g) of Article 9(2) applies.
4. A significant decision may not be taken based solely on automated processing if the processing of personal data carried out by, or on behalf of, the decision-maker for the purposes of the decision is carried out entirely or partly in reliance on Article 6(1)(ea).', 'https://www.legislation.gov.uk/eur/2016/679/article/22B', '6fd30acc47c5cc43f9aa41a3486278fe0ad206e7c42bc18d2fe1d55c60b73cbf')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '22C', 'Safeguards for automated decision-making', 'CHAPTER III', '1. Where a significant decision taken by or on behalf of a controller in relation to a data subject is—
  (a) based entirely or partly on personal data, and
  (b) based solely on automated processing,
2. The safeguards must consist of or include measures which—
  (a) provide the data subject with information about decisions described in paragraph 1 taken in relation to the data subject;
  (b) enable the data subject to make representations about such decisions;
  (c) enable the data subject to obtain human intervention on the part of the controller in relation to such decisions;
  (d) enable the data subject to contest such decisions.', 'https://www.legislation.gov.uk/eur/2016/679/article/22C', 'c95471edfb7749770b754a0a6160d388621c1ae02cd740659f7f0827db610620')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '22D', 'Further provision about automated decision-making', 'CHAPTER III', '1. The Secretary of State may by regulations provide that, for the purposes of Article 22A(1)(a), there is, or is not, to be taken to be meaningful human involvement in the taking of a decision in cases described in the regulations.
2. The Secretary of State may by regulations provide that, for the purposes of Article 22A(1)(b)(ii), a description of decision is, or is not, to be taken to have a similarly significant effect for the data subject.
3. The Secretary of State may by regulations make the following types of provision about the safeguards required under Article 22C(1)—
  (a) provision requiring the safeguards to include measures in addition to those described in Article 22C(2),
  (b) provision imposing requirements which supplement what Article 22C(2) requires the safeguards to consist of or include (including, for example, provision about how and when things described in Article 22C(2) must be done or be capable of being done), and
  (c) provision about measures which are not to be taken to satisfy one or more of points (a) to (d) of Article 22C(2).
4. Regulations under paragraph 3 may not amend Article 22C.
5. Regulations under this Article are subject to the affirmative resolution procedure.', 'https://www.legislation.gov.uk/eur/2016/679/article/22D', '0ab3b9eb5801ac21684c6c0e7695fd06a2955c1350337eb366d6f887ef5a436c')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '44', 'General principle for transfers', 'CHAPTER V', '[Art. 44 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025 (c. 18), s. 142(1), Sch. 7 para. 2(1); S.I. 2026/82, reg. 2(z9).]
No Article 44 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'https://www.legislation.gov.uk/eur/2016/679/article/44', '57d553e2a765bb69f25ab41c33506f8afed73f5c92a07ad7c325289134e63078')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '44A', 'General principles for transfers', 'CHAPTER V', '1. A controller or processor may transfer personal data to a third country or an international organisation only if—
  (a) the condition in paragraph 2 is met, and
  (b) the transfer is carried out in compliance with the other provisions of this Regulation.
2. The condition is met if the transfer—
  (a) is approved by regulations under Article 45A that are in force at the time of the transfer,
  (b) is made subject to appropriate safeguards (see Article 46), or
  (c) is made in reliance on a derogation for specific situations (see Article 49).
3. A transfer may not be made in reliance on paragraph 2(b) or (c) if, or to the extent that, it would breach a restriction in regulations under Article 49A.', 'https://www.legislation.gov.uk/eur/2016/679/article/44A', 'e1bdafdabbcc27563bbc7afa9715801c498d20f8ea4df386c1be9652ecdc03e0')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '45', 'Transfers on the basis of an adequacy decision', 'CHAPTER V', '[Art. 45 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025 (c. 18), s. 142(1), Sch. 7 para. 3; S.I. 2026/82, reg. 2(z9).]
No Article 45 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'https://www.legislation.gov.uk/eur/2016/679/article/45', '592fdaa4e64033c114a3f9b2ee544ad9bea7a9102195dfd6b8ce321b28f570dc')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '45A', 'Transfers approved by regulations', 'CHAPTER V', '1. For the purposes of Article 44A, the Secretary of State may by regulations approve transfers of personal data to—
  (a) a third country, or
  (b) an international organisation.
2. The Secretary of State may only make regulations under this Article approving transfers to a third country or international organisation if the Secretary of State considers that the data protection test is met in relation to the transfers (see Article 45B).
3. In making regulations under this Article, the Secretary of State may have regard to any matter which the Secretary of State considers relevant, including the desirability of facilitating transfers of personal data to and from the United Kingdom.
4. Regulations under this Article may, among other things—
  (a) make provision in relation to a third country or international organisation specified in the regulations or a description of country or organisation;
  (b) approve all transfers of personal data to a third country or international organisation or only transfers specified or described in the regulations;
  (c) identify a transfer of personal data by any means, including by reference to—
    (i) a sector or geographic area within a third country,
    (ii) the controller or processor,
    (iii) the recipient of the personal data,
    (iv) the personal data transferred,
    (v) the means by which the transfer is made, or
    (vi) relevant legislation, schemes, lists or other arrangements or documents, as they have effect from time to time;
  (d) confer a discretion on a person.
5. Regulations under this Article are subject to the negative resolution procedure.', 'https://www.legislation.gov.uk/eur/2016/679/article/45A', 'b8b685ea7c1e1eab74b194c8a657919c5586bf1aa87874096c5c1d78d00cc200')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '45B', 'The data protection test', 'CHAPTER V', '1. For the purposes of Article 45A, the data protection test is met in relation to transfers of personal data to a third country or international organisation if the standard of the protection provided for data subjects with regard to general processing of personal data in the country or by the organisation is not materially lower than the standard of the protection provided for data subjects by or under—
  (a) this Regulation,
  (b) Part 2 of the 2018 Act, and
  (c) Parts 5 to 7 of that Act, so far as relevant to general processing.
2. In considering whether the data protection test is met in relation to transfers of personal data to a third country or international organisation, the Secretary of State must consider, among other things—
  (a) respect for the rule of law and for human rights in the country or by the organisation,
  (b) the existence, and powers, of an authority responsible for enforcing the protection of data subjects with regard to the processing of personal data in the country or by the organisation,
  (c) arrangements for judicial or non-judicial redress for data subjects in connection with such processing,
  (d) rules about the transfer of personal data from the country or by the organisation to other countries or international organisations,
  (e) relevant international obligations of the country or organisation, and
  (f) the constitution, traditions and culture of the country or organisation.
3. In paragraphs 1 and 2—
  (a) the references to the protection provided for data subjects are to that protection taken as a whole,
  (b) the references to general processing are to processing to which this Regulation applies or equivalent types of processing in the third country or by the international organisation (as appropriate), and
  (c) the references to processing of personal data in the third country or by the international organisation are references only to the processing of personal data transferred to the country or organisation by means of processing to which this Regulation applies as described in Article 3.
4. When the data protection test is applied only to certain transfers to a third country or international organisation that are specified or described, or to be specified or described, in regulations (in accordance with Article 45A(4)(b))—
  (a) the references in paragraphs 1 to 3 to personal data are to be read as references only to personal data likely to be the subject of such transfers, and
  (b) the reference in paragraph 2(d) to transfer to other countries or international organisations is to be read as including transfer within the third country or international organisation.', 'https://www.legislation.gov.uk/eur/2016/679/article/45B', '128e87027da51d4d1b25131303e071c4739beefa015ee8d936b5c7fde1477922')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '45C', 'Transfers approved by regulations: monitoring', 'CHAPTER V', '1. The Secretary of State must, on an ongoing basis, monitor developments in third countries and international organisations that could affect decisions to make regulations under Article 45A or to amend or revoke such regulations.
2. Where the Secretary of State becomes aware that the data protection test is no longer met in relation to transfers approved, or of a description approved, in regulations under Article 45A, the Secretary of State must, to the extent necessary, amend or revoke the regulations.
3. Where regulations under Article 45A are amended or revoked in accordance with paragraph 2, the Secretary of State must enter into consultations with the third country or international organisation concerned with a view to improving the protection provided to data subjects with regard to the processing of personal data in the country or by the organisation.
4. The Secretary of State must publish—
  (a) a list of the third countries and international organisations, and the descriptions of such countries and organisations, which are for the time being approved by regulations under Article 45A as places or persons to which personal data may be transferred, and
  (b) a list of the third countries and international organisations, and the descriptions of such countries and organisations, which have been but are no longer approved by such regulations.
5. In the case of regulations under Article 45A which approve only certain transfers to a third country or international organisation specified or described in the regulations (in accordance with Article 45A(4)(b)), the lists published under paragraph 4 must specify or describe the relevant transfers.', 'https://www.legislation.gov.uk/eur/2016/679/article/45C', 'af95d37460a7cb224af082684b46912b2d534f99f03de02c67b310cdf530761d')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '47A', 'Transfers subject to appropriate safeguards: further provision', 'CHAPTER V', '1. The Secretary of State may by regulations specify standard data protection clauses which the Secretary of State considers are capable of securing that the data protection test set out in Article 46 is met in relation to transfers of personal data generally or in relation to a type of transfer specified in the regulations.
2. The Secretary of State must keep under review the standard data protection clauses specified in regulations under paragraph 1 that are for the time being in force.
3. Regulations under paragraph 1 are subject to the negative resolution procedure.
4. The Secretary of State may by regulations make provision about further safeguards that may be relied on for the purposes of Article 46(1A)(a).
5. The Secretary of State may only make regulations under paragraph 4 if the Secretary of State considers that the further safeguards are capable of securing that the data protection test set out in Article 46 is met in relation to transfers of personal data generally or in relation to a type of transfer specified in the regulations.
6. Regulations under paragraph 4 may, among other things—
  (a) make provision by adopting safeguards prepared or published by another person;
  (b) make provision about ways of providing safeguards which require authorisation from the Commissioner.
7. Regulations under paragraph 4 which amend Article 46 may do so only in the following ways—
  (a) by adding ways of providing safeguards, or
  (b) by varying or omitting ways of providing safeguards which were added by regulations under this Article.
8. Regulations under paragraph 4 are subject to the affirmative resolution procedure.', 'https://www.legislation.gov.uk/eur/2016/679/article/47A', '129b64674fa43083616aaa502516b2261ea6de50f2757effae3d93be7f1bdba1')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '48', 'Transfers or disclosures not authorised by Union law', 'CHAPTER V', '[Art. 48 omitted (31.12.2020) by virtue of The Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019 (S.I. 2019/419), reg. 1(2), Sch. 1 para. 41 (with reg. 5, Sch. 1 para. 80); 2020 c. 1, Sch. 5 para. 1(1).]
No Article 48 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'https://www.legislation.gov.uk/eur/2016/679/article/48', 'a2d0f839037e598a8e2787c6874f0c542cda8e41ef652a49058fbd5129c14255')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.gdpr_articles (jurisdiction, article_number, article_title, chapter, body_text, source_url, content_hash)
VALUES ('uk', '49A', 'Restriction in the public interest', 'CHAPTER V', '1. The Secretary of State may by regulations restrict the transfer of a category of personal data to a third country or international organisation where—
  (a) the transfer is not approved by regulations under Article 45A for the time being in force, and
  (b) the Secretary of State considers the restriction to be necessary for important reasons of public interest.
2. Regulations under this Article—
  (a) are subject to the made affirmative resolution procedure where the Secretary of State has made an urgency statement in respect of them;
  (b) otherwise, are subject to the affirmative resolution procedure.
3. For the purposes of this Article, an urgency statement is a reasoned statement that the Secretary of State considers it desirable for the regulations to come into force without delay.', 'https://www.legislation.gov.uk/eur/2016/679/article/49A', 'ecb9dadc6dbbe4566694d1040a79652ee5c432d8a33f3b786d3d1393e30e8e7c')
ON CONFLICT (jurisdiction, article_number) DO UPDATE SET article_title=EXCLUDED.article_title, chapter=EXCLUDED.chapter, body_text=EXCLUDED.body_text, source_url=EXCLUDED.source_url, content_hash=EXCLUDED.content_hash, updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-22', 'UK GDPR Art. 22 — Automated individual decision-making, including profiling; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/22, revision valid 2026-06-19', '[Ch. 3 Section 4A substituted for Art. 22 (19.6.2025 for specified purposes, 5.2.2026 in so far as not already in force) by Data (Use and Access) Act 2025 (c. 18), ss. 80(1), 142(1)(2)(h); S.I. 2026/82, reg. 2(j) (with reg. 5).]
No Article 22 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-22a', 'UK GDPR Art. 22A — Automated processing and significant decisions; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/22A, revision valid 2026-06-19', '1. For the purposes of Articles 22B and 22C—
  (a) a decision is based solely on automated processing if there is no meaningful human involvement in the taking of the decision, and
  (b) a decision is a significant decision, in relation to a data subject, if—
    (i) it produces a legal effect for the data subject, or
    (ii) it has a similarly significant effect for the data subject.
2. When considering whether there is meaningful human involvement in the taking of a decision, a person must consider, among other things, the extent to which the decision is reached by means of profiling.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-22b', 'UK GDPR Art. 22B — Restrictions on automated decision-making; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/22B, revision valid 2026-06-19', '1. A significant decision based entirely or partly on processing described in Article 9(1) (processing of special categories of personal data) may not be taken based solely on automated processing, unless one of the following conditions is met.
2. The first condition is that the decision is based entirely on processing of personal data to which the data subject has given explicit consent.
3. The second condition is that—
  (a) the decision is—
    (i) necessary for entering into, or performing, a contract between the data subject and a controller, or
    (ii) required or authorised by law, and
  (b) point (g) of Article 9(2) applies.
4. A significant decision may not be taken based solely on automated processing if the processing of personal data carried out by, or on behalf of, the decision-maker for the purposes of the decision is carried out entirely or partly in reliance on Article 6(1)(ea).', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-22c', 'UK GDPR Art. 22C — Safeguards for automated decision-making; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/22C, revision valid 2026-06-19', '1. Where a significant decision taken by or on behalf of a controller in relation to a data subject is—
  (a) based entirely or partly on personal data, and
  (b) based solely on automated processing,
2. The safeguards must consist of or include measures which—
  (a) provide the data subject with information about decisions described in paragraph 1 taken in relation to the data subject;
  (b) enable the data subject to make representations about such decisions;
  (c) enable the data subject to obtain human intervention on the part of the controller in relation to such decisions;
  (d) enable the data subject to contest such decisions.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-22d', 'UK GDPR Art. 22D — Further provision about automated decision-making; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/22D, revision valid 2026-06-19', '1. The Secretary of State may by regulations provide that, for the purposes of Article 22A(1)(a), there is, or is not, to be taken to be meaningful human involvement in the taking of a decision in cases described in the regulations.
2. The Secretary of State may by regulations provide that, for the purposes of Article 22A(1)(b)(ii), a description of decision is, or is not, to be taken to have a similarly significant effect for the data subject.
3. The Secretary of State may by regulations make the following types of provision about the safeguards required under Article 22C(1)—
  (a) provision requiring the safeguards to include measures in addition to those described in Article 22C(2),
  (b) provision imposing requirements which supplement what Article 22C(2) requires the safeguards to consist of or include (including, for example, provision about how and when things described in Article 22C(2) must be done or be capable of being done), and
  (c) provision about measures which are not to be taken to satisfy one or more of points (a) to (d) of Article 22C(2).
4. Regulations under paragraph 3 may not amend Article 22C.
5. Regulations under this Article are subject to the affirmative resolution procedure.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-44', 'UK GDPR Art. 44 — General principle for transfers; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/44, revision valid 2026-06-19', '[Art. 44 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025 (c. 18), s. 142(1), Sch. 7 para. 2(1); S.I. 2026/82, reg. 2(z9).]
No Article 44 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-44a', 'UK GDPR Art. 44A — General principles for transfers; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/44A, revision valid 2026-06-19', '1. A controller or processor may transfer personal data to a third country or an international organisation only if—
  (a) the condition in paragraph 2 is met, and
  (b) the transfer is carried out in compliance with the other provisions of this Regulation.
2. The condition is met if the transfer—
  (a) is approved by regulations under Article 45A that are in force at the time of the transfer,
  (b) is made subject to appropriate safeguards (see Article 46), or
  (c) is made in reliance on a derogation for specific situations (see Article 49).
3. A transfer may not be made in reliance on paragraph 2(b) or (c) if, or to the extent that, it would breach a restriction in regulations under Article 49A.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-45', 'UK GDPR Art. 45 — Transfers on the basis of an adequacy decision; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/45, revision valid 2026-06-19', '[Art. 45 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025 (c. 18), s. 142(1), Sch. 7 para. 3; S.I. 2026/82, reg. 2(z9).]
No Article 45 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-45a', 'UK GDPR Art. 45A — Transfers approved by regulations; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/45A, revision valid 2026-06-19', '1. For the purposes of Article 44A, the Secretary of State may by regulations approve transfers of personal data to—
  (a) a third country, or
  (b) an international organisation.
2. The Secretary of State may only make regulations under this Article approving transfers to a third country or international organisation if the Secretary of State considers that the data protection test is met in relation to the transfers (see Article 45B).
3. In making regulations under this Article, the Secretary of State may have regard to any matter which the Secretary of State considers relevant, including the desirability of facilitating transfers of personal data to and from the United Kingdom.
4. Regulations under this Article may, among other things—
  (a) make provision in relation to a third country or international organisation specified in the regulations or a description of country or organisation;
  (b) approve all transfers of personal data to a third country or international organisation or only transfers specified or described in the regulations;
  (c) identify a transfer of personal data by any means, including by reference to—
    (i) a sector or geographic area within a third country,
    (ii) the controller or processor,
    (iii) the recipient of the personal data,
    (iv) the personal data transferred,
    (v) the means by which the transfer is made, or
    (vi) relevant legislation, schemes, lists or other arrangements or documents, as they have effect from time to time;
  (d) confer a discretion on a person.
5. Regulations under this Article are subject to the negative resolution procedure.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-45b', 'UK GDPR Art. 45B — The data protection test; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/45B, revision valid 2026-06-19', '1. For the purposes of Article 45A, the data protection test is met in relation to transfers of personal data to a third country or international organisation if the standard of the protection provided for data subjects with regard to general processing of personal data in the country or by the organisation is not materially lower than the standard of the protection provided for data subjects by or under—
  (a) this Regulation,
  (b) Part 2 of the 2018 Act, and
  (c) Parts 5 to 7 of that Act, so far as relevant to general processing.
2. In considering whether the data protection test is met in relation to transfers of personal data to a third country or international organisation, the Secretary of State must consider, among other things—
  (a) respect for the rule of law and for human rights in the country or by the organisation,
  (b) the existence, and powers, of an authority responsible for enforcing the protection of data subjects with regard to the processing of personal data in the country or by the organisation,
  (c) arrangements for judicial or non-judicial redress for data subjects in connection with such processing,
  (d) rules about the transfer of personal data from the country or by the organisation to other countries or international organisations,
  (e) relevant international obligations of the country or organisation, and
  (f) the constitution, traditions and culture of the country or organisation.
3. In paragraphs 1 and 2—
  (a) the references to the protection provided for data subjects are to that protection taken as a whole,
  (b) the references to general processing are to processing to which this Regulation applies or equivalent types of processing in the third country or by the international organisation (as appropriate), and
  (c) the references to processing of personal data in the third country or by the international organisation are references only to the processing of personal data transferred to the country or organisation by means of processing to which this Regulation applies as described in Article 3.
4. When the data protection test is applied only to certain transfers to a third country or international organisation that are specified or described, or to be specified or described, in regulations (in accordance with Article 45A(4)(b))—
  (a) the references in paragraphs 1 to 3 to personal data are to be read as references only to personal data likely to be the subject of such transfers, and
  (b) the reference in paragraph 2(d) to transfer to other countries or international organisations is to be read as including transfer within the third country or international organisation.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-45c', 'UK GDPR Art. 45C — Transfers approved by regulations: monitoring; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/45C, revision valid 2026-06-19', '1. The Secretary of State must, on an ongoing basis, monitor developments in third countries and international organisations that could affect decisions to make regulations under Article 45A or to amend or revoke such regulations.
2. Where the Secretary of State becomes aware that the data protection test is no longer met in relation to transfers approved, or of a description approved, in regulations under Article 45A, the Secretary of State must, to the extent necessary, amend or revoke the regulations.
3. Where regulations under Article 45A are amended or revoked in accordance with paragraph 2, the Secretary of State must enter into consultations with the third country or international organisation concerned with a view to improving the protection provided to data subjects with regard to the processing of personal data in the country or by the organisation.
4. The Secretary of State must publish—
  (a) a list of the third countries and international organisations, and the descriptions of such countries and organisations, which are for the time being approved by regulations under Article 45A as places or persons to which personal data may be transferred, and
  (b) a list of the third countries and international organisations, and the descriptions of such countries and organisations, which have been but are no longer approved by such regulations.
5. In the case of regulations under Article 45A which approve only certain transfers to a third country or international organisation specified or described in the regulations (in accordance with Article 45A(4)(b)), the lists published under paragraph 4 must specify or describe the relevant transfers.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-47a', 'UK GDPR Art. 47A — Transfers subject to appropriate safeguards: further provision; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/47A, revision valid 2026-06-19', '1. The Secretary of State may by regulations specify standard data protection clauses which the Secretary of State considers are capable of securing that the data protection test set out in Article 46 is met in relation to transfers of personal data generally or in relation to a type of transfer specified in the regulations.
2. The Secretary of State must keep under review the standard data protection clauses specified in regulations under paragraph 1 that are for the time being in force.
3. Regulations under paragraph 1 are subject to the negative resolution procedure.
4. The Secretary of State may by regulations make provision about further safeguards that may be relied on for the purposes of Article 46(1A)(a).
5. The Secretary of State may only make regulations under paragraph 4 if the Secretary of State considers that the further safeguards are capable of securing that the data protection test set out in Article 46 is met in relation to transfers of personal data generally or in relation to a type of transfer specified in the regulations.
6. Regulations under paragraph 4 may, among other things—
  (a) make provision by adopting safeguards prepared or published by another person;
  (b) make provision about ways of providing safeguards which require authorisation from the Commissioner.
7. Regulations under paragraph 4 which amend Article 46 may do so only in the following ways—
  (a) by adding ways of providing safeguards, or
  (b) by varying or omitting ways of providing safeguards which were added by regulations under this Article.
8. Regulations under paragraph 4 are subject to the affirmative resolution procedure.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-48', 'UK GDPR Art. 48 — Transfers or disclosures not authorised by Union law; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/48, revision valid 2026-06-19', '[Art. 48 omitted (31.12.2020) by virtue of The Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019 (S.I. 2019/419), reg. 1(2), Sch. 1 para. 41 (with reg. 5, Sch. 1 para. 80); 2020 c. 1, Sch. 5 para. 1(1).]
No Article 48 of the UK GDPR is in force. The provision is shown at legislation.gov.uk as ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .".', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-49a', 'UK GDPR Art. 49A — Restriction in the public interest; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/49A, revision valid 2026-06-19', '1. The Secretary of State may by regulations restrict the transfer of a category of personal data to a third country or international organisation where—
  (a) the transfer is not approved by regulations under Article 45A for the time being in force, and
  (b) the Secretary of State considers the restriction to be necessary for important reasons of public interest.
2. Regulations under this Article—
  (a) are subject to the made affirmative resolution procedure where the Secretary of State has made an urgency statement in respect of them;
  (b) otherwise, are subject to the affirmative resolution procedure.
3. For the purposes of this Article, an urgency statement is a reasoned statement that the Secretary of State considers it desirable for the regulations to come into force without delay.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-46', 'UK GDPR Art. 46 — Transfers subject to appropriate safeguards; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/46, revision valid 2026-06-19', '1. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
1A. A transfer of personal data to a third country or an international organisation by a controller or processor is made subject to appropriate safeguards only—
  (a) in a case in which—
    (i) safeguards are provided in connection with the transfer as described in paragraph 2 or 3 or regulations made under Article 47A(4), and
    (ii) the controller or processor, acting reasonably and proportionately, considers that the data protection test is met in relation to the transfer or that type of transfer (see paragraph 6), or
  (b) in a case in which—
    (i) safeguards are provided in accordance with paragraph 2(a) by an instrument that is intended to be relied on in connection with the transfer or that type of transfer, and
    (ii) each public body that is a party to the instrument, acting reasonably and proportionately, considers that the data protection test is met in relation to the transfers, or types of transfer, intended to be made in reliance on the instrument (see paragraph 6).
2. The ... safeguards referred to in paragraph 1A(a) may be provided for, without requiring any specific authorisation from the Commissioner, by:
  (a) a legally binding and enforceable instrument between a public body and another relevant person or persons;
  (b) binding corporate rules approved in accordance with Article 47;
  (c) standard data protection clauses specified in regulations made by the Secretary of State under Article 47A(1) and for the time being in force;
  (d) standard data protection clauses specified in a document issued (and not withdrawn) by the Commissioner for the purposes of this Article under section 119A of the 2018 Act and for the time being in force;
  (e) an approved code of conduct pursuant to Article 40 together with binding and enforceable commitments of the controller or processor in the third country to apply the safeguards provided by the code, including as regards data subjects'' rights; or
  (f) an approved certification mechanism pursuant to Article 42 together with binding and enforceable commitments of the controller or processor in the third country to apply the safeguards provided by the mechanism, including as regards data subjects'' rights.
3. With authorisation from the Commissioner, the ... safeguards referred to in paragraph 1A(a) may also be provided for ... by:
  (a) contractual clauses between the controller or processor and the controller, processor or the recipient of the personal data in the third country or international organisation; or
  (b) provisions to be inserted into administrative arrangements between a public body and another relevant person or persons which include enforceable and effective data subject rights.
4. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
5. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
6. For the purposes of this Article, the data protection test is met in relation to a transfer, or a type of transfer, of personal data if, after the transfer, the standard of the protection provided for the data subject with regard to that personal data by the safeguards required under paragraph 1A, and (where relevant) by other means, would not be materially lower than the standard of the protection provided for the data subject with regard to the personal data by or under—
  (a) this Regulation,
  (b) Part 2 of the 2018 Act, and
  (c) Parts 5 to 7 of that Act, so far as relevant to processing to which this Regulation applies.
7. For the purposes of paragraph 1A(a)(ii) and (b)(ii), what is reasonable and proportionate is to be determined by reference to all the circumstances, or likely circumstances, of the transfer or type of transfer, including the nature and volume of the personal data transferred.
8. In this Article—
  (a) references to the protection provided for the data subject are to that protection taken as a whole;
  (b) “relevant person” means a public body or another person exercising functions of a public nature.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-47', 'UK GDPR Art. 47 — Transfers subject to appropriate safeguards: Binding corporate rules; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/47, revision valid 2026-06-19', '1. The Commissioner shall approve binding corporate rules ... , provided that they:
  (a) are legally binding and apply to and are enforced by every member concerned of the group of undertakings, or group of enterprises engaged in a joint economic activity, including their employees;
  (b) expressly confer enforceable rights on data subjects with regard to the processing of their personal data; and
  (c) fulfil the requirements laid down in paragraph 2.
2. The binding corporate rules referred to in paragraph 1 shall specify at least:
  (a) the structure and contact details of the group of undertakings, or group of enterprises engaged in a joint economic activity and of each of its members;
  (b) the data transfers or set of transfers, including the categories of personal data, the type of processing and its purposes, the type of data subjects affected and the identification of the third country or countries in question;
  (c) their legally binding nature, both internally and externally;
  (d) the application of the general data protection principles, in particular purpose limitation, data minimisation, limited storage periods, data quality, data protection by design and by default, legal basis for processing, processing of special categories of personal data, measures to ensure data security, and the requirements in respect of onward transfers to bodies not bound by the binding corporate rules;
  (e) the rights of data subjects in regard to processing and the means to exercise those rights, including the right to protection in accordance with, and with regulations made under, Articles 22A to 22D in connection with decisions based solely on automated processing (including decisions reached by means of profiling), the right to make a complaint to the controller under section 164A of the 2018 Act, the right to make a complaint to the Commissioner under section 165 of the 2018 Act, the right to lodge a complaint before a court in accordance with Article 79 (see section 180 of the 2018 Act, and to obtain redress and, where appropriate, compensation for a breach of the binding corporate rules;
  (f) the acceptance by the controller or processor established in the United Kingdom of liability for any breaches of the binding corporate rules by any member concerned not established in the United Kingdom; the controller or the processor shall be exempt from that liability, in whole or in part, only if it proves that that member is not responsible for the event giving rise to the damage;
  (g) how the information on the binding corporate rules, in particular on the provisions referred to in points (d), (e) and (f) of this paragraph is provided to the data subjects in addition to Articles 13 and 14;
  (h) the tasks of any data protection officer designated in accordance with Article 37 or any other person or entity in charge of the monitoring compliance with the binding corporate rules within the group of undertakings, or group of enterprises engaged in a joint economic activity, as well as monitoring training and complaint-handling;
  (i) the complaint procedures;
  (j) the mechanisms within the group of undertakings, or group of enterprises engaged in a joint economic activity for ensuring the verification of compliance with the binding corporate rules. Such mechanisms shall include data protection audits and methods for ensuring corrective actions to protect the rights of the data subject. Results of such verification should be communicated to the person or entity referred to in point (h) and to the board of the controlling undertaking of a group of undertakings, or of the group of enterprises engaged in a joint economic activity, and should be available upon request to the Commissioner;
  (k) the mechanisms for reporting and recording changes to the rules and reporting those changes to the Commissioner;
  (l) the cooperation mechanism with the Commissioner to ensure compliance by any member of the group of undertakings, or group of enterprises engaged in a joint economic activity, in particular by making available to the Commissioner the results of verifications of the measures referred to in point (j);
  (m) the mechanisms for reporting to the Commissioner any legal requirements to which a member of the group of undertakings, or group of enterprises engaged in a joint economic activity is subject in a third country which are likely to have a substantial adverse effect on the guarantees provided by the binding corporate rules; and
  (n) the appropriate data protection training to personnel having permanent or regular access to personal data.
3. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();

INSERT INTO public.provision_texts (key, citation, verbatim_excerpt, jurisdiction, status, last_verified_at)
VALUES ('ukgdpr-art-49', 'UK GDPR Art. 49 — Derogations for specific situations; consolidated retained-EU-law text at legislation.gov.uk/eur/2016/679/article/49, revision valid 2026-06-19', '1. In the absence of approval by regulations under Article 45A and of compliance with Article 46 (appropriate safeguards), a transfer or a set of transfers of personal data to a third country or an international organisation shall take place only on one of the following conditions:
  (a) the data subject has explicitly consented to the proposed transfer, after having been informed of the possible risks of such transfers for the data subject due to the absence of approval by regulations under Article 45A and appropriate safeguards;
  (b) the transfer is necessary for the performance of a contract between the data subject and the controller or the implementation of pre-contractual measures taken at the data subject''s request;
  (c) the transfer is necessary for the conclusion or performance of a contract concluded in the interest of the data subject between the controller and another natural or legal person;
  (d) the transfer is necessary for important reasons of public interest;
  (e) the transfer is necessary for the establishment, exercise or defence of legal claims;
  (f) the transfer is necessary in order to protect the vital interests of the data subject or of other persons, where the data subject is physically or legally incapable of giving consent;
  (g) the transfer is made from a register which according to domestic law is intended to provide information to the public and which is open to consultation either by the public in general or by any person who can demonstrate a legitimate interest, but only to the extent that the conditions laid down by domestic law for consultation are fulfilled in the particular case.
2. A transfer pursuant to point (g) of the first subparagraph of paragraph 1 shall not involve the entirety of the personal data or entire categories of the personal data contained in the register. Where the register is intended for consultation by persons having a legitimate interest, the transfer shall be made only at the request of those persons or if they are to be the recipients.
3. Points (a), (b) and (c) of the first subparagraph of paragraph 1 and the second subparagraph thereof shall not apply to activities carried out by public authorities in the exercise of their public powers.
4. The public interest referred to in point (d) of the first subparagraph of paragraph 1 must be public interest that is recognised in domestic law (whether in regulations under paragraph 4A or otherwise).
4A. The Secretary of State may by regulations specify for the purposes of point (d) of paragraph 1—
  (a) circumstances in which a transfer of personal data to a third country or international organisation is to be taken to be necessary for important reasons of public interest, and
  (b) circumstances in which a transfer of personal data to a third country or international organisation which is not required by an enactment is not to be taken to be necessary for important reasons of public interest.
5. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
5A. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
6. The controller or processor shall document the assessment as well as the suitable safeguards referred to in the second subparagraph of paragraph 1 of this Article in the records referred to in Article 30.
7. Regulations under this Article—
  (a) are subject to the made affirmative resolution procedure where the Secretary of State has made an urgency statement in respect of them;
  (b) otherwise, are subject to the affirmative resolution procedure.
8. For the purposes of this Article, an urgency statement is a reasoned statement that the Secretary of State considers it desirable for the regulations to come into force without delay.', 'UK', 'approved', now())
ON CONFLICT (key) DO UPDATE SET citation=EXCLUDED.citation, verbatim_excerpt=EXCLUDED.verbatim_excerpt, jurisdiction='UK', status='approved', last_verified_at=now(), updated_at=now();
