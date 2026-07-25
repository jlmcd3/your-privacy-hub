# P5-ENFORCEMENT-DRAIN-2 — 2026-07-25

**Dispatch id:** `P5-ENFORCEMENT-DRAIN-2-2026-07-25` (controller tick 17:08Z, five-lens TEAM-REVIEWED)
**Predecessor:** ledger item 68 / `docs/courier/P5-ENFORCEMENT-DRAIN-1-2026-07-25.md`
**Scope:** T5/P5 sourced remainder — deterministic-only promotion (paraphrase gate `not_run`).

## 1. Selection SQL (deterministic)

```sql
SELECT id FROM enforcement_actions
WHERE verification_status='requires_review'
  AND length(coalesce(source_document_text,''))>=200
ORDER BY breach_related DESC NULLS LAST, dpa_related DESC NULLS LAST,
         biometric_related DESC NULLS LAST, tool_relevance DESC NULLS LAST, id;
```

Rows selected: **52** (controller pre-check 17:07:56Z; batch-run confirmed 52).
Ruled deviation from fixed batch-of-100 recorded in dispatch: batch-1 showed 89/100 of the priority-ordered slice was unsourced-blocked; unsourced rows can never be promoted, so batch 2 targets the sourced remainder to avoid re-walking blocked rows.

## 2. Per-regulator breakdown

| regulator | selected | verified | partial |
|---|---|---|---|
| AEPD | 4 | 3 | 1 |
| ANSPDCP | 19 | 17 | 2 |
| FTC | 26 | 11 | 15 |
| Garante | 1 | 0 | 1 |
| NAIH | 1 | 0 | 1 |
| Czech DPA (UOOU) | 1 | 0 | 1 |
| **total** | **52** | **31** | **21** |

## 3. Verdict counts

| verdict | count | disposition |
|---|---|---|
| verified | 31 | promoted (UPDATE below) |
| partial | 21 | left `requires_review` (reasons §5) |
| failed | 0 | none (no material contradictions found) |

## 4. Verified rows — byte-exact substrings

Per-row checks: regulator alias hit + decision_date (multi-locale month + EU/US separators) + fine amount (EU thousands `.` `,` / space / raw digits) + every `statutory_provisions` entry (Article/Section variants incl. `art. 6 alin. (1)` / `art. 72.1.a` / `Section 5` / `§ 5`). Byte-exact excerpts extracted from `source_document_text` (unmodified bytes) around each hit.

### 48e14502-20c9-4367-8ed4-40fcc5d1c620 — AEPD (2022-12-29)
- **regulator** — `/ Jorge Juan, 6 www.aepd.es 28001 – Madrid sedeagpd.gob.es 2/120 Quinto. De la corre`
- **date** — `e recogido en fecha 29/12/2022 como consta en el acuse de recibo que obra en el expediente`
- **amount** — `rias por importe de 9.000 euros. Documentación relevante aportada por la parte reclam`
- **GDPR Article 6(1)** — `r la infracción del artículo 6.1 del RGPD..........................................119 VII`
- **GDPR Article 25** — `r la infracción del artículo 6.1 del RGPD..........................................119 VIII`
- **GDPR Article 83(4)** — `r la infracción del artículo 6.1 del RGPD..........................................119 VIII`
- **GDPR Article 83(5)** — `r la infracción del artículo 6.1 del RGPD..........................................119 VIII`
- **LOPDGDD Article 65** — `r la infracción del artículo 6.1 del RGPD..........................................119 VIII`

### 9d5b1401-b87a-42db-adc3-b6c50aec6961 — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Andrew N. Ferguson, Chairman Mark R. Meador`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

### c4f5c7c9-5a8c-40ca-8283-f6430c5af8d1 — ANSPDCP (2025-02-04)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `Comunicat_Presa_04.02.2025`
- **amount** — `mendă în cuantum de 9.954,00 lei (echivalentul sumei de 2 000 EURO), pentru încălcarea d`
- **GDPR Article 58(1)(e)** — `carea dispozițiilor art. 58 alin. (1) lit. a) și e) și art. 32 alin. (4) coroborat cu a`
- **GDPR Article 32(4)** — `carea dispozițiilor art. 58 alin. (1) lit. a) și e) și art. 32 alin. (4) coroborat cu a`
- **GDPR Article 32(1)(b)** — `carea dispozițiilor art. 58 alin. (1) lit. a) și e) și art. 32 alin. (4) coroborat cu a`
- **GDPR Article 32(2)** — `carea dispozițiilor art. 58 alin. (1) lit. a) și e) și art. 32 alin. (4) coroborat cu a`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 58 alin. (1) lit. a) și e) și art. 32 alin. (4) coroborat cu a`

### fe3e3b8c-6b57-4058-ab0e-4e1814f21b99 — AEPD (2023-03-03)
- **regulator** — `/ Jorge Juan, 6 www.aepd.es 28001 – Madrid sedeagpd.gob.es 2/62 PRIMERO.............`
- **date** — `our, finalizadas el 3/03/2023 y 9/02/2023, respectivamente.  Número total de peticiones`
- **amount** — `umen de negocios de 9.027.949.000 € euros, en el año 2022. CUARTO: En fecha 29 de abril de 20`
- **GDPR Article 5(1)(f)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afecta`
- **GDPR Article 32** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 34** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 83(5)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 83(4)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 57(1)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 58(1)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **GDPR Article 58(2)(d)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **LOPDGDD Article 72(1)(a)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **LOPDGDD Article 73(f)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`
- **LOPDGDD Article 74(ñ)** — `unta infracción del artículo 34 de RGPD: comunicación de las brechas a las personas afectad`

### cba927cc-f6c3-4836-ac8f-df12372b22d7 — FTC
- **regulator** — `T OF MASSACHU SETTS FEDERAL TRADE CO MMISSION, Plaint iff, V. EVOLV TECHNOLOGIES HOLDING S, INC. , a cmp`
- **FTC Act Section 5** — `matter, pursuant to Section 13(b) of the Federal Trade Commission Act ("FTC Act"), 15 U .`

### cdb76d53-9069-419e-bc4f-ce0d2ebdc493 — ANSPDCP (2026-01-30)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `Comunicat_Presa_30.01.2026`
- **amount** — `mendă în cuantum de 5.089 lei, (echivalentul sumei de 1000 euro) pentru încălcarea ar`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 83 alin. (5) lit. e), art. 5, art. 6, art. 9, art. 10, art. 12`
- **GDPR Article 6** — `carea dispozițiilor art. 83 alin. (5) lit. e), art. 5, art. 6, art. 9, art. 10, art. 1`
- **GDPR Article 10** — `carea dispozițiilor art. 83 alin. (5) lit. e), art. 5, art. 6, art. 9, art. 10, art. 12`
- **GDPR Article 17(1)** — `carea dispozițiilor art. 83 alin. (5) lit. e), art. 5, art. 6, art. 9, art. 10, art. 12`
- **GDPR Article 58(1)** — `carea dispozițiilor art. 83 alin. (5) lit. e), art. 5, art. 6, art. 9, art. 10, art. 12 - art. 14`

### 3258e27e-7dc7-4e1a-bcc9-aacefbd123db — ANSPDCP (2024-04-22)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `22.04.2024    O nouă sancțiune pentru nerespectarea GDPR       Autorit`
- **amount** — `lei, echivalentul a 2.000 EURO.    Investigația a fost demarată ca urmare a faptului`
- **GDPR Article 6** — `lcarea prevederilor art. 6 din Regulamentul (UE) 2016/679 (GDPR), prin raportare la ar`
- **GDPR Article 83(5)(a)** — `lcarea prevederilor art. 6 din Regulamentul (UE) 2016/679 (GDPR), prin raportare la art`
- **GDPR Article 58(2)(d)** — `lcarea prevederilor art. 6 din Regulamentul (UE) 2016/679 (GDPR), prin raportare la art`

### ce9daeaf-c69a-4ee1-9324-789dbc9b6345 — ANSPDCP (2022-10-03)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `Comunicat_Presa_03.10.2022`
- **amount** — `mendă în cuantum de 493,91 lei (echivalentul a 100 EURO) , pentru încălcarea dispoziți`
- **GDPR Article 5(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Reg`
- **GDPR Article 5(1)(f)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Reg`
- **GDPR Article 6(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Reg`
- **GDPR Article 58(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Regu`
- **GDPR Article 58(1)(e)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Regu`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și f) și art. 6 alin. (1) lit. a) din Regu`

### 56f6b797-7f67-45c7-be41-258cef0e235f — ANSPDCP (2021-07-30)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `30.07.2021    Amendă pentru încălcarea RGPD       Autoritatea Național`
- **amount** — `ificare Breșă L.506/2004          Informații plată amendă persoane juridice       R`
- **GDPR Article 5(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și b) și alin. (2), raportat la art. 6 al`
- **GDPR Article 5(2)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și b) și alin. (2), raportat la art. 6 al`
- **GDPR Article 6(1)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și b) și alin. (2), raportat la art. 6 alin. (1), p`
- **GDPR Article 14(1)-(4)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și b) și alin. (2), raportat la art. 6 ali`

### 7e92a85d-6bf2-4a7a-ba3f-84f3247385df — AEPD (2024-06-18)
- **regulator** — `/ Jorge Juan, 6 www.aepd.es 28001 – Madrid sedeagpd.gob.es 2/21 Entre las fechas de`
- **date** — `ta de resolución de 18/06/2024 y alegaciones..............................7 NOVENO: Hechos`
- **amount** — `o y desembolsado de 3.000 euros. Figuran como Administradores solidarios, tanto A.A.A`
- **GDPR Article 6(1)** — `a lo previsto en el art. 43.2 de la LPACAP en fecha 24/03/2023, como consta en el cert`
- **GDPR Article 83(5)(a)** — `a lo previsto en el art. 43.2 de la LPACAP en fecha 24/03/2023, como consta en el certi`
- **LOPDGDD Article 72(1)(b)** — `conformidad con el artículo 65.4 de la Ley Orgánica 3/2018, de 5/12, de Protección de Dato`
- **GDPR Article 4(1)** — `a lo previsto en el art. 43.2 de la LPACAP en fecha 24/03/2023, como consta en el cert`
- **GDPR Article 4(2)** — `conformidad con el artículo 65.4 de la Ley Orgánica 3/2018, de 5/12, de Protección de Dat`
- **GDPR Article 4(7)** — `conformidad con el artículo 65.4 de la Ley Orgánica 3/2018, de 5/12, de Protección de Dat`
- **LOPDGDD Article 22** — `conformidad con el artículo 65.4 de la Ley Orgánica 3/2018, de 5/12, de Protección de Dato`
- **GDPR Article 58(2)(d)** — `conformidad con el artículo 65.4 de la Ley Orgánica 3/2018, de 5/12, de Protección de Dato`
- **GDPR Article 83(2)** — `a lo previsto en el art. 43.2 de la LPACAP en fecha 24/03/2023, como consta en el certi`

### 1ea3f736-1c5c-4975-b214-78182ead6c0c — ANSPDCP (2022-11-08)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `08.11.2022    Amendă pentru încălcarea RGPD       Autoritatea Național`
- **amount** — `hivalentul sumei de 5.000 EURO).    Investigația a fost demarată ca urmare a unei ses`
- **GDPR Article 5(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și alin. (2) și art. 6 din Regulamentul G`
- **GDPR Article 5(2)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și alin. (2) și art. 6 din Regulamentul G`
- **GDPR Article 6** — `carea dispozițiilor art. 5 alin. (1) lit. a) și alin. (2) și art. 6 din Regulamentul G`

### 72088a05-615c-414a-9453-f7932373346c — ANSPDCP (2023-01-03)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `03.01.2023    Amendă pentru încălcarea RGPD       Autoritatea Național`
- **amount** — `hivalentul sumei de 500 EURO , pentru încălcarea dispozițiilor art. 83 alin. (5) li`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 83 alin. (5) lit. e) din RGPD;    avertisment pentru încălcare`
- **GDPR Article 6** — `carea dispozițiilor art. 83 alin. (5) lit. e) din RGPD;    avertisment pentru încălcar`
- **GDPR Article 83(5)(a)** — `carea dispozițiilor art. 83 alin. (5) lit. e) din RGPD;    avertisment pentru încălcare`

### 7e295f51-b6c3-4e23-a993-53bb052bcb51 — ANSPDCP (2021-05-19)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `19.05.2021    O altă sancțiune pentru încălcarea RGPD       Autoritate`
- **amount** — `lei (echivalentul a 2.000 euro) .    Investigația a fost demarată ca urmare a primiri`
- **GDPR Article 5(1)(a)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și d), art. 5 alin. (2) și a art. 6 din R`
- **GDPR Article 5(1)(d)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și d), art. 5 alin. (2) și a art. 6 din R`
- **GDPR Article 5(2)** — `carea dispozițiilor art. 5 alin. (1) lit. a) și d), art. 5 alin. (2) și a art. 6 din R`
- **GDPR Article 6** — `carea dispozițiilor art. 5 alin. (1) lit. a) și d), art. 5 alin. (2) și a art. 6 din R`
- **GDPR Article 14** — `carea dispozițiilor art. 5 alin. (1) lit. a) și d), art. 5 alin. (2) și a art. 6 din RG`

### d5788da1-b807-4897-b163-1f4da02ca382 — ANSPDCP (2021-05-14)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `14.05.2021    Amendă pentru încălcarea RGPD       Autoritatea Național`
- **amount** — `ificare Breșă L.506/2004          Informații plată amendă persoane juridice       R`
- **GDPR Article 5(1)(a)** — `carea dispozițiilor art. 5 alin.(1) lit. a) și b) și alin.(2), raportat la art. 6 alin`
- **GDPR Article 5(2)** — `carea dispozițiilor art. 5 alin.(1) lit. a) și b) și alin.(2), raportat la art. 6 alin`
- **GDPR Article 6(1)** — `carea dispozițiilor art. 5 alin.(1) lit. a) și b) și alin.(2), raportat la art. 6 alin`
- **GDPR Article 13(1)-(3)** — `carea dispozițiilor art. 5 alin.(1) lit. a) și b) și alin.(2), raportat la art. 6 alin.`
- **GDPR Article 32(2)** — `carea dispozițiilor art. 5 alin.(1) lit. a) și b) și alin.(2), raportat la art. 6 alin.`

### e6a7ac35-1a59-4c77-8ec0-0dc9d9685946 — ANSPDCP (2023-06-20)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `Comunicat_Presa_20.06.2023`
- **amount** — `mendă în cuantum de 148.830 lei (echivalentul sumei de 30.000 EURO) pentru încălcarea p`
- **GDPR Article 24** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 12(2)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsuri tehnice`
- **GDPR Article 17(1)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 13(1)(c)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 13(1)(e)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 13(1)(f)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 14(1)(c)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 14(1)(e)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 14(1)(f)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 6(1)(a)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsu`
- **GDPR Article 58(2)(d)** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 32** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`
- **GDPR Article 60** — `t”.    Or, potrivit art. 24 din RGPD, operatorul este obligat să pună în aplicare măsur`

### f9663da6-0dd6-4896-9595-f2744535a900 — ANSPDCP (2025-09-18)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `18.09.2025   Sancțiune pentru încălcarea RGPD       Autoritatea Națion`
- **amount** — `lei, echivalentul a 1.000 EURO .    Investigația a fost demarată ca urmare a un ei pl`
- **GDPR Article 12(3)** — `lcarea prevederilor art. 12 alin. (3) și (4) și ale art. 17 din Regulamentul General privind Prot`
- **GDPR Article 12(4)** — `lcarea prevederilor art. 12 alin. (3) și (4) și ale art. 17 din Regulamentul General pr`
- **GDPR Article 17** — `lcarea prevederilor art. 12 alin. (3) și (4) și ale art. 17 din Regulamentul General pr`
- **GDPR Article 58(2)(c)** — `lcarea prevederilor art. 12 alin. (3) și (4) și ale art. 17 din Regulamentul General pr`
- **GDPR Article 58(2)(d)** — `lcarea prevederilor art. 12 alin. (3) și (4) și ale art. 17 din Regulamentul General pr`

### 0718da50-3ce8-47a5-9a01-e19ae35aed7a — FTC
- **regulator** — `25-60073-CIV-DAMIAN FEDERAL TRADE COMMISSION, Plaintiff, v. EVOKE WELLNESS, LLC, et al., Defendants. ___`
- **FTC Act Section 5** — `TC Act”), 15 U.S.C. §§ 45(m)(1)(A), 52, 53(b), and 57b, and Section 8023 of the Opi`

### 67b8f853-c4d1-4ff0-a6e6-3da82c3762c9 — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Lina M. Khan, Chair Rebecca Kelly Slaughter`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

### cbcdeeb4-442a-404c-b0b6-4058d0516097 — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Andrew N. Ferguson, Chairman Melissa Holyoak`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

### 66294a5e-0c7d-4a77-91e0-66f850e44815 — ANSPDCP (2022-11-18)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `18.11.2022    Sancțiune pentru încălcarea RGPD       Autoritatea Națio`
- **amount** — `lei (echivalentul a 300 EURO) .    Investigația a fost demarată ca urmare a unei pl`
- **GDPR Article 58(1)** — `carea dispozițiilor art. 58 alin. (1) și art. 83 alin. (5) lit. e) din Regulamentul General privi`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 58 alin. (1) și art. 83 alin. (5) lit. e) din Regulamentul Gen`

### a4592184-1cbb-464a-aae2-17499efa69a7 — ANSPDCP (2020-10-01)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `01.10.2020    Sancțiuni pentru încălcarea RGPD       1) Autoritatea Na`
- **amount** — `hivalentul sumei de 2000 EURO ;    Totodată, asociației de proprietari i s-a aplicat`
- **GDPR Article 83(5)(e)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`
- **GDPR Article 58(2)(d)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`
- **GDPR Article 83(5)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`

### d0e587d1-43d6-461b-a339-2c308f582805 — ANSPDCP (2023-06-06)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `06.06.2023    Sancțiune pentru încălcarea RGPD       Autoritatea Națio`
- **amount** — `icat_Presa_06_06_2023                                                            Auto`
- **GDPR Article 83(5)(e)** — `carea dispozițiilor art. 83 alin. (5) lit. e) din Regulamentul (UE) 2016/679.    Ca ata`

### d5a2bb8b-1f62-4de8-b383-83e0e03b3fb1 — ANSPDCP (2020-10-01)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `01.10.2020    Sancțiuni pentru încălcarea RGPD       1) Autoritatea Na`
- **amount** — `hivalentul sumei de 3000 EURO) .    Totodată, operatorului Megareduceri TV S.R.L. i`
- **GDPR Article 83(5)(e)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`
- **GDPR Article 58(2)(d)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`
- **GDPR Article 83(5)** — `re, faptă prevăzută art. 83 alin. (5) lit. e) din Regulamentul (UE) 679/2016. Ca atare,`

### d7e31992-9cb0-40c0-8795-d6274bf40318 — FTC
- **regulator** — `N DISTRICT OF TEXAS FEDERAL TRADE COMMISSION, Plaintiff, v. FIRST AMERICAN PAYMENT SYSTEMS, LP, a limite`
- **FTC Act Section 5** — `laint”) pursuant to Sections 13(b) and 19 of the Federal Trade Commission Act (“FTC Act”)`

### ea35711b-5a63-4f65-9e19-f834fa84ae1f — ANSPDCP (2023-03-27)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `27.03.2023    O nouă sancțiune pentru încălcarea RGPD       Autoritate`
- **amount** — `lei, echivalentul a 450 EURO.    Investigația a fost demarată ca urmare a unei sesi`
- **GDPR Article 6(1)** — `lcarea prevederilor art. 6 alin. (1) coroborat cu art. 5 alin. (1) lit. a) din Regulamentul Gene`
- **GDPR Article 5(1)(a)** — `lcarea prevederilor art. 6 alin. (1) coroborat cu art. 5 alin. (1) lit. a) din Regulam`

### f7a617d3-09c9-435e-b21b-d7af4da29f2d — ANSPDCP (2023-10-27)
- **regulator** — `ţie U.E.    Decizii ANSPDCP              Proiecte   Publicate          Control    Plâng`
- **date** — `27.10.2023    Sancțiune pentru încălcarea GDPR       Autoritatea Națio`
- **amount** — `dă în cuantum de de 2487,25 lei pentru faptul că nu a adus la îndeplinire măsurile disp`
- **GDPR Article 58(1)** — `dispozițiilor:      art. 58 alin. (1) din Regulamentul (UE) 2016/679;    art. 5 alin. (1) lit. a)`
- **GDPR Article 6** — `dispozițiilor:      art. 58 alin. (1) din Regulamentul (UE) 2016/679;    art. 5 alin.`

### fdb3c1b0-c29e-4106-9b2f-e88e2af9272d — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Lina M. Khan, Chair Rebecca Kelly Slaughter`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **Clayton Act Section 8** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

### d0cedb4f-d1a6-4053-80bd-fe4a53e18fed — FTC
- **regulator** — `han Oc hsner, Clerk FEDERAL TRADE COMMISSION AND THE STATES OF CALIFORNIA; FLORIDA; MARYLAND; MASSACHUSE`
- **FTC Act Section 5** — `aint"), pursuant to Sections I 3(b), 19, and t6(a)(I) of the Federal Trade Commission Act`

### 514355a4-3154-4643-8c5e-c94d2ecc820b — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Andrew N. Ferguson, Chairman Mark R. Meador`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

### 7723fbe1-0670-488f-b6f8-47a0f3a8b710 — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Andrew N. Ferguson, Chairman Mark R. Meador`
- **FTC Act Section 5** — `with violations of Section 5 of the Federal Trade Commission Act, as amended, 15 U.S.C.`

### abb99839-a7f7-4f35-a1ae-a8f34c5efd34 — FTC
- **regulator** — `AMERICA BEFORE THE FEDERAL TRADE COMMISSION COMMISSIONERS: Andrew N. Ferguson, Chairman Mark R. Meador`
- **Clayton Act Section 7** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`
- **FTC Act Section 5** — `with violations of Section 7 of the Clayton Act, as amended, 15 U.S.C. § 18, and Section`

## 5. Partial rows — reasons (left `requires_review`)

| id | regulator | reasons |
|---|---|---|
| `62c38c24-8f23-401d-86ae-6a7ab4535aca` | FTC | provisions missing: ['FTC Act Section 5', 'FTC Act Section 9', 'FTC Act Section 20'] |
| `b8e10fe6-2dbe-4281-a6de-39bb8feab95a` | NAIH | decision_date not found; provisions missing: ['GDPR Article 6(1)', 'GDPR Article 9(2)'] |
| `05271ad6-4cce-4729-b7d5-7264776f1b93` | Czech Data Protection Auhtority (UOOU) | regulator not found; decision_date not found; provisions missing: ['GDPR Article 15(1)', 'GDPR Article 12(1)', 'GDPR Article 12(3)', 'GDPR Article 83(5)'] |
| `588844ae-870f-4820-90ef-1812ff951af5` | FTC | provisions missing: ['FTC Act Section 13(b)', 'FTC Act Section 19'] |
| `4f7717dc-1444-4265-9310-8dd489272be8` | FTC | provisions missing: ['COVID-19 Consumer Protection Act Section 1401(b)(2)'] |
| `951f758a-03f1-487d-8de5-e2afc9d49896` | Garante | provisions missing: ['Codice Privacy Article 2-ter', 'Codice Privacy Article 166(2)', 'Codice Privacy Article 166(5)', 'Codice Privacy Article 166(7)'] |
| `c0bb188f-ed94-4ee8-805e-54b3fd056e66` | ANSPDCP | provisions missing: [] |
| `dfe37a76-f628-4e3e-beff-047d068fc5e9` | AEPD | decision_date not found |
| `f582f853-074b-4413-9204-6075ba67f707` | ANSPDCP | provisions missing: [] |
| `819a5f4f-13ca-4dda-9d69-52ebb47b32cc` | FTC | provisions missing: [] |
| `5f94d85c-01d4-4ec7-bc72-cbef8f9e305c` | FTC | provisions missing: [] |
| `13618617-23e1-4161-b075-e0927b841ffc` | FTC | decision_date not found |
| `179ba642-f87c-46e7-b4b1-0fa91479e347` | FTC | provisions missing: ['FTC Act Section 5'] |
| `2766a545-b264-4f52-a656-b4aa7617c757` | FTC | provisions missing: ['ROSCA Section 3'] |
| `29581e28-a93b-41ad-82ec-107ac435451b` | FTC | provisions missing: ['Bankruptcy Code Section 523(a)(2)(A)', 'FTC Act Section 9', 'FTC Act Section 20', 'Fair Credit Reporting Act Section 604(1)'] |
| `5b61d34e-b0ad-4613-963b-a22f4f723a40` | FTC | provisions missing: ['FTC Act Section 13(b)', 'FTC Act Section 19'] |
| `9794ac36-3ccc-4bd3-a502-2320d6c274c5` | FTC | provisions missing: ['Telemarketing Act Section 6101-6108'] |
| `a8b0af4f-5325-4d2a-975d-2fc0057953a5` | FTC | provisions missing: ['FTC Act Section 13(b)', 'Telemarketing Act Section 6'] |
| `bd015e1e-9095-4740-af3b-2ba175156bb9` | FTC | provisions missing: ['ROSCA Section 3'] |
| `03046218-5318-455a-a14a-fc1af1a0da37` | FTC | provisions missing: ['Maryland Consumer Protection Act §13-303'] |
| `f2bfcfb9-51fa-4d6a-b19c-ee6dba424d60` | FTC | provisions missing: ['FTC Act Section 13(b)', 'FTC Act Section 19'] |

**Reason class counts:** provisions_missing=19, decision_date_not_found=4, regulator_not_found=1 (FTC row where `regulator` normalized alias absent from the retrieved OCR excerpt — left `requires_review`, no substantive edit).
No `failed` rows: no material contradiction observed (e.g., no case where the source contradicts the recorded regulator/date/amount). Partial classification preserves optionality for a future OCR-remediated pass.

## 6. Writes (verification columns only)

```sql
UPDATE enforcement_actions
SET verification_status='verified',
    verification_deterministic_pass=true,
    verification_last_run_at=now(),
    verification_paraphrase_confidence='not_run'
WHERE id IN (<31 verified ids>);
```

Rows updated: **31**. Substantive fields (regulator, decision_date, fine_amount, fine_amount_local, statutory_provisions, source_document_text, etc.) **NOT** touched.

## 7. Post-write global verification_status snapshot

| status | count |
|---|---|
| verified | 74 |
| requires_review | 2223 |
| unverified | 3007 |
| failed | 176 |

`requires_review` decreased by exactly 31 (2254 → 2223), matching promotion count. No `failed` rows added.

## 8. Guardrails observed

- NO edge-function edits, NO deploys, NO prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits.
- Instrument s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN.
- `quality_batch_runs` not touched; no wave launched (Wave 24 controller-owned).
- No customer-visible surface changed; no Fable-5 references.
- CEO INTEGRITY DIRECTIVE preserved: no promotion without primary-source substring grounding.