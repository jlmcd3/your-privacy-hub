## About this assessment

This CPPA risk assessment addresses Meridian SaaS Inc.'s Free-tier account analytics. On the record the company provided, the assessment finds a low residual risk profile, subject to one condition.

## The facts the company provided

- **Consumers:** 250,000 to under 1,000,000
- **Pi categories:** Contact identifiers (name, email, phone); Device identifiers (IP, cookies, device IDs)
- **Sources:** Directly from account signup and product telemetry
- **Vendors:** AWS (hosting); Stripe (billing); SendGrid (email)
- **Retention period:** 24 months rolling
- **Safeguards:** The analytics service account is scoped to the measurement views only, credentials rotate every 30 days, and exports are logged and reviewed weekly; The notice at collection is being amended to name IP-derived approximate location and the telemetry SDK default is being disabled

Meridian SaaS Inc. provided the facts set out below, and they are reproduced here without alteration. The company states that the activity assessed is Free-tier account analytics and that the purpose it serves is We analyse free-tier account and device identifiers to measure product usage.

- Consumers: 250,000 to under 1,000,000
- Pi categories: Contact identifiers (name, email, phone); Device identifiers (IP, cookies, device IDs)
- Sources: Directly from account signup and product telemetry
- Vendors: AWS (hosting); Stripe (billing); SendGrid (email)
- Retention period: 24 months rolling
- Safeguards: The analytics service account is scoped to the measurement views only, credentials rotate every 30 days, and exports are logged and reviewed weekly; The notice at collection is being amended to name IP-derived approximate location and the telemetry SDK default is being disabled

## Determination

11 CCR § 7154(a) directs that the identified benefits be weighed against the negative impacts as mitigated by the safeguards, and the processing not proceed where the risks to consumers' privacy outweigh those benefits. On that footing, and on the facts the company has given, this assessment records the processing as supportable only while the conditions set out below are met — it can describe the exposure the record supports, but it cannot treat the conditions below as optional, because the conclusion rests on them.

## Why this assessment is required

11 CCR § 7150(a) requires that a risk assessment be completed before the processing begins, whenever the processing presents significant risk to consumers' privacy. Here, Free-tier account analytics involves what the company describes as Deliver core SaaS analytics functionality to enterprise customers with role-based access controls in place, and that is what brings the activity within the provision. 11 CCR § 7156(a) further requires that a single assessment cover a set of comparable processing activities only where the activities present the same significant risk in the same way, and the company gives its position on secondary use of the same information as No — this data is used for this activity only.

## Risk analysis

11 CCR § 7152(a)(2) requires that the categories of personal information processed be identified, and the minimum personal information necessary to the stated purpose be identified with them, and that is the test each element of the collection set is read against. The company has identified Account email address and Device identifier (cookie ID) as Necessary to the stated purpose, and on that footing this assessment records those elements as necessary to the stated purpose. It describes Approximate location derived from IP address as Collected but not necessary to the stated purpose, and measured against the stated purpose this assessment records those elements as collected beyond what the stated purpose needs. Taken across those elements, the assessment identifies one element collected beyond what the stated purpose needs, and on that basis it records those elements as collected beyond what the stated purpose needs — it can describe the exposure the record supports, but it cannot treat the current collection set as the minimum the purpose requires.

11 CCR § 7152(a)(5) requires that the negative impacts to consumers' privacy be identified, together with the source of each impact and how the processing causes it. The company traces Unauthorized access, destruction, use, modification, or disclosure; loss of availability to The telemetry event store, which holds account email addresses joined to device identifiers, is readable by the analytics service account and describes the causal path as An over-broad analytics service-account credential could be reused outside the measurement pipeline and export the joined table. Assessed on those facts, the impact carries Unlikely likelihood and Moderate severity, and is inherently low under 11 CCR § 7152(a)(5)(A). The company traces Impairment of consumer control over personal information to The free-tier signup notice describes telemetry collection but does not name the derived approximate-location field and describes the causal path as A consumer reading the notice cannot tell that IP-derived location is retained, so the opt-out choice is made on an incomplete description. Assessed on those facts, the impact carries Possible likelihood and Minimal severity, and is inherently low under 11 CCR § 7152(a)(5)(C).

11 CCR § 7152(a)(6) requires that the safeguards relied on be identified and tied to the negative impacts they are intended to address, so that the impact remaining after each safeguard can be seen. Against Unauthorized access, destruction, use, modification, or disclosure; loss of availability the company describes The analytics service account is scoped to the measurement views only, credentials rotate every 30 days, and exports are logged and reviewed weekly as the measure in place, recorded as Implemented and tested, leaving a low residual. The company answers Impairment of consumer control over personal information with The notice at collection is being amended to name IP-derived approximate location and the telemetry SDK default is being disabled, which is recorded as Implemented and tested and leaves a low residual.

11 CCR § 7152(a)(4) requires that the benefits of the processing be identified for the business, the consumer, other stakeholders, and the public, in terms specific enough to be weighed, and 11 CCR § 7154(a) sets the exercise those benefits feed, namely that the identified benefits be weighed against the negative impacts as mitigated by the safeguards, and the processing not proceed where the risks to consumers' privacy outweigh those benefits. The company puts the benefit to the business as Free-tier usage measurement tells the engineering team which onboarding step free-tier accounts abandon, which is the input to the quarterly onboarding rework decision. It puts the benefit to the consumer as Consumers reach a working configuration faster because the abandoned onboarding steps identified by this measurement are the ones rewritten first. It puts the benefit to other stakeholders as Enterprise administrators who sponsor free-tier trials receive accurate seat-activation reporting instead of estimates when deciding whether to convert a trial. For the public, it states the benefit as No public benefit is claimed for this activity beyond the consumer benefit stated above. Weighed against the impacts remaining after the safeguards described above, this assessment carries the weighing through on the benefits the company states.

11 CCR § 7152(a)(7) requires that the decision whether to initiate the processing be recorded, and the reasons for it stated. The decision itself, and any judgment the company reserves to its counsel, remains with the company.

## Comparable regulator decisions

We did not discern any directly analogous regulator decisions in the verified corpus this assessment draws on that would be materially relevant to the analysis.

## General conclusions

Taken together, this assessment establishes the purpose the processing serves, two negative impacts with the causal path for each, the safeguards described against them and the residual that remains once they are applied, and the benefits offered on the other side of the weighing. No further information is required for the points this assessment reaches.

## Record completeness and residual risk

Complete record; low residual risk; one condition outstanding. This summary measures how complete the assessment record is and what risk remains after the safeguards the company describes. It is not a measure of legal compliance.

## What to do next

- **Condition on the decision:** Cease or justify collection of Approximate location derived from IP address, recorded as not necessary to the stated purpose (§ 7152(a)(2)).

The steps below follow from the determination above. The determination stands only while one condition is met, and that condition is set out below. The company should then have the completed assessment reviewed and approved by the person who will be named in it, and retain it with the dated record of that approval.

- Condition on the decision: Cease or justify collection of Approximate location derived from IP address, recorded as not necessary to the stated purpose (§ 7152(a)(2)).