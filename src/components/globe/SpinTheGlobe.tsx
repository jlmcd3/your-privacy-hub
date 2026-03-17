import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";

const RICH_JURISDICTIONS = [
  { name: "France",        flag: "🇫🇷", slug: "france",         lat: 46.6,  lon: 2.2,    law: "GDPR",          regulator: "CNIL",        tagline: "CNIL has been one of Europe's most active data protection enforcers." },
  { name: "Germany",       flag: "🇩🇪", slug: "germany",        lat: 51.2,  lon: 10.4,   law: "GDPR + BDSG",   regulator: "BfDI",        tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Ireland",       flag: "🇮🇪", slug: "ireland",        lat: 53.4,  lon: -8.2,   law: "GDPR",          regulator: "DPC",         tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "United Kingdom",flag: "🇬🇧", slug: "united-kingdom", lat: 55.4,  lon: -3.4,   law: "UK GDPR",       regulator: "ICO",         tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },
  { name: "Spain",         flag: "🇪🇸", slug: "spain",          lat: 40.5,  lon: -3.7,   law: "GDPR",          regulator: "AEPD",        tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Italy",         flag: "🇮🇹", slug: "italy",          lat: 41.9,  lon: 12.6,   law: "GDPR",          regulator: "Garante",     tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Netherlands",   flag: "🇳🇱", slug: "netherlands",    lat: 52.1,  lon: 5.3,    law: "GDPR",          regulator: "AP",          tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "United States", flag: "🇺🇸", slug: "united-states",  lat: 37.1,  lon: -95.7,  law: "19 state laws", regulator: "FTC",         tagline: "No federal law yet — but 19 states have comprehensive privacy acts." },
  { name: "Brazil",        flag: "🇧🇷", slug: "brazil",         lat: -14.2, lon: -51.9,  law: "LGPD",          regulator: "ANPD",        tagline: "ANPD is establishing new international transfer mechanisms for 2026." },
  { name: "Canada",        flag: "🇨🇦", slug: "canada",         lat: 56.1,  lon: -106.3, law: "PIPEDA",        regulator: "OPC",         tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Australia",     flag: "🇦🇺", slug: "australia",      lat: -25.3, lon: 133.8,  law: "Privacy Act",   regulator: "OAIC",        tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "Japan",         flag: "🇯🇵", slug: "japan",          lat: 36.2,  lon: 138.3,  law: "APPI",          regulator: "PPC",         tagline: "Japan holds an EU adequacy decision — key for cross-border transfers." },
  { name: "South Korea",   flag: "🇰🇷", slug: "south-korea",    lat: 35.9,  lon: 127.8,  law: "PIPA",          regulator: "PIPC",        tagline: "PIPC fined Google and Meta billions of won in 2022." },
  { name: "China",         flag: "🇨🇳", slug: "china",          lat: 35.9,  lon: 104.2,  law: "PIPL",          regulator: "CAC",         tagline: "PIPL applies extraterritorially to any foreign company processing Chinese data." },
  { name: "India",         flag: "🇮🇳", slug: "india",          lat: 20.6,  lon: 79.0,   law: "DPDP Act",      regulator: "DPB",         tagline: "India's Data Protection Board is being constituted now." },
  { name: "South Africa",  flag: "🇿🇦", slug: "south-africa",   lat: -30.6, lon: 22.9,   law: "POPIA",         regulator: "Info Reg.",   tagline: "POPIA has been fully in force since 2021." },
  { name: "Israel",        flag: "🇮🇱", slug: "israel",         lat: 31.0,  lon: 34.9,   law: "PPL",           regulator: "PPA",         tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "Turkey",        flag: "🇹🇷", slug: "turkey",         lat: 39.0,  lon: 35.2,   law: "KVKK",          regulator: "KVKK",        tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Norway",        flag: "🇳🇴", slug: "norway",         lat: 60.5,  lon: 8.5,    law: "GDPR (EEA)",    regulator: "Datatilsynet",tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Switzerland",   flag: "🇨🇭", slug: "switzerland",    lat: 46.8,  lon: 8.2,    law: "nFADP",         regulator: "FDPIC",       tagline: "Switzerland's revised nFADP has fully applied since September 2023." },
  { name: "Singapore",     flag: "🇸🇬", slug: "singapore",      lat: 1.4,   lon: 103.8,  law: "PDPA",          regulator: "PDPC",        tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "New Zealand",   flag: "🇳🇿", slug: "new-zealand",    lat: -40.9, lon: 174.9,  law: "Privacy Act",   regulator: "OPC NZ",      tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Poland",        flag: "🇵🇱", slug: "poland",         lat: 51.9,  lon: 19.1,   law: "GDPR",          regulator: "UODO",        tagline: "UODO has issued several notable GDPR fines in recent years." },
  { name: "Sweden",        flag: "🇸🇪", slug: "sweden",         lat: 60.1,  lon: 18.6,   law: "GDPR",          regulator: "IMY",         tagline: "IMY fined Spotify SEK 58M in 2023 for DSAR response failures." },
];

type Phase = "idle" | "spinning" | "result";
type Jurisdiction = typeof RICH_JURISDICTIONS[number];

// Convert lat/lon to a unit 3D vector on a sphere of radius r
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (lat  * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(lam),
  );
}

// ── Canvas earth texture (pure local, zero external deps) ─────────────────
async function buildEarthTexture(): Promise<THREE.Texture> {
  const CW = 2048, CH = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  // Ocean base
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, CH);
  oceanGrad.addColorStop(0,   "#0a1e3a");
  oceanGrad.addColorStop(0.5, "#0d2744");
  oceanGrad.addColorStop(1,   "#071629");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, CW, CH);

  const project = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * CW,
    ((90 - lat)  / 180) * CH,
  ];

  const drawRing = (coords: number[][]) => {
    if (!coords || coords.length < 3) return;
    ctx.beginPath();
    let prevX: number | null = null;
    let started = false;
    for (const [lon, lat] of coords) {
      const [x, y] = project(lon, lat);
      if (prevX !== null && Math.abs(x - prevX) > CW * 0.4) {
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); started = false;
      }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
      prevX = x;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };

  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
      { mode: "cors" }
    );
    const topo = await res.json();

    // Minimal topojson feature extraction (no external lib needed)
    const arcs: number[][][] = topo.arcs;
    const scale = topo.transform?.scale  ?? [1, 1];
    const translate = topo.transform?.translate ?? [0, 0];

    function decodeArc(arcIdx: number): number[][] {
      const reversed = arcIdx < 0;
      const idx = reversed ? ~arcIdx : arcIdx;
      const raw = arcs[idx];
      const pts: number[][] = [];
      let x = 0, y = 0;
      for (const [dx, dy] of raw) {
        x += dx; y += dy;
        pts.push([
          x * scale[0] + translate[0],
          y * scale[1] + translate[1],
        ]);
      }
      return reversed ? pts.reverse() : pts;
    }

    function topoRings(geometry: any): number[][][] {
      if (geometry.type === "Polygon")
        return geometry.arcs.map((ring: number[]) =>
          ring.flatMap((a: number) => decodeArc(a))
        );
      if (geometry.type === "MultiPolygon")
        return geometry.arcs.flatMap((poly: number[][]) =>
          poly.map((ring: number[]) => ring.flatMap((a: number) => decodeArc(a)))
        );
      return [];
    }

    // Land fill — site accent green
    ctx.fillStyle   = "#1e7d4a";
    ctx.strokeStyle = "#145e38";
    ctx.lineWidth   = 0.8;

    for (const geo of topo.objects.countries.geometries) {
      for (const ring of topoRings(geo)) drawRing(ring);
    }

    // Country borders — slightly lighter
    ctx.strokeStyle = "#25a060";
    ctx.lineWidth   = 0.5;
    ctx.fillStyle   = "rgba(0,0,0,0)";
    for (const geo of topo.objects.countries.geometries) {
      for (const ring of topoRings(geo)) drawRing(ring);
    }
  } catch {
    // Fallback: draw rough continents as ellipses
    ctx.fillStyle = "#1e7d4a";
    const continents = [
      [0.12,0.3, 0.10,0.22],
      [0.14,0.58,0.06,0.15],
      [0.45,0.28,0.08,0.18],
      [0.50,0.38,0.12,0.22],
      [0.64,0.28,0.18,0.20],
      [0.84,0.58,0.08,0.12],
    ];
    for (const [cx, cy, rx, ry] of continents) {
      ctx.beginPath();
      ctx.ellipse(cx*CW, cy*CH, rx*CW, ry*CH, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Atmospheric haze at edges
  const limb = ctx.createRadialGradient(CW/2, CH/2, CH*0.3, CW/2, CH/2, CH*0.6);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(1, "rgba(0,10,30,0.35)");
  ctx.fillStyle = limb;
  ctx.fillRect(0, 0, CW, CH);

  // Polar ice caps
  const iceN = ctx.createLinearGradient(0, 0, 0, CH * 0.14);
  iceN.addColorStop(0, "rgba(220,235,255,0.90)");
  iceN.addColorStop(1, "rgba(220,235,255,0.00)");
  ctx.fillStyle = iceN; ctx.fillRect(0, 0, CW, CH * 0.14);

  const iceS = ctx.createLinearGradient(0, CH * 0.86, 0, CH);
  iceS.addColorStop(0, "rgba(220,235,255,0.00)");
  iceS.addColorStop(1, "rgba(220,235,255,0.85)");
  ctx.fillStyle = iceS; ctx.fillRect(0, CH * 0.86, CW, CH * 0.14);

  return new THREE.CanvasTexture(canvas);
}

// ── Star field (Three.js Points — renders INSIDE the 3D scene) ────────────
function buildStarField(): {
  points: THREE.Points;
  twinkleData: Float32Array;
  twinklePhases: Float32Array;
  twinkleSpeeds: Float32Array;
} {
  const N = 2000;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const twinkleData   = new Float32Array(N);
  const twinklePhases = new Float32Array(N);
  const twinkleSpeeds = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 45 + Math.random() * 15;
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);

    const warm = Math.random();
    colors[i*3]   = 0.75 + warm * 0.25;
    colors[i*3+1] = 0.80 + warm * 0.15;
    colors[i*3+2] = 0.90 + (1-warm)*0.10;

    twinklePhases[i] = Math.random() * Math.PI * 2;
    twinkleSpeeds[i] = 0.5 + Math.random() * 2.5;
    twinkleData[i]   = 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size:         0.22,
    vertexColors: true,
    transparent:  true,
    opacity:      1.0,
    sizeAttenuation: true,
  });

  return { points: new THREE.Points(geo, mat), twinkleData, twinklePhases, twinkleSpeeds };
}

// ── Update star twinkling each frame ─────────────────────────────────────
function tickStars(
  points: THREE.Points,
  twinkleData: Float32Array,
  twinklePhases: Float32Array,
  twinkleSpeeds: Float32Array,
  t: number,
) {
  const colors = (points.geometry.getAttribute("color") as THREE.BufferAttribute).array as Float32Array;
  const N = twinkleData.length;
  for (let i = 0; i < N; i++) {
    const bright = 0.45 + Math.sin(t * twinkleSpeeds[i] + twinklePhases[i]) * 0.40;
    twinkleData[i] = Math.max(0.05, Math.min(1, bright));
    const base = colors[i*3];
    colors[i*3]   = base * twinkleData[i];
    colors[i*3+1] = (0.80 + (colors[i*3+1] - colors[i*3+1])) * twinkleData[i];
    colors[i*3+2] = 0.90 * twinkleData[i];
  }
  (points.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
}

export default function SpinTheGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef     = useRef<THREE.Mesh | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const starsRef     = useRef<{
    points: THREE.Points;
    twinkleData: Float32Array;
    twinklePhases: Float32Array;
    twinkleSpeeds: Float32Array;
  } | null>(null);
  const markerRef    = useRef<THREE.Mesh | null>(null);
  const markerRingRef= useRef<THREE.Mesh | null>(null);
  const markerLightRef=useRef<THREE.PointLight | null>(null);
  const animRef      = useRef(0);
  const spinRef      = useRef(0.002);
  const pulseRef     = useRef(0);
  const clockRef     = useRef(0);

  const [phase,  setPhase]  = useState<Phase>("idle");
  const [picked, setPicked] = useState<Jurisdiction | null>(null);
  const [texLoaded, setTexLoaded] = useState(false);

  // ── Build scene once on mount ──────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 380;
    const H = el.clientHeight || 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;border-radius:9999px;";
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0.15, 3.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Star field (3D, inside scene) ─────────────────────────────────
    const starField = buildStarField();
    starsRef.current = starField;
    scene.add(starField.points);

    // ── Globe mesh ────────────────────────────────────────────────────
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color("#0d2744"),
        shininess: 20,
      }),
    );
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere backglow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x2a6bbf,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.10,
      }),
    ));

    // Subtle latitude/longitude grid
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.002, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0x4a90d9,
        wireframe: true,
        transparent: true,
        opacity: 0.055,
      }),
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8e8, 1.0);
    sun.position.set(5, 3, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x203060, 0.3);
    fill.position.set(-4, -1, -3);
    scene.add(fill);

    // ── Load earth texture ────────────────────────────────────────────
    buildEarthTexture().then((tex) => {
      if (globeRef.current) {
        globeRef.current.material = new THREE.MeshPhongMaterial({
          map: tex,
          shininess: 18,
          specular: new THREE.Color(0x112244),
        });
        setTexLoaded(true);
      }
    });

    // ── Animation loop ────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      frame++;
      clockRef.current += 0.016;

      // Globe rotation
      if (globeRef.current) {
        globeRef.current.rotation.y += spinRef.current;
      }

      // Stars twinkling — update every 2 frames for perf
      if (frame % 2 === 0 && starsRef.current) {
        tickStars(
          starsRef.current.points,
          starsRef.current.twinkleData,
          starsRef.current.twinklePhases,
          starsRef.current.twinkleSpeeds,
          clockRef.current,
        );
      }

      // Marker pulse animation
      pulseRef.current += 0.05;
      if (markerRef.current) {
        const s = 1.0 + Math.sin(pulseRef.current) * 0.35;
        markerRef.current.scale.set(s, s, s);
        (markerRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.75 + Math.sin(pulseRef.current * 1.3) * 0.25;
      }
      if (markerRingRef.current) {
        const rs = 1.0 + ((pulseRef.current * 0.3) % 1.0);
        markerRingRef.current.scale.set(rs, rs, rs);
        (markerRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, 0.5 - ((pulseRef.current * 0.3) % 1.0) * 0.5);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Highlight a jurisdiction on the globe ──────────────────────────────
  const addHighlight = useCallback((jur: Jurisdiction) => {
    const globe = globeRef.current;
    const scene = sceneRef.current;
    if (!globe || !scene) return;

    // Remove old marker
    if (markerRef.current)     { globe.remove(markerRef.current);     markerRef.current = null; }
    if (markerRingRef.current) { globe.remove(markerRingRef.current); markerRingRef.current = null; }
    if (markerLightRef.current){ globe.remove(markerLightRef.current);markerLightRef.current = null; }

    const pos = latLonToVec3(jur.lat, jur.lon, 1.05);

    // Bright amber dot — large enough to see clearly
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 }),
    );
    dot.position.copy(pos);
    globe.add(dot);
    markerRef.current = dot;

    // Expanding ring around the dot
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.10, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0).negate());
    globe.add(ring);
    markerRingRef.current = ring;

    // Point light at marker position
    const light = new THREE.PointLight(0xf59e0b, 1.2, 1.0);
    light.position.copy(pos);
    globe.add(light);
    markerLightRef.current = light;

    // Rotate globe so selected country faces camera & stop rotation
    globe.rotation.y = (-jur.lon * Math.PI) / 180;
    spinRef.current = 0;
    pulseRef.current = 0;
  }, []);

  const removeHighlight = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (markerRef.current)     { globe.remove(markerRef.current);     markerRef.current = null; }
    if (markerRingRef.current) { globe.remove(markerRingRef.current); markerRingRef.current = null; }
    if (markerLightRef.current){ globe.remove(markerLightRef.current);markerLightRef.current = null; }
  }, []);

  // ── Spin handler ───────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("spinning");
    setPicked(null);
    removeHighlight();

    const pick = RICH_JURISDICTIONS[Math.floor(Math.random() * RICH_JURISDICTIONS.length)];

    const rampUp = setInterval(() => {
      spinRef.current = Math.min(spinRef.current + 0.005, 0.12);
    }, 30);

    setTimeout(() => {
      clearInterval(rampUp);
      const rampDown = setInterval(() => {
        spinRef.current = Math.max(spinRef.current - 0.004, 0);
        if (spinRef.current <= 0) {
          clearInterval(rampDown);
          spinRef.current = 0;
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full flex flex-col items-center">

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display font-bold text-navy text-2xl mb-2">
          Feeling Curious?
        </h2>
        <p className="text-slate text-sm max-w-md mx-auto">
          Spin the globe and discover a jurisdiction you may not have been tracking.
          Every country has a story.
        </p>
      </div>

      {/* Globe container — dark background so stars have contrast */}
      <div
        ref={mountRef}
        className="relative rounded-full overflow-hidden shadow-eup-lg cursor-pointer"
        style={{
          width: 380, height: 380,
          background: "radial-gradient(circle at 35% 35%, #0d1f3c 0%, #050b18 70%, #020609 100%)",
        }}
        onClick={phase === "idle" ? handleSpin : undefined}
      />

      {/* Texture loading indicator */}
      {!texLoaded && (
        <p className="text-slate-light text-[10px] mt-1 animate-pulse">
          Loading map data…
        </p>
      )}

      {/* Controls */}
      <div className="mt-6 min-h-[180px] flex flex-col items-center justify-center w-full max-w-sm px-4">

        {phase === "idle" && (
          <button
            onClick={handleSpin}
            className="group relative overflow-hidden bg-gradient-to-br from-navy to-steel text-white font-bold text-[15px] px-10 py-4 rounded-2xl shadow-eup-md hover:shadow-eup-lg transition-all hover:-translate-y-0.5 cursor-pointer border-none w-full"
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
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
          <div className="w-full animate-fade-up">
            <div className="bg-white border border-fog rounded-2xl shadow-eup-md p-6 text-center w-full">

              {/* Flag */}
              <div className="text-5xl mb-2 leading-none">
                <span className="flag-emoji">{picked.flag}</span>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-light mb-1">
                The globe chose
              </div>
              <h3 className="font-display font-bold text-navy text-2xl mb-2">
                {picked.name}
              </h3>

              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">
                  {picked.law}
                </span>
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">
                  {picked.regulator}
                </span>
              </div>

              <p className="text-slate text-[13px] leading-relaxed mb-5 italic">
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
                  className="text-slate text-[13px] font-medium hover:text-navy transition-colors cursor-pointer bg-transparent border-none py-1"
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
