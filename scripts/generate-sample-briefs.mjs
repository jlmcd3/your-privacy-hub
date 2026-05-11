#!/usr/bin/env node
// Generate src/data/sampleBriefs.ts — 24 region×role briefs, each with 10 track sections,
// strictly grounded in real DB rows from enforcement_actions and updates.
//
// Usage:
//   node scripts/generate-sample-briefs.mjs                 # full run
//   node scripts/generate-sample-briefs.mjs --region eu --role dpo  # single slice
//   node scripts/generate-sample-briefs.mjs --dry           # show source counts only
//
// Requires env: LOVABLE_API_KEY, PGHOST/PGUSER/etc (psql) — both already set in sandbox.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ─── CONFIG ───────────────────────────────────────────────────────────────
const REGIONS = ["eu", "us", "global", "apac"];
const ROLES   = ["dpo", "cpo", "privacy_counsel", "compliance_lead", "security_lead", "privacy_pro"];
const TRACKS  = [
  "us_state", "gdpr", "ai_act", "childrens", "adtech_cookies",
  "cross_border", "health_hipaa", "litigation", "biometric", "breach",
];

const REGION_LABELS = {
  eu: "EU & UK",
  us: "United States",
  global: "Global / Multinational",
  apac: "Asia-Pacific",
};

const ROLE_LABELS = {
  dpo: "Data Protection Officer",
  cpo: "Chief Privacy Officer",
  privacy_counsel: "Privacy Counsel",
  compliance_lead: "Compliance Lead",
  security_lead: "Security Lead / CISO",
  privacy_pro: "Privacy Professional",
};

const TRACK_LABELS = {
  us_state: "US State Privacy Laws",
  gdpr: "GDPR Enforcement & DPA Activity",
  ai_act: "EU AI Act Compliance",
  childrens: "Children's Privacy & Age Verification",
  adtech_cookies: "AdTech, Consent & Cookie Compliance",
  cross_border: "Cross-Border Data Transfers",
  health_hipaa: "Health & Medical Data Privacy",
  litigation: "Privacy Litigation & Class Actions",
  biometric: "Biometric Data Privacy",
  breach: "Data Breach & Incident Response",
};

// Track → keyword/tag matchers used to pull relevant updates/enforcement rows.
const TRACK_MATCH = {
  us_state:       { tags: ["ccpa", "california", "virginia", "colorado", "texas", "us-state", "cpra", "cppa"], words: ["state privacy", "attorney general", "ccpa", "cpra", "cppa", "vcdpa"] },
  gdpr:           { tags: ["gdpr", "edpb", "ico", "cnil", "uk-gdpr", "dpa-2018"], words: ["gdpr", "edpb", "dpa", "data protection authority"] },
  ai_act:         { tags: ["ai", "ai-act", "gpai"], words: ["ai act", "artificial intelligence", "gpai", "automated decision"] },
  childrens:      { tags: ["children", "age-verification", "kids"], words: ["children", "minor", "age verification", "coppa", "teen"] },
  adtech_cookies: { tags: ["adtech", "cookies", "consent", "tcf"], words: ["cookie", "consent", "adtech", "tcf", "iab", "tracking"] },
  cross_border:   { tags: ["transfer", "dpf", "scc", "adequacy"], words: ["cross-border", "transfer", "adequacy", "data privacy framework", "scc"] },
  health_hipaa:   { tags: ["health", "hipaa", "medical"], words: ["health", "hipaa", "medical", "patient", "hospital"] },
  litigation:     { tags: ["litigation", "class-action", "bipa"], words: ["lawsuit", "class action", "litigation", "court", "settlement", "bipa"] },
  biometric:      { tags: ["biometric", "facial-recognition", "bipa"], words: ["biometric", "facial recognition", "bipa", "fingerprint"] },
  breach:         { tags: ["data-breaches", "breach", "incident"], words: ["breach", "incident", "ransomware", "leaked"] },
};

// Region → SQL filter for jurisdiction (enforcement_actions) and tag set (updates).
const REGION_FILTER = {
  eu: {
    enfWhere: `jurisdiction ILIKE ANY(ARRAY['Spain','Italy','France','Germany','%netherlands%','Greece','Romania','Poland','Slovenia','Croatia','Austria','Finland','Ireland','Belgium','Sweden','Norway','Denmark','Cyprus','Hungary','Portugal','EU','EU%','United kingdom','UK%','Switzerland','%european%'])`,
    upTags: ["eu", "eea", "gdpr", "edpb", "european-union", "uk", "united-kingdom", "ico", "france", "germany", "spain", "italy", "ireland"],
  },
  us: {
    enfWhere: `(jurisdiction ILIKE 'U.S.%' OR jurisdiction ILIKE '%United States%' OR jurisdiction ILIKE 'California%' OR jurisdiction ILIKE 'Texas%')`,
    upTags: ["us", "united-states", "california", "ccpa", "cpra", "cppa", "ftc", "us-federal", "us-state", "texas", "virginia", "colorado", "florida"],
  },
  global: {
    enfWhere: `TRUE`, // pulls top precedent_significance worldwide
    upTags: ["global", "international", "cross-border", "adequacy", "transfer", "oecd"],
  },
  apac: {
    enfWhere: `jurisdiction ILIKE ANY(ARRAY['Japan','China','South Korea','Korea%','India','Australia','Singapore','Thailand','Vietnam','Hong Kong','Taiwan','New Zealand','Indonesia','Philippines','Malaysia'])`,
    upTags: ["japan", "china", "korea", "south-korea", "india", "australia", "singapore", "appi", "pipl", "pipa", "dpdpa", "privacy-act"],
  },
};

// ─── ARGS ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1]?.startsWith("--") ? true : args[i + 1] ?? true) : null;
};
const ONLY_REGION = flag("region");
const ONLY_ROLE   = flag("role");
const DRY         = flag("dry");
const OUT_PATH    = "src/data/sampleBriefs.ts";
const PROGRESS_PATH = "public/briegen-progress.json".replace("briegen", "briefgen");

// ─── PROGRESS WRITER ──────────────────────────────────────────────────────
const PROGRESS = {
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "starting",
  totalBriefs: 0,
  completedBriefs: 0,
  totalSteps: 0,           // tracks + shared per brief
  completedSteps: 0,
  currentRegion: null,
  currentRole: null,
  currentTrack: null,
  recent: [],              // last 12 step log entries
  errors: [],
  finishedAt: null,
};
function writeProgress(patch = {}) {
  Object.assign(PROGRESS, patch, { updatedAt: new Date().toISOString() });
  try {
    if (!existsSync(dirname(PROGRESS_PATH))) mkdirSync(dirname(PROGRESS_PATH), { recursive: true });
    writeFileSync(PROGRESS_PATH, JSON.stringify(PROGRESS, null, 2));
  } catch (e) { /* non-fatal */ }
}
function logStep(label, ok = true, detail = "") {
  PROGRESS.recent.unshift({ t: new Date().toISOString(), label, ok, detail });
  PROGRESS.recent = PROGRESS.recent.slice(0, 12);
  if (!ok) PROGRESS.errors.unshift({ t: new Date().toISOString(), label, detail });
  PROGRESS.errors = PROGRESS.errors.slice(0, 25);
}

// ─── DB HELPERS (psql JSON) ───────────────────────────────────────────────
function psqlJson(sql) {
  const tmp = `/tmp/q_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`;
  writeFileSync(tmp, sql);
  const out = execSync(`psql -At -F $'\\t' -f ${tmp}`, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  // Each row is a single JSON object (we SELECT row_to_json).
  return out.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function pullEnforcement(region, limit = 8) {
  const f = REGION_FILTER[region];
  // For "global" we rank by precedent_significance to get the heavy-hitters.
  const orderBy = region === "global"
    ? "precedent_significance DESC NULLS LAST, decision_date DESC"
    : "decision_date DESC";
  const sql = `
    SELECT row_to_json(t) FROM (
      SELECT id::text, regulator, subject, jurisdiction, decision_date::text,
             fine_amount, fine_eur, law, violation, source_url, sector,
             key_compliance_failure, preventive_measures
      FROM enforcement_actions
      WHERE ${f.enfWhere}
        AND decision_date IS NOT NULL
        AND subject IS NOT NULL
        AND source_url IS NOT NULL
      ORDER BY ${orderBy}
      LIMIT ${limit}
    ) t;
  `;
  return psqlJson(sql);
}

function pullUpdatesForTrack(region, track, limit = 5) {
  const f = REGION_FILTER[region];
  const m = TRACK_MATCH[track];
  const tagArr = `ARRAY[${[...new Set([...f.upTags, ...m.tags])].map(t => `'${t}'`).join(",")}]::text[]`;
  const trackTagArr = `ARRAY[${m.tags.map(t => `'${t}'`).join(",")}]::text[]`;
  const wordRegex = m.words.map(w => w.replace(/'/g, "''")).join("|");
  // Match: row tags overlap with track tags AND (region-tag overlap OR text mentions region keyword).
  const sql = `
    SELECT row_to_json(t) FROM (
      SELECT id::text, title, summary, why_it_matters_short, url, source_name,
             published_at::text, regulator, topic_tags, direct_jurisdictions, attention_level
      FROM updates
      WHERE COALESCE(is_hidden,false)=false
        AND url IS NOT NULL
        AND title IS NOT NULL
        AND published_at >= NOW() - INTERVAL '12 months'
        AND (
          topic_tags && ${trackTagArr}
          OR (title || ' ' || COALESCE(summary,'')) ~* '(${wordRegex})'
        )
        AND (
          topic_tags && ${tagArr}
          OR direct_jurisdictions && ${tagArr}
          OR affected_jurisdictions && ${tagArr}
          ${region === "global" ? "OR TRUE" : ""}
        )
      ORDER BY (CASE attention_level WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END), published_at DESC
      LIMIT ${limit}
    ) t;
  `;
  return psqlJson(sql);
}

// ─── AI CALL ──────────────────────────────────────────────────────────────
const API_KEY = process.env.LOVABLE_API_KEY;
if (!API_KEY) { console.error("LOVABLE_API_KEY not set"); process.exit(1); }

async function callAI(system, user, { json = false, model = "google/gemini-2.5-pro" } = {}) {
  const body = {
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
  if (json) body.response_format = { type: "json_object" };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }
  throw new Error("AI: rate limited after retries");
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── PROMPTS ──────────────────────────────────────────────────────────────
const STYLE_RULES = `
You are a senior privacy intelligence analyst writing for the Monday Intelligence Brief at EndUserPrivacy.com.
Voice: senior privacy counsel — precise, declarative, no hedging, no marketing tone.
Structure depth target ~250-380 words for full analysis sections.
HARD RULES (zero tolerance):
1. Use ONLY facts present in the SOURCES JSON provided. Do not invent regulators, fines, dates, statute numbers, case names, or rulings that are not in SOURCES.
2. Every factual claim must be followed by a citation in the form [ref:N] where N is the "ref" key in SOURCES.
3. Do NOT invent URLs, footnote numbers outside the SOURCES set, or fabricate quotations.
4. If SOURCES are sparse, say so honestly ("Limited monitored activity in [region] for [track] this cycle; the most material development is …").
5. Banned phrases: "AI-generated", "AI-summarized", "re-analyzed", "re-written".
6. Never use em-dash > 2 per paragraph. Prefer plain prose.
7. Output VALID JSON only — no markdown fences.
`;

function buildTrackPrompt({ region, role, track, sources }) {
  const sourcesJson = JSON.stringify(sources, null, 2);
  return {
    system: STYLE_RULES,
    user: `REGION: ${REGION_LABELS[region]}
ROLE: ${ROLE_LABELS[role]}
TRACK: ${TRACK_LABELS[track]}

SOURCES (the only facts you may use; cite by ref number):
${sourcesJson}

Produce a JSON object with this exact shape:
{
  "headline": "12-18 word declarative headline grounded in the sources",
  "keyTakeaways": ["3 bullet strings, each 18-28 words, each ending with a [ref:N] citation"],
  "fullAnalysis": "2-3 paragraphs (~280-380 words total) of substantive analysis written for the role. Every factual sentence cites [ref:N]. Tie back to what this means for the role's day-to-day responsibilities in the region.",
  "complianceImpact": "1 short paragraph (60-90 words) on concrete compliance/operational impact for ${ROLE_LABELS[role]} in ${REGION_LABELS[region]}, citing [ref:N].",
  "actionItem": "1-2 sentence imperative action the role should take this week, no citation needed."
}

If SOURCES is empty or thin, headline must lead with "Limited monitored activity:" and the analysis must say so.`,
  };
}

function buildSharedPrompt({ region, role, allSources }) {
  return {
    system: STYLE_RULES,
    user: `REGION: ${REGION_LABELS[region]}
ROLE: ${ROLE_LABELS[role]}

You have the union of all source items pulled for the 10 topic tracks (below). Produce the BRIEF-LEVEL shared sections grounded only in these sources.

SOURCES:
${JSON.stringify(allSources, null, 2)}

Output JSON:
{
  "execSummary": "2 paragraphs (~220-300 words) summarizing the most material developments this cycle for ${ROLE_LABELS[role]} in ${REGION_LABELS[region]}. Lead with the single most consequential item. Cite [ref:N].",
  "trendSignal": "1 paragraph (~150-200 words) identifying the cross-cutting forward-looking signal across the cited items. Cite [ref:N].",
  "actionItems": ["4-6 bullet strings, each 20-35 words, imperative, role-specific, region-specific. No citations needed inside bullets."]
}`,
  };
}

// ─── VALIDATION ───────────────────────────────────────────────────────────
function extractRefs(text) {
  return [...String(text).matchAll(/\[ref:(\d+)\]/g)].map(m => m[1]);
}
function validateSection(section, sourceMap) {
  const allText = JSON.stringify(section);
  const refs = extractRefs(allText);
  const valid = refs.every(r => sourceMap[r]);
  return { ok: valid, refs, badRefs: refs.filter(r => !sourceMap[r]) };
}

// ─── BUILD SOURCE MAP ─────────────────────────────────────────────────────
function buildSources(items) {
  // items: [{kind:'enforcement'|'update', row}]
  const sourceMap = {};
  const sourcesForPrompt = [];
  let ref = 1;
  for (const item of items) {
    const r = item.row;
    if (item.kind === "enforcement") {
      sourceMap[String(ref)] = {
        url: r.source_url, source: r.regulator, title: `${r.regulator} v. ${r.subject} (${r.decision_date?.slice(0,10) ?? ""})`,
      };
      sourcesForPrompt.push({
        ref: String(ref),
        kind: "enforcement_action",
        regulator: r.regulator,
        subject: r.subject,
        jurisdiction: r.jurisdiction,
        decision_date: r.decision_date?.slice(0,10),
        fine: r.fine_amount || (r.fine_eur ? `€${r.fine_eur}` : null),
        law: r.law,
        violation: r.violation?.slice(0, 600),
        key_failure: r.key_compliance_failure,
        preventive: r.preventive_measures,
        url: r.source_url,
      });
    } else {
      sourceMap[String(ref)] = {
        url: r.url, source: r.source_name || r.regulator || "Source",
        title: r.title,
      };
      sourcesForPrompt.push({
        ref: String(ref),
        kind: "regulatory_update",
        title: r.title,
        published: r.published_at?.slice(0,10),
        source: r.source_name,
        regulator: r.regulator,
        summary: (r.why_it_matters_short || r.summary || "").slice(0, 800),
        url: r.url,
      });
    }
    ref++;
  }
  return { sourceMap, sourcesForPrompt };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
async function generateBrief(region, role) {
  console.log(`\n━━ ${region.toUpperCase()} × ${role.toUpperCase()} ━━`);
  writeProgress({ status: "generating", currentRegion: region, currentRole: role, currentTrack: null });

  // 1. Pull region-wide enforcement (8 most recent real actions)
  const enforcement = pullEnforcement(region, 8);
  console.log(`  enforcement actions: ${enforcement.length}`);

  // 2. Pull track-specific items + assemble sources per track
  const trackData = {};
  const allSourceItems = []; // for shared sections — we'll dedupe after
  const enforcementItems = enforcement.map(r => ({ kind: "enforcement", row: r }));

  for (const track of TRACKS) {
    const updates = pullUpdatesForTrack(region, track, 5);
    // Combine: 1-2 region enforcement actions most relevant + up to 4 updates
    const trackItems = [
      ...enforcementItems.slice(0, 2),
      ...updates.map(r => ({ kind: "update", row: r })),
    ];
    trackData[track] = trackItems;
    allSourceItems.push(...updates.map(r => ({ kind: "update", row: r })));
    console.log(`  ${track}: ${updates.length} updates`);
  }

  // 3. Generate each track section
  const tracks = {};
  for (const track of TRACKS) {
    const items = trackData[track];
    writeProgress({ currentTrack: track });
    if (items.length === 0) {
      tracks[track] = {
        headline: `Limited monitored activity: ${TRACK_LABELS[track]} in ${REGION_LABELS[region]}`,
        keyTakeaways: [`No qualifying ${TRACK_LABELS[track]} developments tracked in ${REGION_LABELS[region]} this cycle.`],
        fullAnalysis: `No monitored regulatory activity for ${TRACK_LABELS[track]} in ${REGION_LABELS[region]} during the past 12 months met the brief's inclusion threshold. Coverage in this track resumes when qualifying enforcement, guidance, or legislative activity is recorded in the source database.`,
        complianceImpact: "Maintain existing program controls; no new obligations identified this cycle.",
        actionItem: "Continue monitoring; no track-specific action required this week.",
        sourceMap: {},
      };
      PROGRESS.completedSteps++;
      logStep(`${region}/${role}/${track}`, true, "no source data — placeholder");
      writeProgress();
      continue;
    }
    const { sourceMap, sourcesForPrompt } = buildSources(items);
    const { system, user } = buildTrackPrompt({ region, role, track, sources: sourcesForPrompt });
    let parsed;
    try {
      const raw = await callAI(system, user, { json: true });
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error(`  !! ${track} failed: ${e.message}`);
      tracks[track] = { error: e.message, headline: "Generation failed", keyTakeaways: [], fullAnalysis: "", complianceImpact: "", actionItem: "", sourceMap: {} };
      PROGRESS.completedSteps++;
      logStep(`${region}/${role}/${track}`, false, e.message.slice(0, 160));
      writeProgress();
      continue;
    }
    const v = validateSection(parsed, sourceMap);
    if (!v.ok) {
      console.error(`  ⚠ ${track} bad refs: ${v.badRefs.join(",")} — retry once`);
      const raw2 = await callAI(system, user + "\n\nIMPORTANT: Your prior output cited refs not in SOURCES: " + v.badRefs.join(",") + ". Use only ref values present in SOURCES.", { json: true });
      try { parsed = JSON.parse(raw2); } catch {}
      const v2 = validateSection(parsed, sourceMap);
      if (!v2.ok) parsed.fullAnalysis = (parsed.fullAnalysis || "") + " [validation: some citations stripped]";
    }
    tracks[track] = { ...parsed, sourceMap };
    console.log(`  ✓ ${track}`);
    PROGRESS.completedSteps++;
    logStep(`${region}/${role}/${track}`, true);
    writeProgress();
    await sleep(800);
  }

  // 4. Generate shared sections (exec summary, trend signal, action items)
  // Dedupe shared items by URL, cap at 20.
  const seen = new Set();
  const sharedItems = [...enforcementItems, ...allSourceItems].filter(item => {
    const url = item.row.source_url || item.row.url;
    if (!url || seen.has(url)) return false;
    seen.add(url); return true;
  }).slice(0, 20);
  const { sourceMap: sharedMap, sourcesForPrompt: sharedSrc } = buildSources(sharedItems);
  const { system: sys2, user: usr2 } = buildSharedPrompt({ region, role, allSources: sharedSrc });
  let shared;
  try {
    const raw = await callAI(sys2, usr2, { json: true });
    shared = JSON.parse(raw);
  } catch (e) {
    console.error(`  !! shared failed: ${e.message}`);
    shared = { execSummary: "Generation failed.", trendSignal: "", actionItems: [] };
  }
  const sv = validateSection(shared, sharedMap);
  if (!sv.ok) console.warn(`  ⚠ shared bad refs: ${sv.badRefs.join(",")}`);
  PROGRESS.completedSteps++;
  logStep(`${region}/${role}/_shared`, true);
  writeProgress();

  // 5. Enforcement table — REAL rows, no AI
  const enforcementTable = enforcement.map(r => ({
    regulator: r.regulator,
    subject: r.subject,
    jurisdiction: r.jurisdiction,
    date: r.decision_date?.slice(0,10),
    fine: r.fine_amount || (r.fine_eur ? `€${Number(r.fine_eur).toLocaleString()}` : "—"),
    law: r.law,
    violation: (r.violation || "").slice(0, 220),
    url: r.source_url,
  }));

  return {
    region, role,
    execSummary: shared.execSummary || "",
    trendSignal: shared.trendSignal || "",
    actionItems: shared.actionItems || [],
    sharedSourceMap: sharedMap,
    enforcementTable,
    tracks,
  };
}

// ─── DRIVER ───────────────────────────────────────────────────────────────
async function main() {
  if (DRY) {
    for (const r of REGIONS) {
      console.log(`\n${r}: ${pullEnforcement(r, 8).length} enforcement`);
      for (const t of TRACKS) {
        console.log(`  ${t}: ${pullUpdatesForTrack(r, t, 5).length} updates`);
      }
    }
    return;
  }

  const regions = ONLY_REGION ? [ONLY_REGION] : REGIONS;
  const roles   = ONLY_ROLE   ? [ONLY_ROLE]   : ROLES;

  // Load existing if present (incremental).
  let existing = {};
  if (existsSync(OUT_PATH)) {
    try {
      const txt = readFileSync(OUT_PATH, "utf8");
      const m = txt.match(/export const sampleBriefs[^=]*=\s*(\{[\s\S]*?\}) as const;/);
      if (m) existing = JSON.parse(m[1]);
    } catch {}
  }

  const result = existing;
  const totalBriefs = regions.length * roles.length;
  const totalSteps  = totalBriefs * (TRACKS.length + 1); // tracks + shared
  writeProgress({ status: "running", totalBriefs, totalSteps, completedBriefs: 0, completedSteps: 0 });

  const SKIP_EXISTING = args.includes("--skip-existing");
  for (const region of regions) {
    result[region] ||= {};
    for (const role of roles) {
      if (SKIP_EXISTING && result[region]?.[role]?.tracks && Object.keys(result[region][role].tracks).length > 0) {
        console.log(`\n⏭  ${region}/${role} — already exists, skipping`);
        PROGRESS.completedBriefs++;
        PROGRESS.completedSteps += (TRACKS.length + 1);
        logStep(`${region}/${role}/_skipped`, true, "already in output");
        writeProgress();
        continue;
      }
      const brief = await generateBrief(region, role);
      result[region][role] = brief;
      // Persist after each brief so partial runs aren't lost.
      writeOutput(result);
      PROGRESS.completedBriefs++;
      writeProgress();
    }
  }
  writeProgress({ status: "done", finishedAt: new Date().toISOString(), currentRegion: null, currentRole: null, currentTrack: null });
  console.log(`\n✓ Wrote ${OUT_PATH}`);
}

function writeOutput(data) {
  if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true });
  const json = JSON.stringify(data, null, 2);
  const ts = `// AUTO-GENERATED by scripts/generate-sample-briefs.mjs — do not edit by hand.
// All facts grounded in real rows from enforcement_actions / updates tables.
// Regenerate with: node scripts/generate-sample-briefs.mjs

export type SampleSource = { url: string; title: string; source: string };
export type SampleSourceMap = Record<string, SampleSource>;

export interface SampleTrackSection {
  headline: string;
  keyTakeaways: string[];
  fullAnalysis: string;
  complianceImpact: string;
  actionItem: string;
  sourceMap: SampleSourceMap;
}

export interface SampleEnforcementRow {
  regulator: string;
  subject: string;
  jurisdiction: string;
  date: string;
  fine: string;
  law: string;
  violation: string;
  url: string;
}

export interface SampleBrief {
  region: string;
  role: string;
  execSummary: string;
  trendSignal: string;
  actionItems: string[];
  sharedSourceMap: SampleSourceMap;
  enforcementTable: SampleEnforcementRow[];
  tracks: Record<string, SampleTrackSection>;
}

export const sampleBriefs: Record<string, Record<string, SampleBrief>> = ${json} as const;
`;
  writeFileSync(OUT_PATH, ts);
}

main().catch(e => {
  console.error(e);
  try { writeProgress({ status: "error", finishedAt: new Date().toISOString() }); logStep("fatal", false, String(e?.message || e)); writeProgress(); } catch {}
  process.exit(1);
});
