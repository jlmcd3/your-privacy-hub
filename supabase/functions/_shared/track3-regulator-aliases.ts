// Maps short regulator keys (used in Track 3 orchestrator request bodies)
// to (a) the canonical regulator_profiles.canonical_name used for profile lookup
// and (b) the predicate matching every legacy enforcement_actions row produced
// by that regulator — including rows where regulator_canonical is NULL but the
// free-text `regulator` field clearly identifies the authority.

export type RegulatorAliasKey =
  | "aepd" | "anspdcp" | "naih" | "uoou" | "ftc"
  | "garante" | "uodo" | "cnil" | "hdpa" | "oaic"
  | "cppa" | "cag" | "txag" | "nyag" | "ctag" | "coag" | "orag" | "inag" | "vaag"
  | "opc" | "cai" | "ipc_on" | "oipc_ab" | "oipc_bc";

export interface RegulatorAlias {
  canonical: string;
  regulatorMatches: string[];
  allowedHosts: string[];
}

export const TRACK3_REGULATORS: Record<RegulatorAliasKey, RegulatorAlias> = {
  aepd: {
    canonical: "Agencia Española de Protección de Datos (AEPD)",
    regulatorMatches: [
      "Agencia Española de Protección de Datos (AEPD)",
      "Spanish Data Protection Authority (aepd)",
      "AEPD",
    ],
    allowedHosts: ["aepd.es", "www.aepd.es"],
  },
  anspdcp: {
    canonical:
      "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)",
    regulatorMatches: [
      "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)",
      "Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP)",
      "ANSPDCP",
    ],
    allowedHosts: ["dataprotection.ro", "www.dataprotection.ro"],
  },
  naih: {
    canonical:
      "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
    regulatorMatches: [
      "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
      "NAIH",
      "Hungarian National Authority for Data Protection (NAIH)",
      "Hungarian National Authority for Data Protection and the Freedom of Information (NAIH)",
    ],
    allowedHosts: ["naih.hu", "www.naih.hu"],
  },
  uoou: {
    canonical: "Úřad pro ochranu osobních údajů (ÚOOÚ)",
    regulatorMatches: [
      "Úřad pro ochranu osobních údajů (ÚOOÚ)",
      "ÚOOÚ",
      "Czech Data Protection Authority (UOOU)",
      "Czech Data Protection Auhtority (UOOU)",
    ],
    allowedHosts: ["uoou.cz", "www.uoou.cz", "uoou.gov.cz"],
  },
  ftc: {
    canonical: "Federal Trade Commission (FTC)",
    regulatorMatches: ["Federal Trade Commission (FTC)", "FTC"],
    allowedHosts: ["ftc.gov", "www.ftc.gov"],
  },
  garante: {
    canonical: "Garante per la protezione dei dati personali",
    regulatorMatches: [
      "Garante per la protezione dei dati personali",
      "Italian Data Protection Authority (Garante)",
      "Garante (Italy)",
    ],
    allowedHosts: ["garanteprivacy.it", "www.garanteprivacy.it", "gpdp.it", "www.gpdp.it"],
  },
  uodo: {
    canonical: "Urząd Ochrony Danych Osobowych (UODO)",
    regulatorMatches: [
      "Urząd Ochrony Danych Osobowych (UODO)",
      "UODO",
      "Polish National Personal Data Protection Office (UODO)",
      "Polish Data Protection Authority (UODO)",
    ],
    allowedHosts: ["uodo.gov.pl", "www.uodo.gov.pl"],
  },
  cnil: {
    canonical: "Commission nationale de l'informatique et des libertés (CNIL)",
    regulatorMatches: [
      "Commission nationale de l'informatique et des libertés (CNIL)",
      "French Data Protection Authority (CNIL)",
      "CNIL",
      "CNIL (France)",
    ],
    allowedHosts: ["cnil.fr", "www.cnil.fr", "legifrance.gouv.fr", "www.legifrance.gouv.fr"],
  },
  hdpa: {
    canonical: "Hellenic Data Protection Authority (HDPA)",
    regulatorMatches: ["Hellenic Data Protection Authority (HDPA)", "HDPA"],
    allowedHosts: ["dpa.gr", "www.dpa.gr"],
  },
  oaic: {
    canonical: "Office of the Australian Information Commissioner (OAIC)",
    regulatorMatches: ["Office of the Australian Information Commissioner (OAIC)", "OAIC"],
    allowedHosts: ["oaic.gov.au", "www.oaic.gov.au"],
  },

  // ── US state regulators ──────────────────────────────────────────
  cppa: {
    canonical: "California Privacy Protection Agency (CPPA)",
    regulatorMatches: ["California Privacy Protection Agency (CPPA)", "CPPA"],
    allowedHosts: ["cppa.ca.gov", "www.cppa.ca.gov", "privacy.ca.gov", "www.privacy.ca.gov"],
  },
  cag: {
    canonical: "California Attorney General (CA AG)",
    regulatorMatches: ["California Attorney General (CA AG)", "California Attorney General", "CA AG"],
    allowedHosts: ["oag.ca.gov", "www.oag.ca.gov"],
  },
  txag: {
    canonical: "Texas Attorney General (TX AG)",
    regulatorMatches: ["Texas Attorney General (TX AG)", "Texas Attorney General", "TX AG", "Texas AG"],
    allowedHosts: ["texasattorneygeneral.gov", "www.texasattorneygeneral.gov"],
  },
  nyag: {
    canonical: "New York Attorney General (NY AG)",
    regulatorMatches: ["New York Attorney General (NY AG)", "New York Attorney General", "NY AG"],
    allowedHosts: ["ag.ny.gov", "www.ag.ny.gov"],
  },
  ctag: {
    canonical: "Connecticut Attorney General (CT AG)",
    regulatorMatches: ["Connecticut Attorney General (CT AG)", "Connecticut Attorney General", "CT AG"],
    allowedHosts: ["portal.ct.gov", "www.portal.ct.gov", "ct.gov"],
  },
  coag: {
    canonical: "Colorado Attorney General (CO AG)",
    regulatorMatches: ["Colorado Attorney General (CO AG)", "Colorado Attorney General", "CO AG", "Colorado AG"],
    allowedHosts: ["coag.gov", "www.coag.gov"],
  },
  orag: {
    canonical: "Oregon Attorney General (OR AG)",
    regulatorMatches: ["Oregon Attorney General (OR AG)", "Oregon Attorney General", "OR AG"],
    allowedHosts: ["doj.state.or.us", "www.doj.state.or.us", "oregon.gov"],
  },
  inag: {
    canonical: "Indiana Attorney General (IN AG)",
    regulatorMatches: ["Indiana Attorney General (IN AG)", "Indiana Attorney General", "IN AG"],
    allowedHosts: ["in.gov", "www.in.gov"],
  },
  vaag: {
    canonical: "Virginia Attorney General (VA AG)",
    regulatorMatches: ["Virginia Attorney General (VA AG)", "Virginia Attorney General", "VA AG"],
    allowedHosts: ["oag.state.va.us", "www.oag.state.va.us", "virginia.gov"],
  },

  // ── Canadian regulators ──────────────────────────────────────────
  opc: {
    canonical: "Office of the Privacy Commissioner of Canada (OPC)",
    regulatorMatches: [
      "Office of the Privacy Commissioner of Canada (OPC)",
      "OPC Canada",
      "OPC",
      "Privacy Commissioner of Canada",
    ],
    allowedHosts: ["priv.gc.ca", "www.priv.gc.ca"],
  },
  cai: {
    canonical: "Commission d'accès à l'information du Québec (CAI)",
    regulatorMatches: [
      "Commission d'accès à l'information du Québec (CAI)",
      "Quebec CAI",
      "CAI Québec",
      "CAI",
    ],
    allowedHosts: ["cai.gouv.qc.ca", "www.cai.gouv.qc.ca"],
  },
  ipc_on: {
    canonical: "Information and Privacy Commissioner of Ontario (IPC)",
    regulatorMatches: [
      "Information and Privacy Commissioner of Ontario (IPC)",
      "Ontario IPC",
      "IPC Ontario",
    ],
    allowedHosts: ["ipc.on.ca", "www.ipc.on.ca"],
  },
  oipc_ab: {
    canonical: "Office of the Information and Privacy Commissioner of Alberta (OIPC AB)",
    regulatorMatches: [
      "Office of the Information and Privacy Commissioner of Alberta (OIPC AB)",
      "Alberta OIPC",
      "OIPC AB",
    ],
    allowedHosts: ["oipc.ab.ca", "www.oipc.ab.ca"],
  },
  oipc_bc: {
    canonical: "Office of the Information and Privacy Commissioner for BC (OIPC BC)",
    regulatorMatches: [
      "Office of the Information and Privacy Commissioner for BC (OIPC BC)",
      "BC OIPC",
      "OIPC BC",
    ],
    allowedHosts: ["oipc.bc.ca", "www.oipc.bc.ca"],
  },
};

export function resolveRegulatorAlias(key: string): RegulatorAlias | null {
  const k = key.toLowerCase().trim() as RegulatorAliasKey;
  return TRACK3_REGULATORS[k] ?? null;
}

export function buildRegulatorOrFilter(alias: RegulatorAlias): string {
  const parts: string[] = [];
  for (const v of alias.regulatorMatches) {
    const safe = v.replace(/"/g, '\\"');
    parts.push(`regulator.eq."${safe}"`);
    parts.push(`regulator_canonical.eq."${safe}"`);
  }
  return parts.join(",");
}

export function urlHostAllowed(rawUrl: string, allowedHosts: string[]): boolean {
  try {
    const host = new URL(rawUrl).host.toLowerCase();
    return allowedHosts.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}
