import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";

// ── Content-rich jurisdictions with lat/lon for highlighting ─────────────────
const RICH_JURISDICTIONS = [
  { name: "France",         flag: "🇫🇷", slug: "france",         lat: 46.6, lon: 2.2,    law: "GDPR",          regulator: "CNIL",        tagline: "CNIL has been one of Europe's most active enforcers." },
  { name: "Germany",        flag: "🇩🇪", slug: "germany",        lat: 51.2, lon: 10.4,   law: "GDPR + BDSG",   regulator: "BfDI",        tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Ireland",        flag: "🇮🇪", slug: "ireland",        lat: 53.4, lon: -8.2,   law: "GDPR",          regulator: "DPC",         tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "United Kingdom", flag: "🇬🇧", slug: "united-kingdom", lat: 55.4, lon: -3.4,   law: "UK GDPR",       regulator: "ICO",         tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },
  { name: "Spain",          flag: "🇪🇸", slug: "spain",          lat: 40.5, lon: -3.7,   law: "GDPR",          regulator: "AEPD",        tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Italy",          flag: "🇮🇹", slug: "italy",          lat: 41.9, lon: 12.6,   law: "GDPR",          regulator: "Garante",     tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Netherlands",    flag: "🇳🇱", slug: "netherlands",    lat: 52.1, lon: 5.3,    law: "GDPR",          regulator: "AP",          tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "United States",  flag: "🇺🇸", slug: "united-states",  lat: 37.1, lon: -95.7,  law: "19 state laws", regulator: "FTC",         tagline: "No federal law yet — but 19 states have comprehensive privacy acts." },
  { name: "Brazil",         flag: "🇧🇷", slug: "brazil",         lat: -14.2, lon: -51.9, law: "LGPD",          regulator: "ANPD",        tagline: "ANPD is establishing new transfer mechanisms for 2026." },
  { name: "Canada",         flag: "🇨🇦", slug: "canada",         lat: 56.1, lon: -106.3, law: "PIPEDA",        regulator: "OPC",         tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Australia",      flag: "🇦🇺", slug: "australia",      lat: -25.3, lon: 133.8, law: "Privacy Act",   regulator: "OAIC",        tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "Japan",          flag: "🇯🇵", slug: "japan",          lat: 36.2, lon: 138.3,  law: "APPI",          regulator: "PPC",         tagline: "Japan holds an EU adequacy decision — key for transfers." },
  { name: "South Korea",    flag: "🇰🇷", slug: "south-korea",    lat: 35.9, lon: 127.8,  law: "PIPA",          regulator: "PIPC",        tagline: "PIPC fined Google ₩69.2B in 2022 for consent violations." },
  { name: "China",          flag: "🇨🇳", slug: "china",          lat: 35.9, lon: 104.2,  law: "PIPL",          regulator: "CAC",         tagline: "PIPL applies extraterritorially to foreign companies processing Chinese data." },
  { name: "India",          flag: "🇮🇳", slug: "india",          lat: 20.6, lon: 79.0,   law: "DPDP Act",      regulator: "DPB",         tagline: "India's Data Protection Board is being established now." },
  { name: "South Africa",   flag: "🇿🇦", slug: "south-africa",   lat: -30.6, lon: 22.9,  law: "POPIA",         regulator: "IR",          tagline: "POPIA has been fully in force since 2021." },
  { name: "Israel",         flag: "🇮🇱", slug: "israel",         lat: 31.0, lon: 34.9,   law: "PPL",           regulator: "PPA",         tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "Turkey",         flag: "🇹🇷", slug: "turkey",         lat: 39.0, lon: 35.2,   law: "KVKK",          regulator: "KVKK",        tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Norway",         flag: "🇳🇴", slug: "norway",         lat: 60.5, lon: 8.5,    law: "GDPR (EEA)",    regulator: "Datatilsynet",tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Switzerland",    flag: "🇨🇭", slug: "switzerland",    lat: 46.8, lon: 8.2,    law: "nFADP",         regulator: "FDPIC",       tagline: "Switzerland's revised nFADP fully applies from September 2023." },
  { name: "Singapore",      flag: "🇸🇬", slug: "singapore",      lat: 1.4, lon: 103.8,   law: "PDPA",          regulator: "PDPC",        tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "New Zealand",    flag: "🇳🇿", slug: "new-zealand",    lat: -40.9, lon: 174.9, law: "Privacy Act",   regulator: "OPC NZ",      tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Poland",         flag: "🇵🇱", slug: "poland",         lat: 51.9, lon: 19.1,   law: "GDPR",          regulator: "UODO",        tagline: "UODO has issued several notable fines for GDPR violations." },
  { name: "Sweden",         flag: "🇸🇪", slug: "sweden",         lat: 60.1, lon: 18.6,   law: "GDPR",          regulator: "IMY",         tagline: "IMY fined Spotify SEK 58M in 2023 for DSAR response failures." },
];

type Phase = "idle" | "spinning" | "result";
type PickedJurisdiction = (typeof RICH_JURISDICTIONS)[number];

const R = 1.0;

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(lam),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(lam),
  );
}

// ── Build earth texture from TopoJSON ────────────────────────────────────────
function buildEarthCanvas(geojson: any): HTMLCanvasElement {
  const CW = 2048, CH = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d2744";
  ctx.fillRect(0, 0, CW, CH);

  const project = (lon: number, lat: number): [number, number] =>
    [(lon + 180) / 360 * CW, (90 - lat) / 180 * CH];

  const drawRing = (coords: number[][]) => {
    if (!coords || coords.length < 2) return;
    ctx.beginPath();
    let started = false, prevX: number | null = null;
    for (const [lon, lat] of coords) {
      const [x, y] = project(lon, lat);
      if (prevX !== null && Math.abs(x - prevX) > CW * 0.5) {
        ctx.fill(); ctx.stroke(); ctx.beginPath(); started = false;
      }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
      prevX = x;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };

  ctx.fillStyle = "#1a8a52";
  ctx.strokeStyle = "#145e38";
  ctx.lineWidth = 0.6;

  for (const f of geojson.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") drawRing(f.geometry.coordinates[0]);
    else if (f.geometry.type === "MultiPolygon")
      for (const poly of f.geometry.coordinates) drawRing(poly[0]);
  }

  // polar ice
  const iceN = ctx.createLinearGradient(0, 0, 0, CH * 0.12);
  iceN.addColorStop(0, "rgba(225,238,255,0.85)");
  iceN.addColorStop(1, "rgba(225,238,255,0)");
  ctx.fillStyle = iceN;
  ctx.fillRect(0, 0, CW, CH * 0.12);

  const iceS = ctx.createLinearGradient(0, CH * 0.88, 0, CH);
  iceS.addColorStop(0, "rgba(225,238,255,0)");
  iceS.addColorStop(1, "rgba(225,238,255,0.8)");
  ctx.fillStyle = iceS;
  ctx.fillRect(0, CH * 0.88, CW, CH * 0.12);

  return canvas;
}

export default function SpinTheGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    globe: THREE.Mesh;
    highlight: THREE.Mesh | null;
    pulseRing: THREE.Mesh | null;
  } | null>(null);
  const animRef = useRef(0);
  const spinRef = useRef(0.002);
  const starAnimRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<PickedJurisdiction | null>(null);

  // ── Build scene ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    el.style.position = "relative";
    const W = el.clientWidth || 380;
    const H = el.clientHeight || 380;

    // ── Twinkling star canvas (2D) ──────────────────────────────────────────
    const starCanvas = document.createElement("canvas");
    starCanvas.width = W * 2; starCanvas.height = H * 2;
    starCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;border-radius:9999px;";
    el.appendChild(starCanvas);

    const ctx2 = starCanvas.getContext("2d")!;
    const sW = starCanvas.width, sH = starCanvas.height;
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * sW,
      y: Math.random() * sH,
      r: Math.random() * 1.4 + 0.3,
      base: Math.random() * 0.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 2.5 + 1.2,
    }));

    let t = 0;
    function drawStars() {
      starAnimRef.current = requestAnimationFrame(drawStars);
      ctx2.clearRect(0, 0, sW, sH);
      t += 0.018;
      for (const s of stars) {
        const twinkle = Math.sin(t * s.speed + s.phase) * 0.5;
        const alpha = Math.max(0.05, Math.min(1, s.base + twinkle));
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(200,220,255,${alpha.toFixed(3)})`;
        ctx2.fill();
      }
    }
    drawStars();

    // ── Three.js renderer ───────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "position:relative;z-index:1;display:block;border-radius:9999px;";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.2, 3.2);
    camera.lookAt(0, 0, 0);

    // Globe mesh
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const globe = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshPhongMaterial({ color: new THREE.Color("#0d2744"), shininess: 40 }),
    );
    scene.add(globe);

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(R * 1.06, 64, 64);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.12,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Grid lines
    const wireGeo = new THREE.SphereGeometry(R * 1.001, 18, 18);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4a90d9, wireframe: true, transparent: true, opacity: 0.06,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    sceneRef.current = { renderer, scene, camera, globe, highlight: null, pulseRing: null };

    // ── Load land masses from TopoJSON ──────────────────────────────────────
    (async () => {
      try {
        const [topoRes, topojs] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as string) as any,
        ]);
        const topo = await topoRes.json();
        const geojson = topojs.feature(topo, topo.objects.countries);
        const earthCanvas = buildEarthCanvas(geojson);
        globe.material = new THREE.MeshPhongMaterial({
          map: new THREE.CanvasTexture(earthCanvas),
          shininess: 30,
        });
      } catch (e) {
        console.warn("SpinTheGlobe: land texture failed", e);
      }
    })();

    // ── Animation loop ──────────────────────────────────────────────────────
    let pulseT = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      globe.rotation.y += spinRef.current;

      // Pulse the highlight
      if (sceneRef.current?.highlight) {
        pulseT += 0.04;
        const scale = 1 + Math.sin(pulseT) * 0.15;
        sceneRef.current.highlight.scale.set(scale, scale, scale);
        (sceneRef.current.highlight.material as THREE.MeshBasicMaterial).opacity =
          0.7 + Math.sin(pulseT * 1.5) * 0.3;
      }
      if (sceneRef.current?.pulseRing) {
        const ringScale = 1.2 + Math.sin(pulseT * 0.8) * 0.6;
        sceneRef.current.pulseRing.scale.set(ringScale, ringScale, ringScale);
        (sceneRef.current.pulseRing.material as THREE.MeshBasicMaterial).opacity =
          0.4 - Math.sin(pulseT * 0.8) * 0.3;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(starAnimRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(starCanvas)) el.removeChild(starCanvas);
    };
  }, []);

  // ── Add highlight dot when a country is picked ─────────────────────────────
  const addHighlight = useCallback((jur: PickedJurisdiction) => {
    const s = sceneRef.current;
    if (!s) return;

    // Remove previous highlight
    if (s.highlight) { s.scene.remove(s.highlight); s.highlight = null; }
    if (s.pulseRing) { s.scene.remove(s.pulseRing); s.pulseRing = null; }

    const pos = latLonToVec3(jur.lat, jur.lon, R * 1.01);

    // Glowing dot
    const dotGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(pos);
    s.globe.add(dot);
    s.highlight = dot;

    // Pulse ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.08, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    s.globe.add(ring);
    s.pulseRing = ring;

    // Rotate globe so the dot faces camera
    const targetLon = (-jur.lon * Math.PI) / 180;
    s.globe.rotation.y = targetLon;
  }, []);

  const removeHighlight = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (s.highlight) { s.globe.remove(s.highlight); s.highlight = null; }
    if (s.pulseRing) { s.globe.remove(s.pulseRing); s.pulseRing = null; }
  }, []);

  // ── Spin handler ──────────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("spinning");
    setPicked(null);
    removeHighlight();

    const pick = RICH_JURISDICTIONS[Math.floor(Math.random() * RICH_JURISDICTIONS.length)];

    const rampUp = setInterval(() => {
      spinRef.current = Math.min(spinRef.current + 0.004, 0.10);
    }, 30);

    setTimeout(() => {
      clearInterval(rampUp);
      const rampDown = setInterval(() => {
        spinRef.current = Math.max(spinRef.current - 0.003, 0.002);
        if (spinRef.current <= 0.003) {
          clearInterval(rampDown);
          spinRef.current = 0.001;
          addHighlight(pick);
          setPicked(pick);
          setPhase("result");
        }
      }, 40);
    }, 1400);
  }, [phase, addHighlight, removeHighlight]);

  const handleReset = useCallback(() => {
    removeHighlight();
    setPhase("idle");
    setPicked(null);
    spinRef.current = 0.002;
  }, [removeHighlight]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="font-display font-bold text-navy text-2xl mb-2">
          Feeling Curious?
        </h2>
        <p className="text-slate text-sm max-w-md mx-auto">
          Spin the globe and discover a jurisdiction you may not have been tracking.
          Every country has a story.
        </p>
      </div>

      <div
        ref={mountRef}
        className="relative rounded-full overflow-hidden cursor-pointer shadow-eup-lg bg-[#050d1a]"
        style={{ width: 380, height: 380 }}
        onClick={phase === "idle" ? handleSpin : undefined}
      />

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
