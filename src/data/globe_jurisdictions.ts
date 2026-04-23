/**
 * All jurisdictions for the "Spin the Globe" feature.
 * Sourced from global_privacy_authorities.json + US state/federal authorities.
 * Each entry needs lat/lon for 3D globe positioning.
 */

export interface GlobeJurisdiction {
  name: string;
  cc: string;
  slug: string;
  lat: number;
  lon: number;
  law: string;
  regulator: string;
  tagline: string;
}

const GLOBE_JURISDICTIONS: GlobeJurisdiction[] = [
  // ── European Union (28 entries: EDPB + 27 member states) ──
  { name: "European Union", cc: "eu", slug: "european-union", lat: 50.8, lon: 4.4, law: "GDPR", regulator: "EDPB", tagline: "The EDPB coordinates GDPR enforcement across all EU member states." },
  { name: "Austria", cc: "at", slug: "austria", lat: 47.5, lon: 14.6, law: "GDPR / DSG", regulator: "DSB", tagline: "DSB issued the landmark Google Analytics ruling under GDPR." },
  { name: "Belgium", cc: "be", slug: "belgium", lat: 50.8, lon: 4.4, law: "GDPR", regulator: "APD/GBA", tagline: "APD hosts the EDPB secretariat in Brussels." },
  { name: "Bulgaria", cc: "bg", slug: "bulgaria", lat: 42.7, lon: 25.5, law: "GDPR", regulator: "CPDP", tagline: "Bulgaria's CPDP has been increasing enforcement activity." },
  { name: "Croatia", cc: "hr", slug: "croatia", lat: 45.1, lon: 15.2, law: "GDPR", regulator: "AZOP", tagline: "Croatia's AZOP is one of the newer EU DPAs." },
  { name: "Cyprus", cc: "cy", slug: "cyprus", lat: 35.1, lon: 33.4, law: "GDPR", regulator: "OCPDP", tagline: "Cyprus enforces GDPR as a member state with its own supervisory authority." },
  { name: "Czech Republic", cc: "cz", slug: "czech-republic", lat: 49.8, lon: 15.5, law: "GDPR", regulator: "ÚOOÚ", tagline: "Czech DPA focuses on public sector and CCTV compliance." },
  { name: "Denmark", cc: "dk", slug: "denmark", lat: 56.3, lon: 9.5, law: "GDPR", regulator: "Datatilsynet", tagline: "Datatilsynet enforces strict rules on employee monitoring." },
  { name: "Estonia", cc: "ee", slug: "estonia", lat: 58.6, lon: 25.0, law: "GDPR", regulator: "AKI", tagline: "Estonia leads Europe in digital governance and e-residency privacy." },
  { name: "Finland", cc: "fi", slug: "finland", lat: 61.9, lon: 25.7, law: "GDPR", regulator: "TSV", tagline: "Finland's DPA focuses heavily on telecom and health data." },
  { name: "France", cc: "fr", slug: "france", lat: 46.6, lon: 2.2, law: "GDPR", regulator: "CNIL", tagline: "CNIL has been one of Europe's most active data protection enforcers." },
  { name: "Germany", cc: "de", slug: "germany", lat: 51.2, lon: 10.4, law: "GDPR / BDSG", regulator: "BfDI", tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Greece", cc: "gr", slug: "greece", lat: 39.1, lon: 21.8, law: "GDPR", regulator: "HDPA", tagline: "HDPA fined PwC €150K for unlawful employee data processing." },
  { name: "Hungary", cc: "hu", slug: "hungary", lat: 47.2, lon: 19.5, law: "GDPR", regulator: "NAIH", tagline: "NAIH oversees data protection and freedom of information." },
  { name: "Ireland", cc: "ie", slug: "ireland", lat: 53.4, lon: -8.2, law: "GDPR", regulator: "DPC", tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "Italy", cc: "it", slug: "italy", lat: 41.9, lon: 12.6, law: "GDPR", regulator: "Garante", tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Latvia", cc: "lv", slug: "latvia", lat: 56.9, lon: 24.1, law: "GDPR", regulator: "DSI", tagline: "Latvia's Data State Inspectorate enforces GDPR across public and private sectors." },
  { name: "Lithuania", cc: "lt", slug: "lithuania", lat: 55.2, lon: 23.9, law: "GDPR", regulator: "VDAI", tagline: "Lithuania's DPA has been active in telecom privacy enforcement." },
  { name: "Luxembourg", cc: "lu", slug: "luxembourg", lat: 49.8, lon: 6.1, law: "GDPR", regulator: "CNPD", tagline: "Luxembourg CNPD issued the record €746M Amazon GDPR fine." },
  { name: "Malta", cc: "mt", slug: "malta", lat: 35.9, lon: 14.5, law: "GDPR", regulator: "IDPC", tagline: "Malta's IDPC oversees GDPR compliance for this EU island state." },
  { name: "Netherlands", cc: "nl", slug: "netherlands", lat: 52.1, lon: 5.3, law: "GDPR", regulator: "AP", tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "Poland", cc: "pl", slug: "poland", lat: 51.9, lon: 19.1, law: "GDPR", regulator: "UODO", tagline: "UODO has issued several notable GDPR fines in recent years." },
  { name: "Portugal", cc: "pt", slug: "portugal", lat: 39.4, lon: -8.2, law: "GDPR", regulator: "CNPD", tagline: "CNPD has been active in cookie consent enforcement." },
  { name: "Romania", cc: "ro", slug: "romania", lat: 45.9, lon: 24.9, law: "GDPR", regulator: "ANSPDCP", tagline: "Romania's ANSPDCP has increased enforcement since 2022." },
  { name: "Slovakia", cc: "sk", slug: "slovakia", lat: 48.7, lon: 19.7, law: "GDPR", regulator: "ÚOOÚ", tagline: "Slovakia's DPA focuses on public sector and health data compliance." },
  { name: "Slovenia", cc: "si", slug: "slovenia", lat: 46.2, lon: 14.8, law: "GDPR", regulator: "IP RS", tagline: "Slovenia's Information Commissioner oversees data protection and FOI." },
  { name: "Spain", cc: "es", slug: "spain", lat: 40.5, lon: -3.7, law: "GDPR", regulator: "AEPD", tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Sweden", cc: "se", slug: "sweden", lat: 60.1, lon: 18.6, law: "GDPR", regulator: "IMY", tagline: "IMY fined Spotify SEK 58M in 2023 for DSAR response failures." },

  // ── United Kingdom ──
  { name: "United Kingdom", cc: "gb", slug: "united-kingdom", lat: 55.4, lon: -3.4, law: "UK GDPR", regulator: "ICO", tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },

  // ── Canada (4 entries: federal + 3 provinces) ──
  { name: "Canada", cc: "ca", slug: "canada", lat: 56.1, lon: -106.3, law: "PIPEDA", regulator: "OPC", tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Canada — British Columbia", cc: "ca", slug: "canada--british-columbia", lat: 53.7, lon: -127.6, law: "BC PIPA", regulator: "OIPC BC", tagline: "BC's PIPA applies to private-sector organizations in the province." },
  { name: "Canada — Alberta", cc: "ca", slug: "canada--alberta", lat: 53.9, lon: -116.6, law: "Alberta PIPA", regulator: "OIPC Alberta", tagline: "Alberta's PIPA is one of three substantially similar provincial privacy laws." },
  { name: "Canada — Quebec", cc: "ca", slug: "canada--quebec", lat: 52.9, lon: -73.5, law: "Law 25", regulator: "CAI", tagline: "Quebec's Law 25 is one of the strictest provincial privacy regimes in Canada." },

  // ── Asia-Pacific (13 entries) ──
  { name: "Australia", cc: "au", slug: "australia", lat: -25.3, lon: 133.8, law: "Privacy Act 1988", regulator: "OAIC", tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "New Zealand", cc: "nz", slug: "new-zealand", lat: -40.9, lon: 174.9, law: "Privacy Act 2020", regulator: "OPC NZ", tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Japan", cc: "jp", slug: "japan", lat: 36.2, lon: 138.3, law: "APPI", regulator: "PPC", tagline: "Japan holds an EU adequacy decision — key for cross-border transfers." },
  { name: "South Korea", cc: "kr", slug: "south-korea", lat: 35.9, lon: 127.8, law: "PIPA", regulator: "PIPC", tagline: "PIPC fined Google and Meta billions of won in 2022." },
  { name: "Singapore", cc: "sg", slug: "singapore", lat: 1.4, lon: 103.8, law: "PDPA", regulator: "PDPC", tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "India", cc: "in", slug: "india", lat: 20.6, lon: 79.0, law: "DPDPA 2023", regulator: "DPB", tagline: "India's Data Protection Board is being constituted now." },
  { name: "China", cc: "cn", slug: "china", lat: 35.9, lon: 104.2, law: "PIPL", regulator: "CAC", tagline: "PIPL applies extraterritorially to any company processing Chinese data." },
  { name: "Hong Kong", cc: "hk", slug: "hong-kong", lat: 22.3, lon: 114.2, law: "PDPO", regulator: "PCPD", tagline: "Hong Kong's PDPO has been amended to address doxxing." },
  { name: "Taiwan", cc: "tw", slug: "taiwan", lat: 23.7, lon: 121.0, law: "PDPA", regulator: "NDC", tagline: "Taiwan amended its PDPA in 2023 to strengthen enforcement penalties." },
  { name: "Thailand", cc: "th", slug: "thailand", lat: 15.9, lon: 100.9, law: "PDPA", regulator: "PDPC", tagline: "Thailand's PDPA became fully enforceable in June 2022." },
  { name: "Philippines", cc: "ph", slug: "philippines", lat: 12.9, lon: 121.8, law: "DPA 2012", regulator: "NPC", tagline: "NPC has been one of Southeast Asia's most active privacy regulators." },
  { name: "Malaysia", cc: "my", slug: "malaysia", lat: 4.2, lon: 101.9, law: "PDPA 2010", regulator: "PDPD", tagline: "Malaysia is amending its PDPA to add mandatory breach notification." },
  { name: "Indonesia", cc: "id", slug: "indonesia", lat: -0.8, lon: 113.9, law: "PDP Law", regulator: "Komdigi", tagline: "Indonesia passed its first comprehensive privacy law in 2022." },

  // ── Latin America (7 entries) ──
  { name: "Brazil", cc: "br", slug: "brazil", lat: -14.2, lon: -51.9, law: "LGPD", regulator: "ANPD", tagline: "ANPD is establishing new international transfer mechanisms for 2026." },
  { name: "Argentina", cc: "ar", slug: "argentina", lat: -38.4, lon: -63.6, law: "Law 25.326", regulator: "AAIP", tagline: "Argentina holds EU adequacy and is modernizing its data protection law." },
  { name: "Mexico", cc: "mx", slug: "mexico", lat: 23.6, lon: -102.6, law: "LFPDPPP", regulator: "INAI", tagline: "INAI oversees both privacy and transparency in Mexico." },
  { name: "Chile", cc: "cl", slug: "chile", lat: -35.7, lon: -71.5, law: "Law 21.719", regulator: "CPLT", tagline: "Chile is overhauling its privacy law to align with GDPR standards." },
  { name: "Colombia", cc: "co", slug: "colombia", lat: 4.6, lon: -74.3, law: "Law 1581", regulator: "SIC", tagline: "SIC has been actively enforcing data protection since 2012." },
  { name: "Uruguay", cc: "uy", slug: "uruguay", lat: -32.5, lon: -55.8, law: "Law 18.331", regulator: "URCDP", tagline: "Uruguay holds EU adequacy — one of only two in Latin America." },
  { name: "Peru", cc: "pe", slug: "peru", lat: -9.2, lon: -75.0, law: "Law 29733", regulator: "ANPD", tagline: "Peru's data protection authority is strengthening enforcement." },

  // ── Middle East & Africa (9 entries) ──
  { name: "Saudi Arabia", cc: "sa", slug: "saudi-arabia", lat: 23.9, lon: 45.1, law: "PDPL", regulator: "SDAIA", tagline: "Saudi Arabia's PDPL takes full effect in September 2024." },
  { name: "UAE", cc: "ae", slug: "united-arab-emirates", lat: 23.4, lon: 53.8, law: "UAE PDPL", regulator: "UAE Data Office", tagline: "UAE's federal data protection law came into force in 2022." },
  { name: "Israel", cc: "il", slug: "israel", lat: 31.0, lon: 34.9, law: "PPL", regulator: "PPA", tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "South Africa", cc: "za", slug: "south-africa", lat: -30.6, lon: 22.9, law: "POPIA", regulator: "Info Regulator", tagline: "POPIA has been fully in force since 2021." },
  { name: "Nigeria", cc: "ng", slug: "nigeria", lat: 9.1, lon: 8.7, law: "NDPA 2023", regulator: "NDPC", tagline: "Nigeria established its Data Protection Commission in 2023." },
  { name: "Kenya", cc: "ke", slug: "kenya", lat: -0.02, lon: 37.9, law: "DPA 2019", regulator: "ODPC", tagline: "Kenya's ODPC has been actively registering data controllers since 2022." },
  { name: "Morocco", cc: "ma", slug: "morocco", lat: 31.8, lon: -7.1, law: "Law 09-08", regulator: "CNDP", tagline: "Morocco's CNDP is among North Africa's most established DPAs." },
  { name: "Tunisia", cc: "tn", slug: "tunisia", lat: 33.9, lon: 9.5, law: "Law 2004-63", regulator: "INPDP", tagline: "One of the earliest African data protection authorities, established 2004." },

  // ── Other Notable Jurisdictions ──
  { name: "Switzerland", cc: "ch", slug: "switzerland", lat: 46.8, lon: 8.2, law: "revFADP", regulator: "FDPIC", tagline: "Switzerland's revised nFADP has fully applied since September 2023." },
  { name: "Norway", cc: "no", slug: "norway", lat: 60.5, lon: 8.5, law: "GDPR (EEA)", regulator: "Datatilsynet", tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Iceland", cc: "is", slug: "iceland", lat: 64.9, lon: -19.0, law: "GDPR (EEA)", regulator: "Persónuvernd", tagline: "Iceland applies the GDPR as an EEA member." },
  { name: "Liechtenstein", cc: "li", slug: "liechtenstein", lat: 47.2, lon: 9.6, law: "GDPR (EEA)", regulator: "DSS", tagline: "Liechtenstein applies the GDPR via the EEA Agreement." },
  { name: "Turkey", cc: "tr", slug: "turkey", lat: 39.0, lon: 35.2, law: "KVKK Law 6698", regulator: "KVKK", tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Russia", cc: "ru", slug: "russia", lat: 61.5, lon: 105.3, law: "FZ-152", regulator: "Roskomnadzor", tagline: "Roskomnadzor enforces strict data localization requirements." },
  { name: "Qatar", cc: "qa", slug: "qatar", lat: 25.4, lon: 51.2, law: "Law 13/2016", regulator: "CDA", tagline: "Qatar's data protection applies to the QFC and mainland." },
  { name: "Bahrain", cc: "bh", slug: "bahrain", lat: 26.0, lon: 50.6, law: "PDPL 2018", regulator: "PDA", tagline: "Bahrain was the first Gulf state to enact comprehensive privacy legislation." },
  { name: "Ghana", cc: "gh", slug: "ghana", lat: 7.9, lon: -1.0, law: "DPA 2012", regulator: "DPC", tagline: "Ghana was one of the first African nations with data protection legislation." },
  { name: "Egypt", cc: "eg", slug: "egypt", lat: 26.8, lon: 30.8, law: "Law 151/2020", regulator: "DPC", tagline: "Egypt's data protection law covers both public and private sectors." },
  { name: "Vietnam", cc: "vn", slug: "vietnam", lat: 14.1, lon: 108.3, law: "PDPD", regulator: "MPS", tagline: "Vietnam's first comprehensive data protection decree took effect in 2023." },

  // ── United States (federal + 24 states with enacted comprehensive privacy laws) ──
  { name: "United States (Federal)", cc: "us", slug: "united-states", lat: 38.9, lon: -77.0, law: "No federal law", regulator: "FTC", tagline: "No federal privacy law yet — but 19+ states now have comprehensive privacy acts." },
  { name: "California", cc: "us", slug: "california", lat: 36.8, lon: -119.4, law: "CCPA / CPRA", regulator: "CPPA", tagline: "Home to the CPPA — the only dedicated state privacy agency in the US." },
  { name: "Colorado", cc: "us", slug: "colorado", lat: 39.6, lon: -105.8, law: "CPA", regulator: "Colorado AG", tagline: "Colorado requires universal opt-out mechanisms and data protection assessments." },
  { name: "Connecticut", cc: "us", slug: "connecticut", lat: 41.6, lon: -73.1, law: "CTDPA", regulator: "Connecticut AG", tagline: "Connecticut's CTDPA includes strong protections for sensitive data and children's privacy." },
  { name: "Delaware", cc: "us", slug: "delaware", lat: 38.9, lon: -75.5, law: "DPDPA", regulator: "Delaware AG", tagline: "Delaware's privacy law covers a broad range of businesses and consumer rights." },
  { name: "Florida", cc: "us", slug: "florida", lat: 27.7, lon: -81.5, law: "FDBR", regulator: "Florida AG", tagline: "Florida's Digital Bill of Rights applies to large technology platforms." },
  { name: "Illinois", cc: "us", slug: "illinois", lat: 40.6, lon: -89.4, law: "BIPA", regulator: "Illinois AG", tagline: "BIPA has generated billions in settlements — the most-litigated US privacy statute." },
  { name: "Indiana", cc: "us", slug: "indiana", lat: 40.3, lon: -86.1, law: "INCDPA", regulator: "Indiana AG", tagline: "Indiana's privacy law follows the Virginia model with opt-out rights for targeted advertising." },
  { name: "Iowa", cc: "us", slug: "iowa", lat: 41.9, lon: -93.1, law: "ICDPA", regulator: "Iowa AG", tagline: "Iowa's privacy law focuses on larger data processors with narrower consumer rights." },
  { name: "Kentucky", cc: "us", slug: "kentucky", lat: 37.8, lon: -84.3, law: "KCDPA", regulator: "Kentucky AG", tagline: "Kentucky's Consumer Data Protection Act took full effect in 2026." },
  { name: "Maryland", cc: "us", slug: "maryland", lat: 39.0, lon: -76.6, law: "MODPA", regulator: "Maryland AG", tagline: "Maryland's MODPA is one of the strictest US state laws, requiring data minimization." },
  { name: "Minnesota", cc: "us", slug: "minnesota", lat: 46.7, lon: -94.7, law: "MCDPA", regulator: "Minnesota AG", tagline: "Minnesota's privacy law includes a private right of action for data breach violations." },
  { name: "Montana", cc: "us", slug: "montana", lat: 46.9, lon: -110.4, law: "MTCDPA", regulator: "Montana AG", tagline: "Montana's Consumer Data Privacy Act took effect October 2024." },
  { name: "Nebraska", cc: "us", slug: "nebraska", lat: 41.5, lon: -99.9, law: "NDPA", regulator: "Nebraska AG", tagline: "Nebraska's Data Privacy Act covers broad categories of personal data." },
  { name: "Nevada", cc: "us", slug: "nevada", lat: 38.8, lon: -116.4, law: "NPICICA", regulator: "Nevada AG", tagline: "Nevada's law focuses on the right to opt out of the sale of personal information." },
  { name: "New Hampshire", cc: "us", slug: "new-hampshire", lat: 43.2, lon: -71.6, law: "NHPA", regulator: "New Hampshire AG", tagline: "New Hampshire's Privacy Act follows the Virginia-model framework, effective January 2025." },
  { name: "New Jersey", cc: "us", slug: "new-jersey", lat: 40.1, lon: -74.4, law: "NJDPA", regulator: "New Jersey AG", tagline: "New Jersey's Data Privacy Act took effect January 2025." },
  { name: "Oregon", cc: "us", slug: "oregon", lat: 43.8, lon: -120.6, law: "OCPA", regulator: "Oregon AG", tagline: "Oregon's Consumer Privacy Act requires data minimization and is among the most comprehensive." },
  { name: "Rhode Island", cc: "us", slug: "rhode-island", lat: 41.7, lon: -71.5, law: "RIDTPPA", regulator: "Rhode Island AG", tagline: "Rhode Island's data transparency and privacy protection law took effect January 2026." },
  { name: "Tennessee", cc: "us", slug: "tennessee", lat: 35.5, lon: -86.6, law: "TIPA", regulator: "Tennessee AG", tagline: "Tennessee's Information Protection Act took effect July 2025." },
  { name: "Texas", cc: "us", slug: "texas", lat: 31.5, lon: -99.3, law: "TDPSA", regulator: "Texas AG", tagline: "Texas AG secured a $1.4B settlement against Meta for biometric data violations in 2024." },
  { name: "Utah", cc: "us", slug: "utah", lat: 39.3, lon: -111.1, law: "UCPA", regulator: "Utah AG", tagline: "Utah's Consumer Privacy Act has one of the higher applicability thresholds of any US state law." },
  { name: "Vermont", cc: "us", slug: "vermont", lat: 44.6, lon: -72.6, law: "VDPA", regulator: "Vermont AG", tagline: "Vermont has been a pioneer in privacy legislation including one of the first data broker laws." },
  { name: "Virginia", cc: "us", slug: "virginia", lat: 37.4, lon: -78.7, law: "VCDPA", regulator: "Virginia AG", tagline: "Virginia's VCDPA was the second comprehensive state privacy law enacted after California." },
  { name: "Washington", cc: "us", slug: "washington", lat: 47.8, lon: -121.0, law: "MHMDA", regulator: "Washington AG", tagline: "Washington's My Health My Data Act provides unique protections for consumer health data." },
];

export default GLOBE_JURISDICTIONS;
