import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";

// ── Content-rich jurisdictions with lat/lon ──────────────────────────────────
const RICH_JURISDICTIONS = [
  { name: "France",         flag: "🇫🇷", slug: "france",         lat: 46.6,  lon: 2.2,    law: "GDPR",          regulator: "CNIL",        tagline: "CNIL has been one of Europe's most active enforcers." },
  { name: "Germany",        flag: "🇩🇪", slug: "germany",        lat: 51.2,  lon: 10.4,   law: "GDPR + BDSG",   regulator: "BfDI",        tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Ireland",        flag: "🇮🇪", slug: "ireland",        lat: 53.4,  lon: -8.2,   law: "GDPR",          regulator: "DPC",         tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "United Kingdom", flag: "🇬🇧", slug: "united-kingdom", lat: 55.4,  lon: -3.4,   law: "UK GDPR",       regulator: "ICO",         tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },
  { name: "Spain",          flag: "🇪🇸", slug: "spain",          lat: 40.5,  lon: -3.7,   law: "GDPR",          regulator: "AEPD",        tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Italy",          flag: "🇮🇹", slug: "italy",          lat: 41.9,  lon: 12.6,   law: "GDPR",          regulator: "Garante",     tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Netherlands",    flag: "🇳🇱", slug: "netherlands",    lat: 52.1,  lon: 5.3,    law: "GDPR",          regulator: "AP",          tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "United States",  flag: "🇺🇸", slug: "united-states",  lat: 37.1,  lon: -95.7,  law: "19 state laws", regulator: "FTC",         tagline: "No federal law yet — but 19 states have comprehensive privacy acts." },
  { name: "Brazil",         flag: "🇧🇷", slug: "brazil",         lat: -14.2, lon: -51.9,  law: "LGPD",          regulator: "ANPD",        tagline: "ANPD is establishing new transfer mechanisms for 2026." },
  { name: "Canada",         flag: "🇨🇦", slug: "canada",         lat: 56.1,  lon: -106.3, law: "PIPEDA",        regulator: "OPC",         tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Australia",      flag: "🇦🇺", slug: "australia",      lat: -25.3, lon: 133.8,  law: "Privacy Act",   regulator: "OAIC",        tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "Japan",          flag: "🇯🇵", slug: "japan",          lat: 36.2,  lon: 138.3,  law: "APPI",          regulator: "PPC",         tagline: "Japan holds an EU adequacy decision — key for transfers." },
  { name: "South Korea",    flag: "🇰🇷", slug: "south-korea",    lat: 35.9,  lon: 127.8,  law: "PIPA",          regulator: "PIPC",        tagline: "PIPC fined Google ₩69.2B in 2022 for consent violations." },
  { name: "China",          flag: "🇨🇳", slug: "china",          lat: 35.9,  lon: 104.2,  law: "PIPL",          regulator: "CAC",         tagline: "PIPL applies extraterritorially to foreign companies processing Chinese data." },
  { name: "India",          flag: "🇮🇳", slug: "india",          lat: 20.6,  lon: 79.0,   law: "DPDP Act",      regulator: "DPB",         tagline: "India's Data Protection Board is being established now." },
  { name: "South Africa",   flag: "🇿🇦", slug: "south-africa",   lat: -30.6, lon: 22.9,   law: "POPIA",         regulator: "IR",          tagline: "POPIA has been fully in force since 2021." },
  { name: "Israel",         flag: "🇮🇱", slug: "israel",         lat: 31.0,  lon: 34.9,   law: "PPL",           regulator: "PPA",         tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "Turkey",         flag: "🇹🇷", slug: "turkey",         lat: 39.0,  lon: 35.2,   law: "KVKK",          regulator: "KVKK",        tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Norway",         flag: "🇳🇴", slug: "norway",         lat: 60.5,  lon: 8.5,    law: "GDPR (EEA)",    regulator: "Datatilsynet",tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Switzerland",    flag: "🇨🇭", slug: "switzerland",    lat: 46.8,  lon: 8.2,    law: "nFADP",         regulator: "FDPIC",       tagline: "Switzerland's revised nFADP fully applies from September 2023." },
  { name: "Singapore",      flag: "🇸🇬", slug: "singapore",      lat: 1.4,   lon: 103.8,  law: "PDPA",          regulator: "PDPC",        tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "New Zealand",    flag: "🇳🇿", slug: "new-zealand",    lat: -40.9, lon: 174.9,  law: "Privacy Act",   regulator: "OPC NZ",      tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Poland",         flag: "🇵🇱", slug: "poland",         lat: 51.9,  lon: 19.1,   law: "GDPR",          regulator: "UODO",        tagline: "UODO has issued several