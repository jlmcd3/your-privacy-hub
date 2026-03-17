import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Link } from "react-router-dom";
import MapLegend, { STATUS_CONFIG } from "./MapLegend";

// Key = ISO numeric country code (matches topojson world-atlas, zero-padded to 3 digits)
// Singapore uses "SGP" key because the 110m topojson omits city-states
const JURISDICTIONS: Record<string, any> = {
  // ── Americas ──
  "840":{ name:"United States",  flag:"🇺🇸", status:"sector",        law:"Sector laws (HIPAA, COPPA, GLBA) + 19 state laws", regulator:"FTC + State AGs",                year:null, region:"Americas",             slug:"united-states",  rights:["Sector/state rights vary","CCPA/CPRA in California","19 states now comprehensive"], fines:["Meta: $1.3B (FTC, 2023)","Honda: $632K (CA AG, 2024)"] },
  "124":{ name:"Canada",         flag:"🇨🇦", status:"comprehensive",  law:"PIPEDA + Quebec Law 25",                          regulator:"OPC + Quebec CAI",              year:2000, region:"Americas",             slug:"canada",         rights:["Access & correction","Consent withdrawal","Breach notification"], fines:["Meta: CAD 9M (OPC, 2024)"] },
  "076":{ name:"Brazil",         flag:"🇧🇷", status:"comprehensive",  law:"LGPD",                                            regulator:"ANPD",                          year:2020, region:"Americas",             slug:"brazil",         rights:["Access, correction, deletion","Data portability","Opt-out of processing"], fines:["Telemarketing co: R$14.4M (2024)"] },
  "484":{ name:"Mexico",         flag:"🇲🇽", status:"sector",         law:"LFPDPPP (private sector only)",                   regulator:"INAI",                          year:2010, region:"Americas",             slug:"mexico",         rights:["ARCO rights (Access, Rectification, Cancellation, Opposition)"], fines:[] },
  "032":{ name:"Argentina",      flag:"🇦🇷", status:"comprehensive",  law:"PDPA Law 25,326 (reform pending)",                regulator:"AAIP",                          year:2000, region:"Americas",             slug:"argentina",      rights:["Access, correction, deletion","Habeas data"], fines:[] },
  "152":{ name:"Chile",          flag:"🇨🇱", status:"proposed",       law:"New Data Protection Bill (in reform)",            regulator:"New DPA (pending)",             year:null, region:"Americas",             slug:"chile",          rights:["Comprehensive bill under congressional review"], fines:[] },
  "170":{ name:"Colombia",       flag:"🇨🇴", status:"partial",        law:"Law 1581 of 2012",                                regulator:"SIC",                           year:2012, region:"Americas",             slug:"colombia",       rights:["Access, correction, deletion, opposition"], fines:[] },
  "858":{ name:"Uruguay",        flag:"🇺🇾", status:"comprehensive",  law:"PDPA 18.331",                                     regulator:"URCDP",                         year:2008, region:"Americas",             slug:"uruguay",        rights:["Access, correction, deletion","Habeas data"], fines:[] },
  "604":{ name:"Peru",           flag:"🇵🇪", status:"partial",        law:"Personal Data Protection Law 29733",              regulator:"ANPD Peru",                     year:2011, region:"Americas",             slug:"peru",           rights:["Access, correction, deletion","Opposition"], fines:[] },

  // ── Europe ──
  "826":{ name:"United Kingdom", flag:"🇬🇧", status:"comprehensive",  law:"UK GDPR + Data (Use & Access) Act 2025",          regulator:"ICO",                           year:2018, region:"Europe",              slug:"united-kingdom", rights:["Access, rectification, erasure","Data portability","Object to processing"], fines:["LastPass: £1.2M (ICO, 2025)","Clearview AI: £7.5M (2023)"] },
  "276":{ name:"Germany",        flag:"🇩🇪", status:"comprehensive",  law:"GDPR + BDSG",                                     regulator:"BfDI + 16 State DPAs",         year:2018, region:"Europe",              slug:"germany",        rights:["Full GDPR rights","Right to erasure","Data portability"], fines:["Meta: €1.2B (DPC/EDPB, 2023)"] },
  "250":{ name:"France",         flag:"🇫🇷", status:"comprehensive",  law:"GDPR + French Data Protection Act",               regulator:"CNIL",                          year:2018, region:"Europe",              slug:"france",         rights:["Full GDPR rights","Right to know","Right to object"], fines:["Clearview AI: €20M (CNIL, 2026)","Google: €150M (2022)"] },
  "380":{ name:"Italy",          flag:"🇮🇹", status:"comprehensive",  law:"GDPR + Codice Privacy",                           regulator:"Garante",                       year:2018, region:"Europe",              slug:"italy",          rights:["Full GDPR rights"], fines:["OpenAI: €15M (Garante, 2024)","Meta: €390M (2023)"] },
  "724":{ name:"Spain",          flag:"🇪🇸", status:"comprehensive",  law:"GDPR + LOPDGDD",                                  regulator:"AEPD",                          year:2018, region:"Europe",              slug:"spain",          rights:["Full GDPR rights"], fines:["CaixaBank: €6.2M (AEPD, 2026)"] },
  "528":{ name:"Netherlands",    flag:"🇳🇱", status:"comprehensive",  law:"GDPR + UAVG",                                     regulator:"Autoriteit Persoonsgegevens",   year:2018, region:"Europe",              slug:"netherlands",    rights:["Full GDPR rights"], fines:["Uber: €290M (AP, 2023)"] },
  "372":{ name:"Ireland",        flag:"🇮🇪", status:"comprehensive",  law:"GDPR + Data Protection Act 2018",                 regulator:"DPC",                           year:2018, region:"Europe",              slug:"ireland",        rights:["Full GDPR rights"], fines:["Meta: €1.2B (2023)","WhatsApp: €225M (2021)"] },
  "752":{ name:"Sweden",         flag:"🇸🇪", status:"comprehensive",  law:"GDPR + Swedish DPA Act",                          regulator:"IMY",                           year:2018, region:"Europe",              slug:"sweden",         rights:["Full GDPR rights"], fines:["Spotify: SEK 58M (IMY, 2023)"] },
  "578":{ name:"Norway",         flag:"🇳🇴", status:"comprehensive",  law:"GDPR (EEA) + Personal Data Act",                  regulator:"Datatilsynet",                  year:2018, region:"Europe",              slug:"norway",         rights:["Full GDPR rights"], fines:["Grindr: NOK 65M (2022)"] },
  "756":{ name:"Switzerland",    flag:"🇨🇭", status:"comprehensive",  law:"nFADP (Revised Federal Act on Data Protection)",  regulator:"FDPIC",                         year:2023, region:"Europe",              slug:"switzerland",    rights:["Right of access","Erasure","Data portability"], fines:[] },
  "616":{ name:"Poland",         flag:"🇵🇱", status:"comprehensive",  law:"GDPR + Polish Data Protection Act",               regulator:"UODO",                          year:2018, region:"Europe",              slug:"poland",         rights:["Full GDPR rights"], fines:[] },
  "056":{ name:"Belgium",        flag:"🇧🇪", status:"comprehensive",  law:"GDPR + Belgian DPA Act",                          regulator:"GBA / APD",                     year:2018, region:"Europe",              slug:"belgium",        rights:["Full GDPR rights"], fines:["IAB Europe: €250K (2022)"] },
  "792":{ name:"Turkey",         flag:"🇹🇷", status:"comprehensive",  law:"KVKK (Law No. 6698)",                             regulator:"KVKK Board",                    year:2016, region:"Europe",              slug:"turkey",         rights:["Access, correction, deletion","Object to processing","Automated decision opt-out"], fines:[] },
  "643":{ name:"Russia",         flag:"🇷🇺", status:"partial",        law:"Federal Law No. 152-FZ",                          regulator:"Roskomnadzor",                  year:2006, region:"Europe",              slug:"russia",         rights:["Access & correction","Deletion","Data localization required"], fines:[] },
  "040":{ name:"Austria",        flag:"🇦🇹", status:"comprehensive",  law:"GDPR + DSG",                                      regulator:"DSB",                           year:2018, region:"Europe",              slug:"austria",        rights:["Full GDPR rights"], fines:[] },
  "100":{ name:"Bulgaria",       flag:"🇧🇬", status:"comprehensive",  law:"GDPR + PDPA Bulgaria",                            regulator:"CPDP",                          year:2018, region:"Europe",              slug:"bulgaria",       rights:["Full GDPR rights"], fines:[] },
  "191":{ name:"Croatia",        flag:"🇭🇷", status:"comprehensive",  law:"GDPR + DPA Croatia",                              regulator:"AZOP",                          year:2018, region:"Europe",              slug:"croatia",        rights:["Full GDPR rights"], fines:[] },
  "196":{ name:"Cyprus",         flag:"🇨🇾", status:"comprehensive",  law:"GDPR + DPA Cyprus",                               regulator:"Commissioner for PDPA",         year:2018, region:"Europe",              slug:"cyprus",         rights:["Full GDPR rights"], fines:[] },
  "203":{ name:"Czech Republic", flag:"🇨🇿", status:"comprehensive",  law:"GDPR + Act No. 110/2019",                         regulator:"UOOU",                          year:2018, region:"Europe",              slug:"czech-republic", rights:["Full GDPR rights"], fines:[] },
  "208":{ name:"Denmark",        flag:"🇩🇰", status:"comprehensive",  law:"GDPR + Danish DPA Act",                           regulator:"Datatilsynet DK",               year:2018, region:"Europe",              slug:"denmark",        rights:["Full GDPR rights"], fines:[] },
  "233":{ name:"Estonia",        flag:"🇪🇪", status:"comprehensive",  law:"GDPR + PDPA Estonia",                             regulator:"AKI",                           year:2018, region:"Europe",              slug:"estonia",        rights:["Full GDPR rights"], fines:[] },
  "246":{ name:"Finland",        flag:"🇫🇮", status:"comprehensive",  law:"GDPR + Data Protection Act Finland",              regulator:"Tietosuojavaltuutettu",         year:2018, region:"Europe",              slug:"finland",        rights:["Full GDPR rights"], fines:[] },
  "300":{ name:"Greece",         flag:"🇬🇷", status:"comprehensive",  law:"GDPR + Law 4624/2019",                            regulator:"HDPA",                          year:2018, region:"Europe",              slug:"greece",         rights:["Full GDPR rights"], fines:[] },
  "348":{ name:"Hungary",        flag:"🇭🇺", status:"comprehensive",  law:"GDPR + Infotv.",                                  regulator:"NAIH",                          year:2018, region:"Europe",              slug:"hungary",        rights:["Full GDPR rights"], fines:[] },
  "428":{ name:"Latvia",         flag:"🇱🇻", status:"comprehensive",  law:"GDPR + PDPL Latvia",                              regulator:"DVI",                           year:2018, region:"Europe",              slug:"latvia",         rights:["Full GDPR rights"], fines:[] },
  "440":{ name:"Lithuania",      flag:"🇱🇹", status:"comprehensive",  law:"GDPR + LEGALPDP",                                 regulator:"VDAI",                          year:2018, region:"Europe",              slug:"lithuania",      rights:["Full GDPR rights"], fines:[] },
  "442":{ name:"Luxembourg",     flag:"🇱🇺", status:"comprehensive",  law:"GDPR + DPA Luxembourg",                           regulator:"CNPD Luxembourg",               year:2018, region:"Europe",              slug:"luxembourg",     rights:["Full GDPR rights"], fines:["Amazon: €746M (CNPD, 2021)"] },
  "470":{ name:"Malta",          flag:"🇲🇹", status:"comprehensive",  law:"GDPR + DPA Malta",                                regulator:"IDPC",                          year:2018, region:"Europe",              slug:"malta",          rights:["Full GDPR rights"], fines:[] },
  "620":{ name:"Portugal",       flag:"🇵🇹", status:"comprehensive",  law:"GDPR + Law 58/2019",                              regulator:"CNPD Portugal",                 year:2018, region:"Europe",              slug:"portugal",       rights:["Full GDPR rights"], fines:[] },
  "642":{ name:"Romania",        flag:"🇷🇴", status:"comprehensive",  law:"GDPR + Law 190/2018",                             regulator:"ANSPDCP",                       year:2018, region:"Europe",              slug:"romania",        rights:["Full GDPR rights"], fines:[] },
  "703":{ name:"Slovakia",       flag:"🇸🇰", status:"comprehensive",  law:"GDPR + Act No. 18/2018",                          regulator:"UOOU Slovakia",                 year:2018, region:"Europe",              slug:"slovakia",       rights:["Full GDPR rights"], fines:[] },
  "705":{ name:"Slovenia",       flag:"🇸🇮", status:"comprehensive",  law:"GDPR + ZVOP-2",                                   regulator:"IP RS",                         year:2018, region:"Europe",              slug:"slovenia",       rights:["Full GDPR rights"], fines:[] },

  // ── Asia-Pacific ──
  "036":{ name:"Australia",      flag:"🇦🇺", status:"comprehensive",  law:"Privacy Act 1988 (reformed 2024)",                regulator:"OAIC",                          year:1988, region:"Asia-Pacific",        slug:"australia",      rights:["Access & correction","Complaint rights","Marketing opt-out"], fines:["Aust. Clinical Labs: AUD 5.8M (2025)"] },
  "554":{ name:"New Zealand",    flag:"🇳🇿", status:"comprehensive",  law:"Privacy Act 2020",                                regulator:"OPC NZ",                        year:2020, region:"Asia-Pacific",        slug:"new-zealand",    rights:["Access & correction","Breach notification","Cross-border rules"], fines:[] },
  "392":{ name:"Japan",          flag:"🇯🇵", status:"comprehensive",  law:"APPI",                                            regulator:"PPC",                           year:2003, region:"Asia-Pacific",        slug:"japan",          rights:["Access & correction","Opt-out of third-party disclosure","Use limitation"], fines:[] },
  "410":{ name:"South Korea",    flag:"🇰🇷", status:"comprehensive",  law:"PIPA",                                            regulator:"PIPC",                          year:2011, region:"Asia-Pacific",        slug:"south-korea",    rights:["Access, correction, deletion","Opt-out","Automated decision rights"], fines:["Google: KRW 69.2B (2022)","Meta: KRW 67.8B (2022)"] },
  "356":{ name:"India",          flag:"🇮🇳", status:"proposed",       law:"DPDP Act 2023 (rules pending)",                   regulator:"Data Protection Board (pending)",year:2023,region:"Asia-Pacific",       slug:"india",          rights:["Access & correction (once enacted)","Erasure","Grievance redressal"], fines:[] },
  "156":{ name:"China",          flag:"🇨🇳", status:"comprehensive",  law:"PIPL + DSL + Cybersecurity Law",                  regulator:"CAC / MPS / SAMR",              year:2021, region:"Asia-Pacific",        slug:"china",          rights:["Access, correction, deletion","Portability (limited)","Automated decision opt-out"], fines:["DiDi: CNY 8.026B (CAC, 2022)"] },
  "764":{ name:"Thailand",       flag:"🇹🇭", status:"partial",        law:"PDPA 2019",                                       regulator:"PDPC Thailand",                 year:2019, region:"Asia-Pacific",        slug:"thailand",       rights:["Access, correction, deletion","Object","Portability"], fines:[] },
  "360":{ name:"Indonesia",      flag:"🇮🇩", status:"partial",        law:"PDP Law 2022",                                    regulator:"Ministry of Comms + BSSN",      year:2022, region:"Asia-Pacific",        slug:"indonesia",      rights:["Access & correction","Deletion","Portability"], fines:[] },
  "458":{ name:"Malaysia",       flag:"🇲🇾", status:"partial",        law:"PDPA 2010 (reform pending)",                      regulator:"PDP Commissioner",              year:2010, region:"Asia-Pacific",        slug:"malaysia",       rights:["Access & correction","Opt-out of direct marketing"], fines:[] },
  "104":{ name:"Myanmar",        flag:"🇲🇲", status:"none",           law:"No comprehensive privacy law",                    regulator:"N/A",                           year:null, region:"Asia-Pacific",        slug:"myanmar",        rights:[], fines:[] },
  "704":{ name:"Vietnam",        flag:"🇻🇳", status:"partial",        law:"Decree 13/2023/ND-CP",                            regulator:"MPS / MIC",                     year:2023, region:"Asia-Pacific",        slug:"vietnam",        rights:["Access & correction","Erasure"], fines:[] },
  "608":{ name:"Philippines",    flag:"🇵🇭", status:"comprehensive",  law:"Data Privacy Act 2012",                           regulator:"NPC",                           year:2012, region:"Asia-Pacific",        slug:"philippines",    rights:["Access, correction, erasure","Object","Portability"], fines:[] },
  // Singapore is too small to render on 110m topojson — grid-only
  "SGP":{ name:"Singapore",      flag:"🇸🇬", status:"comprehensive",  law:"PDPA 2012",                                       regulator:"PDPC",                          year:2012, region:"Asia-Pacific",        slug:"singapore",      rights:["Access & correction","Consent withdrawal","Data portability"], fines:["RedMart/Lazada: SGD 74K (2021)"], gridOnly: true },

  // ── Africa & Middle East ──
  "710":{ name:"South Africa",   flag:"🇿🇦", status:"comprehensive",  law:"POPIA",                                           regulator:"Information Regulator",         year:2020, region:"Africa & Middle East", slug:"south-africa",   rights:["Access & correction","Objection","Breach notification"], fines:["TransUnion: ZAR 1M (2024)"] },
  "566":{ name:"Nigeria",        flag:"🇳🇬", status:"partial",        law:"Nigeria Data Protection Act 2023",                regulator:"NDPC",                          year:2023, region:"Africa & Middle East", slug:"nigeria",        rights:["Access, correction, erasure","Object to processing"], fines:[] },
  "404":{ name:"Kenya",          flag:"🇰🇪", status:"partial",        law:"Data Protection Act 2019",                        regulator:"ODPC",                          year:2019, region:"Africa & Middle East", slug:"kenya",          rights:["Access, correction, deletion","Object"], fines:[] },
  "784":{ name:"UAE",            flag:"🇦🇪", status:"partial",        law:"Federal PDPL + DIFC + ADGM",                      regulator:"UAE Data Office",               year:2021, region:"Africa & Middle East", slug:"uae",            rights:["Access & correction","Erasure","Objection"], fines:[] },
  "682":{ name:"Saudi Arabia",   flag:"🇸🇦", status:"partial",        law:"PDPL",                                            regulator:"SDAIA / NCA",                   year:2021, region:"Africa & Middle East", slug:"saudi-arabia",   rights:["Access, correction, deletion","Consent withdrawal"], fines:[] },
  "376":{ name:"Israel",         flag:"🇮🇱", status:"comprehensive",  law:"Protection of Privacy Law (amended 2023)",        regulator:"Privacy Protection Authority",  year:1981, region:"Africa & Middle East", slug:"israel",         rights:["Access & correction","Deletion from databases"], fines:[] },
  "818":{ name:"Egypt",          flag:"🇪🇬", status:"proposed",       law:"Personal Data Protection Law (draft)",            regulator:"TBA",                           year:null, region:"Africa & Middle East", slug:"egypt",          rights:["Draft under parliamentary review"], fines:[] },
  "504":{ name:"Morocco",        flag:"🇲🇦", status:"partial",        law:"Law 09-08",                                       regulator:"CNDP Morocco",                  year:2009, region:"Africa & Middle East", slug:"morocco",        rights:["Access & correction","Object to processing"], fines:[] },
  "288":{ name:"Ghana",          flag:"🇬🇭", status:"partial",        law:"Data Protection Act 2012",                        regulator:"DPC Ghana",                     year:2012, region:"Africa & Middle East", slug:"ghana",          rights:["Access, correction, erasure"], fines:[] },
};

export { JURISDICTIONS };

const REGIONS = ["All Regions", "Americas", "Europe", "Asia-Pacific", "Africa & Middle East"];

export default function GlobalPrivacyMap() {
  const svgRef      = useRef<SVGSVGElement>(null);
  const containerRef= useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [topoReady, setTopoReady] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [tooltip,   setTooltip]   = useState<any>(null);
  const [region,    setRegion]    = useState("All Regions");
  const [view,      setView]      = useState<"map" | "grid">("map");
  const [dims,      setDims]      = useState({ w: 860, h: 440 });

  // Load topojson CDN script
  useEffect(() => {
    if ((window as any).topojson) { setTopoReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
    s.onload = () => setTopoReady(true);
    document.head.appendChild(s);
  }, []);

  // Fetch world atlas GeoJSON
  useEffect(() => {
    if (!topoReady) return;
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(d => { setWorldData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topoReady]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setDims({ w, h: Math.round(w * 0.49) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // EFFECT 1: Draw the full map. Runs only when data/dims change. NOT on region change.
  useEffect(() => {
    if (!worldData || !topoReady || !svgRef.current) return;
    const topo = (window as any).topojson;
    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const proj = d3.geoNaturalEarth1().scale(w / 6.2).translate([w / 2, h / 2]);
    const path = d3.geoPath().projection(proj);
    const countries = topo.feature(worldData, worldData.objects.countries);
    const mesh      = topo.mesh(worldData, worldData.objects.countries,
                        (a: any, b: any) => a !== b);

    // Ocean background
    svg.append("path")
      .datum({ type: "Sphere" })
      .attr("d", path as any)
      .attr("fill", "#deeef8")
      .attr("stroke", "none");

    // Country paths
    svg.append("g").attr("class", "countries")
      .selectAll("path")
      .data((countries as any).features)
      .join("path")
      .attr("d", path as any)
      .attr("data-id", (d: any) => String(d.id))
      .attr("data-region", (d: any) => JURISDICTIONS[String(d.id)]?.region ?? "")
      .attr("fill", (d: any) => {
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur || jur.gridOnly) return "#c8d8e8";
        return STATUS_CONFIG[(jur.status ?? "none") as keyof typeof STATUS_CONFIG]?.color ?? "#c8d8e8";
      })
      .attr("opacity", 1)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4)
      .style("cursor", (d: any) => {
        const jur = JURISDICTIONS[String(d.id)];
        return (jur && !jur.gridOnly) ? "pointer" : "default";
      })
      .on("mouseenter", function(event: MouseEvent, d: any) {
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur || jur.gridOnly) return;
        const currentRegion = (svgRef.current as any)?._currentRegion ?? "All Regions";
        if (currentRegion !== "All Regions" && jur.region !== currentRegion) return;
        d3.select(this).attr("stroke", "#f59e0b").attr("stroke-width", 1.5).raise();
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip({ x: mx, y: my, jur });
      })
      .on("mousemove", function(event: MouseEvent) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip((t: any) => t ? { ...t, x: mx, y: my } : null);
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.4);
        setTooltip(null);
      })
      .on("click", function(_: any, d: any) {
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur || jur.gridOnly) return;
        const currentRegion = (svgRef.current as any)?._currentRegion ?? "All Regions";
        if (currentRegion !== "All Regions" && jur.region !== currentRegion) return;
        window.location.href = `/jurisdiction/${jur.slug}`;
      });

    // Country border mesh
    svg.append("path")
      .datum(mesh)
      .attr("d", path as any)
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4);

  }, [worldData, topoReady, dims]);

  // EFFECT 2: Update opacity only when region changes
  useEffect(() => {
    if (!svgRef.current) return;
    (svgRef.current as any)._currentRegion = region;

    const svg = d3.select(svgRef.current);
    svg.selectAll(".countries path").attr("opacity", function() {
      const el = this as SVGPathElement;
      const countryRegion = el.getAttribute("data-region") ?? "";
      const id = el.getAttribute("data-id") ?? "";
      if (region === "All Regions") return 1;
      if (!JURISDICTIONS[id]) return 0.1;
      return countryRegion === region ? 1 : 0.1;
    });
  }, [region]);

  const gridItems = Object.values(JURISDICTIONS)
    .filter((j: any) => region === "All Regions" || j.region === region)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <div>
      {/* View toggle + region chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                region === r
                  ? "bg-blue/10 text-blue border-blue/30"
                  : "bg-white text-slate border-fog hover:border-blue/20"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["map", "grid"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                view === v
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-slate border-fog hover:border-navy/20"
              }`}
            >
              {v === "map" ? "🗺 Map" : "⊞ Grid"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div ref={containerRef} className="min-w-0">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center bg-fog rounded-2xl text-slate text-sm animate-pulse">
              Loading map data…
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-eup-md border border-fog">
              <svg ref={svgRef} width={dims.w} height={dims.h} style={{ display: "block" }} />

              {tooltip && (
                <div
                  className="absolute pointer-events-none z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-eup-md text-xs"
                  style={{
                    left: Math.min(tooltip.x + 16, dims.w - 200),
                    top: Math.max(tooltip.y - 70, 8),
                    minWidth: 180,
                  }}
                >
                  <div className="font-bold text-[14px] mb-0.5">
                    <span className="flag-emoji">{tooltip.jur.flag}</span> {tooltip.jur.name}
                  </div>
                  <div className="text-blue-200 text-[10px] font-semibold uppercase tracking-wide mb-1">
                    {STATUS_CONFIG[tooltip.jur.status as keyof typeof STATUS_CONFIG]?.label}
                  </div>
                  <div className="text-blue-300 text-[11px] leading-snug">{tooltip.jur.law}</div>
                  <div className="text-blue-400 text-[10px] mt-1.5">Click to explore →</div>
                </div>
              )}

              <MapLegend />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {gridItems.map((j: any) => (
            <a
              key={j.slug}
              href={`/jurisdiction/${j.slug}`}
              className="bg-white rounded-xl border border-fog p-4 text-left hover:shadow-eup-sm hover:-translate-y-0.5 transition-all cursor-pointer no-underline block"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color,
              }}
            >
              <div className="text-2xl mb-1.5 flag-emoji">{j.flag}</div>
              <div className="font-bold text-navy text-[13px] leading-tight">{j.name}</div>
              <div className="text-[10px] text-slate mt-0.5">{j.region}</div>
              <div
                className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: `${STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color}18`,
                  color: STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color,
                }}
              >
                {STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.label}
              </div>
              {j.fines?.length > 0 && (
                <div className="text-[10px] text-orange-500 font-semibold mt-1.5">
                  ⚖️ {j.fines.length} fine{j.fines.length > 1 ? "s" : ""}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
