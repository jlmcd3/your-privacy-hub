import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

// ── Content-rich jurisdictions only ──────────────────────────────────────────
const RICH_JURISDICTIONS = [
  { name: "France",          flag: "🇫🇷", slug: "france",          region: "Europe",       law: "GDPR",          regulator: "CNIL",   tagline: "CNIL has been one of Europe's most active enforcers." },
  { name: "Germany",         flag: "🇩🇪", slug: "germany",         region: "Europe",       law: "GDPR + BDSG",   regulator: "BfDI",   tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Ireland",         flag: "🇮🇪", slug: "ireland",         region: "Europe",       law: "GDPR",          regulator: "DPC",    tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "United Kingdom",  flag: "🇬🇧", slug: "united-kingdom",  region: "Europe",       law: "UK GDPR",       regulator: "ICO",    tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },
  { name: "Spain",           flag: "🇪🇸", slug: "spain",           region: "Europe",       law: "GDPR",          regulator: "AEPD",   tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Italy",           flag: "🇮🇹", slug: "italy",           region: "Europe",       law: "GDPR",          regulator: "Garante",tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Netherlands",     flag: "🇳🇱", slug: "netherlands",     region: "Europe",       law: "GDPR",          regulator: "AP",     tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "United States",   flag: "🇺🇸", slug: "united-states",  region: "Americas",     law: "19 state laws", regulator: "FTC",    tagline: "No federal law yet — but 19 states have comprehensive privacy acts." },
  { name: "Brazil",          flag: "🇧🇷", slug: "brazil",          region: "Americas",     law: "LGPD",          regulator: "ANPD",   tagline: "ANPD is establishing new transfer mechanisms for 2026." },
  { name: "Canada",          flag: "🇨🇦", slug: "canada",          region: "Americas",     law: "PIPEDA",        regulator: "OPC",    tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Australia",       flag: "🇦🇺", slug: "australia",       region: "Asia-Pacific", law: "Privacy Act",   regulator: "OAIC",   tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "Japan",           flag: "🇯🇵", slug: "japan",           region: "Asia-Pacific", law: "APPI",          regulator: "PPC",    tagline: "Japan holds an EU adequacy decision — key for transfers." },
  { name: "South Korea",     flag: "🇰🇷", slug: "south-korea",     region: "Asia-Pacific", law: "PIPA",          regulator: "PIPC",   tagline: "PIPC fined Google ₩69.2B in 2022 for consent violations." },
  { name: "China",           flag: "🇨🇳", slug: "china",           region: "Asia-Pacific", law: "PIPL",          regulator: "CAC",    tagline: "PIPL applies extraterritorially to foreign companies processing Chinese data." },
  { name: "India",           flag: "🇮🇳", slug: "india",           region: "Asia-Pacific", law: "DPDP Act",      regulator: "DPB",    tagline: "India's Data Protection Board is being established now." },
  { name: "South Africa",    flag: "🇿🇦", slug: "south-africa",    region: "Africa & ME",  law: "POPIA",         regulator: "IR",     tagline: "POPIA has been fully in force since 2021." },
  { name: "Israel",          flag: "🇮🇱", slug: "israel",          region: "Africa & ME",  law: "PPL",           regulator: "PPA",    tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "Turkey",          flag: "🇹🇷", slug: "turkey",          region: "Europe",       law: "KVKK",          regulator: "KVKK",   tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Norway",          flag: "🇳🇴", slug: "norway",          region: "Europe",       law: "GDPR (EEA)",    regulator: "Datatilsynet", tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Switzerland",     flag: "🇨🇭", slug: "switzerland",     region: "Europe",       law: "nFADP",         regulator: "FDPIC",  tagline: "Switzerland's revised nFADP fully applies from September 2023." },
  { name: "Singapore",       flag: "🇸🇬", slug: "singapore",       region: "Asia-Pacific", law: "PDPA",          regulator: "PDPC",   tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "New Zealand",     flag: "🇳🇿", slug: "new-zealand",     region: "Asia-Pacific", law: "Privacy Act",   regulator: "OPC NZ", tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Poland",          flag: "🇵🇱", slug: "poland",          region: "Europe",       law: "GDPR",          regulator: "UODO",   tagline: "UODO has issued several notable fines for GDPR violations." },
  { name: "Sweden",          flag: "🇸🇪", slug: "sweden",          region: "Europe",       law: "GDPR",          regulator: "IMY",    tagline: "IMY fined Spotify SEK 58M in 2023 for DSAR response failures." },
];

type Phase = "idle" | "spinning" | "result";

interface PickedJurisdiction {
  name: string; flag: string; slug: string; region: string;
  law: string; regulator: string; tagline: string;
}

export default function SpinTheGlobe() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<any>(null);
  const animRef    = useRef<number>(0);
  const spinRef    = useRef(0.002);

  const [phase,  setPhase]  = useState<Phase>("idle");
  const [picked, setPicked] = useState<PickedJurisdiction | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load Three.js from CDN ─────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).THREE) { setLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);

  // ── Build Three.js scene ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !mountRef.current) return;
    const THREE = (window as any).THREE;
    const W = mountRef.current.clientWidth  || 520;
    const H = mountRef.current.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.z = 2.6;

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(3000);
    for (let i = 0; i < 3000; i++) {
      starPositions[i] = (Math.random() - 0.5) * 100;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat  = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 });
    const stars    = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Globe
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x0f2744,
      shininess: 60,
      specular: new THREE.Color(0x3d85c8),
    });
    const globe = new THREE.Mesh(globeGeo, oceanMat);
    scene.add(globe);

    // Land overlay
    const landGeo = new THREE.SphereGeometry(1.002, 64, 64);
    const landMat = new THREE.MeshPhongMaterial({
      color: 0x1a8a52,
      opacity: 0.25,
      transparent: true,
      shininess: 10,
    });
    const landOverlay = new THREE.Mesh(landGeo, landMat);
    scene.add(landOverlay);

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x3d85c8,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.12,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Grid lines
    const wireGeo = new THREE.SphereGeometry(1.001, 18, 18);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x3d85c8,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const rimLight = new THREE.DirectionalLight(0x3d85c8, 0.5);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    sceneRef.current = { renderer, scene, camera, globe, stars, landOverlay };

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      globe.rotation.y       += spinRef.current;
      landOverlay.rotation.y += spinRef.current;
      stars.rotation.y       += 0.00005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [loaded]);

  // ── Spin handler ──────────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("spinning");
    setPicked(null);

    const pick = RICH_JURISDICTIONS[Math.floor(Math.random() * RICH_JURISDICTIONS.length)];

    const rampUp = setInterval(() => {
      spinRef.current = Math.min(spinRef.current + 0.004, 0.10);
    }, 30);

    setTimeout(() => {
      clearInterval(rampUp);
      const rampDown = setInterval(() => {
        spinRef.current = Math.max(spinRef.current - 0.003, 0.003);
        if (spinRef.current <= 0.003) {
          clearInterval(rampDown);
          spinRef.current = 0.003;
          setPicked(pick);
          setPhase("result");
        }
      }, 40);
    }, 1400);
  }, [phase]);

  const handleReset = () => {
    setPhase("idle");
    setPicked(null);
    spinRef.current = 0.002;
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Section header */}
      <div className="text-center mb-6">
        <h2 className="font-display font-bold text-navy text-2xl mb-2">
          Feeling Curious?
        </h2>
        <p className="text-slate text-sm max-w-md mx-auto">
          Spin the globe and discover a jurisdiction you may not have been tracking.
          Every country has a story.
        </p>
      </div>

      {/* Globe canvas container */}
      <div
        ref={mountRef}
        className="relative rounded-full overflow-hidden cursor-pointer shadow-eup-lg"
        style={{ width: 380, height: 380 }}
        onClick={phase === "idle" ? handleSpin : undefined}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy rounded-full">
            <div className="w-8 h-8 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 min-h-[160px] flex flex-col items-center justify-center">
        {phase === "idle" && (
          <button
            onClick={handleSpin}
            className="group relative overflow-hidden bg-gradient-to-br from-navy to-steel text-white font-bold text-[15px] px-10 py-4 rounded-2xl shadow-eup-md hover:shadow-eup-lg transition-all hover:-translate-y-0.5 cursor-pointer border-none"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              <span className="text-xl">🌍</span>
              Spin the Globe
            </span>
            <div className="absolute inset-0 bg-gradient-to-br from-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {phase === "spinning" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-slate text-sm font-medium">The globe is choosing…</p>
          </div>
        )}

        {phase === "result" && picked && (
          <div className="flex flex-col items-center gap-4 animate-fade-up">
            <div className="bg-white border border-fog rounded-2xl shadow-eup-md p-6 max-w-sm text-center">
              <div className="text-5xl mb-3">{picked.flag}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate mb-1">
                The globe chose
              </div>
              <h3 className="font-display font-bold text-navy text-2xl mb-1">
                {picked.name}
              </h3>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">
                  {picked.law}
                </span>
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">
                  {picked.regulator}
                </span>
              </div>
              <p className="text-slate text-sm leading-relaxed mb-5 italic">
                "{picked.tagline}"
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/jurisdiction/${picked.slug}`}
                  className="block bg-gradient-to-br from-navy to-blue text-white font-bold text-sm py-3 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  See what's happening in {picked.name} →
                </Link>
                <button
                  onClick={handleReset}
                  className="text-slate text-sm font-medium hover:text-navy transition-colors cursor-pointer bg-transparent border-none py-1"
                >
                  ↩ Spin again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
