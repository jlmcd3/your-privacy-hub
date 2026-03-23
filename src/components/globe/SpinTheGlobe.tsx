import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";

const RICH_JURISDICTIONS = [
  { name: "France",         cc: "fr", slug: "france",         lat: 46.6,  lon: 2.2,    law: "GDPR",          regulator: "CNIL",         tagline: "CNIL has been one of Europe's most active data protection enforcers." },
  { name: "Germany",        cc: "de", slug: "germany",        lat: 51.2,  lon: 10.4,   law: "GDPR + BDSG",   regulator: "BfDI",         tagline: "Home to 16 state DPAs and landmark GDPR jurisprudence." },
  { name: "Ireland",        cc: "ie", slug: "ireland",        lat: 53.4,  lon: -8.2,   law: "GDPR",          regulator: "DPC",          tagline: "DPC oversees the EU operations of Meta, Apple, and Google." },
  { name: "United Kingdom", cc: "gb", slug: "united-kingdom", lat: 55.4,  lon: -3.4,   law: "UK GDPR",       regulator: "ICO",          tagline: "Post-Brexit privacy is evolving fast under the DUAA 2025." },
  { name: "Spain",          cc: "es", slug: "spain",          lat: 40.5,  lon: -3.7,   law: "GDPR",          regulator: "AEPD",         tagline: "AEPD issued one of the largest GDPR fines of 2026." },
  { name: "Italy",          cc: "it", slug: "italy",          lat: 41.9,  lon: 12.6,   law: "GDPR",          regulator: "Garante",      tagline: "Garante temporarily blocked ChatGPT in 2023 over GDPR concerns." },
  { name: "Netherlands",    cc: "nl", slug: "netherlands",    lat: 52.1,  lon: 5.3,    law: "GDPR",          regulator: "AP",           tagline: "AP fined Uber €290M for improper EU–US data transfers." },
  { name: "Belgium",        cc: "be", slug: "belgium",        lat: 50.8,  lon: 4.4,    law: "GDPR",          regulator: "APD/GBA",      tagline: "APD hosts the EDPB secretariat in Brussels." },
  { name: "Austria",        cc: "at", slug: "austria",        lat: 47.5,  lon: 14.6,   law: "GDPR",          regulator: "DSB",          tagline: "DSB issued the landmark Google Analytics ruling under GDPR." },
  { name: "Denmark",        cc: "dk", slug: "denmark",        lat: 56.3,  lon: 9.5,    law: "GDPR",          regulator: "Datatilsynet", tagline: "Datatilsynet enforces strict rules on employee monitoring." },
  { name: "Finland",        cc: "fi", slug: "finland",        lat: 61.9,  lon: 25.7,   law: "GDPR",          regulator: "Tietosuojavaltuutettu", tagline: "Finland's DPA focuses heavily on telecom and health data." },
  { name: "Portugal",       cc: "pt", slug: "portugal",       lat: 39.4,  lon: -8.2,   law: "GDPR",          regulator: "CNPD",         tagline: "CNPD has been active in cookie consent enforcement." },
  { name: "Greece",         cc: "gr", slug: "greece",         lat: 39.1,  lon: 21.8,   law: "GDPR",          regulator: "HDPA",         tagline: "HDPA fined PwC €150K for unlawful employee data processing." },
  { name: "Czech Republic", cc: "cz", slug: "czech-republic", lat: 49.8,  lon: 15.5,   law: "GDPR",          regulator: "ÚOOÚ",         tagline: "Czech DPA focuses on public sector and CCTV compliance." },
  { name: "Romania",        cc: "ro", slug: "romania",        lat: 45.9,  lon: 24.9,   law: "GDPR",          regulator: "ANSPDCP",      tagline: "Romania's ANSPDCP has increased enforcement since 2022." },
  { name: "Hungary",        cc: "hu", slug: "hungary",        lat: 47.2,  lon: 19.5,   law: "GDPR",          regulator: "NAIH",         tagline: "NAIH oversees data protection and freedom of information." },
  { name: "Croatia",        cc: "hr", slug: "croatia",        lat: 45.1,  lon: 15.2,   law: "GDPR",          regulator: "AZOP",         tagline: "Croatia's AZOP is one of the newer EU DPAs." },
  { name: "Luxembourg",     cc: "lu", slug: "luxembourg",     lat: 49.8,  lon: 6.1,    law: "GDPR",          regulator: "CNPD",         tagline: "Luxembourg CNPD issued the record €746M Amazon GDPR fine." },
  { name: "United States",  cc: "us", slug: "united-states",  lat: 37.1,  lon: -95.7,  law: "19 state laws", regulator: "FTC",          tagline: "No federal law yet — but 19 states now have comprehensive privacy acts." },
  { name: "Brazil",         cc: "br", slug: "brazil",         lat: -14.2, lon: -51.9,  law: "LGPD",          regulator: "ANPD",         tagline: "ANPD is establishing new international transfer mechanisms for 2026." },
  { name: "Canada",         cc: "ca", slug: "canada",         lat: 56.1,  lon: -106.3, law: "PIPEDA",        regulator: "OPC",          tagline: "Bill C-27 is working its way through Parliament now." },
  { name: "Australia",      cc: "au", slug: "australia",      lat: -25.3, lon: 133.8,  law: "Privacy Act",   regulator: "OAIC",         tagline: "Major Privacy Act reforms took effect in 2024." },
  { name: "Japan",          cc: "jp", slug: "japan",          lat: 36.2,  lon: 138.3,  law: "APPI",          regulator: "PPC",          tagline: "Japan holds an EU adequacy decision — key for cross-border transfers." },
  { name: "South Korea",    cc: "kr", slug: "south-korea",    lat: 35.9,  lon: 127.8,  law: "PIPA",          regulator: "PIPC",         tagline: "PIPC fined Google and Meta billions of won in 2022." },
  { name: "China",          cc: "cn", slug: "china",          lat: 35.9,  lon: 104.2,  law: "PIPL",          regulator: "CAC",          tagline: "PIPL applies extraterritorially to any company processing Chinese data." },
  { name: "India",          cc: "in", slug: "india",          lat: 20.6,  lon: 79.0,   law: "DPDP Act",      regulator: "DPB",          tagline: "India's Data Protection Board is being constituted now." },
  { name: "South Africa",   cc: "za", slug: "south-africa",   lat: -30.6, lon: 22.9,   law: "POPIA",         regulator: "Info Reg.",    tagline: "POPIA has been fully in force since 2021." },
  { name: "Israel",         cc: "il", slug: "israel",         lat: 31.0,  lon: 34.9,   law: "PPL",           regulator: "PPA",          tagline: "Israel holds EU adequacy and is modernizing its 1981 privacy law." },
  { name: "Turkey",         cc: "tr", slug: "turkey",         lat: 39.0,  lon: 35.2,   law: "KVKK",          regulator: "KVKK",         tagline: "Turkey's KVKK closely mirrors GDPR." },
  { name: "Norway",         cc: "no", slug: "norway",         lat: 60.5,  lon: 8.5,    law: "GDPR (EEA)",    regulator: "Datatilsynet", tagline: "Datatilsynet fined Grindr NOK 65M for unlawful data sharing." },
  { name: "Switzerland",    cc: "ch", slug: "switzerland",    lat: 46.8,  lon: 8.2,    law: "nFADP",         regulator: "FDPIC",        tagline: "Switzerland's revised nFADP has fully applied since September 2023." },
  { name: "Singapore",      cc: "sg", slug: "singapore",      lat: 1.4,   lon: 103.8,  law: "PDPA",          regulator: "PDPC",         tagline: "Singapore's PDPA was one of Asia's first comprehensive privacy laws." },
  { name: "New Zealand",    cc: "nz", slug: "new-zealand",    lat: -40.9, lon: 174.9,  law: "Privacy Act",   regulator: "OPC NZ",       tagline: "New Zealand's 2020 Privacy Act introduced mandatory breach notification." },
  { name: "Poland",         cc: "pl", slug: "poland",         lat: 51.9,  lon: 19.1,   law: "GDPR",          regulator: "UODO",         tagline: "UODO has issued several notable GDPR fines in recent years." },
  { name: "Sweden",         cc: "se", slug: "sweden",         lat: 60.1,  lon: 18.6,   law: "GDPR",          regulator: "IMY",          tagline: "IMY fined Spotify SEK 58M in 2023 for DSAR response failures." },
  { name: "Argentina",      cc: "ar", slug: "argentina",      lat: -38.4, lon: -63.6,  law: "PDPL",          regulator: "AAIP",         tagline: "Argentina holds EU adequacy and is modernizing its data protection law." },
  { name: "Chile",          cc: "cl", slug: "chile",          lat: -35.7, lon: -71.5,  law: "Law 19.628",    regulator: "CPLT",         tagline: "Chile is overhauling its privacy law to align with GDPR standards." },
  { name: "Colombia",       cc: "co", slug: "colombia",       lat: 4.6,   lon: -74.3,  law: "Law 1581",      regulator: "SIC",          tagline: "SIC has been actively enforcing data protection since 2012." },
  { name: "Mexico",         cc: "mx", slug: "mexico",         lat: 23.6,  lon: -102.6, law: "LFPDPPP",       regulator: "INAI",         tagline: "INAI oversees both privacy and transparency in Mexico." },
  { name: "Peru",           cc: "pe", slug: "peru",           lat: -9.2,  lon: -75.0,  law: "Law 29733",     regulator: "ANPD",         tagline: "Peru's data protection authority is strengthening enforcement." },
  { name: "Uruguay",        cc: "uy", slug: "uruguay",        lat: -32.5, lon: -55.8,  law: "Law 18.331",    regulator: "URCDP",        tagline: "Uruguay holds EU adequacy — one of only two in Latin America." },
  { name: "Thailand",       cc: "th", slug: "thailand",       lat: 15.9,  lon: 100.9,  law: "PDPA",          regulator: "PDPC",         tagline: "Thailand's PDPA became fully enforceable in June 2022." },
  { name: "Vietnam",        cc: "vn", slug: "vietnam",        lat: 14.1,  lon: 108.3,  law: "PDPD",          regulator: "MPS",          tagline: "Vietnam's first comprehensive data protection decree took effect in 2023." },
  { name: "Malaysia",       cc: "my", slug: "malaysia",       lat: 4.2,   lon: 101.9,  law: "PDPA 2010",     regulator: "PDP Comm.",    tagline: "Malaysia is amending its PDPA to add mandatory breach notification." },
  { name: "Philippines",    cc: "ph", slug: "philippines",    lat: 12.9,  lon: 121.8,  law: "DPA 2012",      regulator: "NPC",          tagline: "NPC has been one of Southeast Asia's most active privacy regulators." },
  { name: "Indonesia",      cc: "id", slug: "indonesia",      lat: -0.8,  lon: 113.9,  law: "PDP Law",       regulator: "Kominfo",      tagline: "Indonesia passed its first comprehensive privacy law in 2022." },
  { name: "Taiwan",         cc: "tw", slug: "taiwan",         lat: 23.7,  lon: 121.0,  law: "PDPA",          regulator: "NDC",          tagline: "Taiwan amended its PDPA in 2023 to strengthen enforcement penalties." },
  { name: "UAE",            cc: "ae", slug: "uae",            lat: 23.4,  lon: 53.8,   law: "Federal PDPL",  regulator: "UAE DPO",      tagline: "UAE's federal data protection law came into force in 2022." },
  { name: "Saudi Arabia",   cc: "sa", slug: "saudi-arabia",   lat: 23.9,  lon: 45.1,   law: "PDPL",          regulator: "SDAIA",        tagline: "Saudi Arabia's PDPL takes full effect in September 2024." },
  { name: "Qatar",          cc: "qa", slug: "qatar",          lat: 25.4,  lon: 51.2,   law: "Law 13/2016",   regulator: "CDA",          tagline: "Qatar's data protection applies to the QFC and mainland." },
  { name: "Bahrain",        cc: "bh", slug: "bahrain",        lat: 26.0,  lon: 50.6,   law: "PDPL 2018",     regulator: "PDA",          tagline: "Bahrain was the first Gulf state to enact comprehensive privacy legislation." },
  { name: "Kenya",          cc: "ke", slug: "kenya",          lat: -0.02, lon: 37.9,   law: "DPA 2019",      regulator: "ODPC",         tagline: "Kenya's ODPC has been actively registering data controllers since 2022." },
  { name: "Nigeria",        cc: "ng", slug: "nigeria",        lat: 9.1,   lon: 8.7,    law: "NDPR/NDPA",     regulator: "NDPC",         tagline: "Nigeria established its Data Protection Commission in 2023." },
  { name: "Egypt",          cc: "eg", slug: "egypt",          lat: 26.8,  lon: 30.8,   law: "Law 151/2020",  regulator: "DPC",          tagline: "Egypt's data protection law covers both public and private sectors." },
  { name: "Ghana",          cc: "gh", slug: "ghana",          lat: 7.9,   lon: -1.0,   law: "DPA 2012",      regulator: "DPC",          tagline: "Ghana was one of the first African nations with data protection legislation." },
  { name: "Morocco",        cc: "ma", slug: "morocco",        lat: 31.8,  lon: -7.1,   law: "Law 09-08",     regulator: "CNDP",         tagline: "Morocco's CNDP is among North Africa's most established DPAs." },
  { name: "Iceland",        cc: "is", slug: "iceland",        lat: 64.9,  lon: -19.0,  law: "GDPR (EEA)",    regulator: "Persónuvernd", tagline: "Iceland applies the GDPR as an EEA member." },
  { name: "Bulgaria",       cc: "bg", slug: "bulgaria",       lat: 42.7,  lon: 25.5,   law: "GDPR",          regulator: "CPDP",         tagline: "Bulgaria's CPDP has been increasing enforcement activity." },
  { name: "Slovakia",       cc: "sk", slug: "slovakia",       lat: 48.7,  lon: 19.7,   law: "GDPR",          regulator: "ÚOOÚ",         tagline: "Slovakia's DPA focuses on public sector and health data compliance." },
  { name: "Lithuania",      cc: "lt", slug: "lithuania",      lat: 55.2,  lon: 23.9,   law: "GDPR",          regulator: "VDAI",         tagline: "Lithuania's DPA has been active in telecom privacy enforcement." },
  { name: "Estonia",        cc: "ee", slug: "estonia",        lat: 58.6,  lon: 25.0,   law: "GDPR",          regulator: "AKI",          tagline: "Estonia leads Europe in digital governance and e-residency privacy." },
];

type Phase = "idle" | "spinning" | "result";
type Jurisdiction = typeof RICH_JURISDICTIONS[number];

// Convert geographic lat/lon to a 3D position on a sphere of radius r.
// Three.js SphereGeometry default orientation:
//   +Y = north pole, texture lon=0 maps to the BACK (-Z) face.
// So we apply Math.PI offset to the longitude when placing markers
// AND when rotating the globe to face a country toward the camera (+Z).
// Converts geographic coordinates to a 3D point on a Three.js SphereGeometry
// that matches the default equirectangular texture UV mapping.
// Derivation: phi = π + lon_rad, theta = π/2 - lat_rad in the Three.js formula
// gives: x = cos(lat)*cos(lon), y = sin(lat), z = -cos(lat)*sin(lon)
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.cos(lonRad),   // x
    r * Math.sin(latRad),                       // y (up)
    -r * Math.cos(latRad) * Math.sin(lonRad),  // z (negative sin)
  );
}

// Twinkling star field built as Three.js Points inside the 3D scene.
// Stars render around the globe regardless of CSS overflow:hidden clipping.
function buildStarField() {
  const N = 2000;
  const positions  = new Float32Array(N * 3);
  const colors     = new Float32Array(N * 3);
  const phases     = new Float32Array(N);
  const speeds     = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 48 + Math.random() * 12;
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
    const warm = Math.random();
    colors[i*3]   = 0.80 + warm * 0.20;
    colors[i*3+1] = 0.82 + warm * 0.12;
    colors[i*3+2] = 0.95 + (1 - warm) * 0.05;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.6 + Math.random() * 2.4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.20, vertexColors: true, transparent: true, opacity: 1.0, sizeAttenuation: true,
  });

  return { points: new THREE.Points(geo, mat), phases, speeds };
}

function tickStars(
  pts: THREE.Points,
  phases: Float32Array,
  speeds: Float32Array,
  t: number,
) {
  const attr = pts.geometry.getAttribute("color") as THREE.BufferAttribute;
  const arr  = attr.array as Float32Array;
  const N    = phases.length;
  for (let i = 0; i < N; i++) {
    const b = 0.35 + Math.sin(t * speeds[i] + phases[i]) * 0.45;
    const bright = Math.max(0.02, Math.min(1.0, b));
    arr[i*3]   = Math.min(1, (0.80 + (arr[i*3]   - arr[i*3])  ) * bright + 0.1);
    arr[i*3+1] = Math.min(1, 0.85 * bright + 0.05);
    arr[i*3+2] = Math.min(1, 0.95 * bright + 0.03);
  }
  attr.needsUpdate = true;
}

// Returns the destination angle that requires the shortest rotation
// from currentAngle to reach targetAngle, regardless of accumulated
// full rotations on the globe (handles multi-spin wraparound).
function normalizeAngle(currentAngle: number, targetAngle: number): number {
  // Wrap current angle back into [0, 2π]
  const current =
    ((currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Find the delta and clamp to [−π, +π] (shortest arc)
  let delta = targetAngle - current;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  // Return target relative to the real (un-normalized) currentAngle
  return currentAngle + delta;
}

export default function SpinTheGlobe() {
  const mountRef      = useRef<HTMLDivElement>(null);
  const globeRef      = useRef<THREE.Mesh | null>(null);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef      = useRef<ReturnType<typeof buildStarField> | null>(null);
  const markerRef     = useRef<THREE.Mesh | null>(null);
  const markerRingRef = useRef<THREE.Mesh | null>(null);
  const markerLightRef= useRef<THREE.PointLight | null>(null);
  const animRef       = useRef(0);
  const spinRef       = useRef(0.002);
  const pulseRef      = useRef(0);
  const clockRef      = useRef(0);
  const targetRotRef  = useRef<number | null>(null);

  const [phase,  setPhase]  = useState<Phase>("idle");
  const [picked, setPicked] = useState<Jurisdiction | null>(null);
  const [ready,  setReady]  = useState(false);

  // ── Build Three.js scene ───────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth  || 380;
    const H = el.clientHeight || 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;position:absolute;top:0;left:0;width:100%;height:100%;border-radius:9999px;";
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0, 3.0);
    camera.lookAt(0, 0, 0);

    // Stars
    const sf = buildStarField();
    starsRef.current = sf;
    scene.add(sf.points);

    // Globe — placeholder material while texture loads
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0d2744, shininess: 20 }),
    );
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere backglow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x2a6bbf, side: THREE.BackSide, transparent: true, opacity: 0.10 }),
    ));

    // Latitude/longitude grid lines
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.002, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x4a90d9, wireframe: true, transparent: true, opacity: 0.05 }),
    ));

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.60));
    const sun = new THREE.DirectionalLight(0xfff8e8, 1.05);
    sun.position.set(5, 3, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x203060, 0.28);
    fill.position.set(-4, -1, -3);
    scene.add(fill);

    // ── Load NASA Blue Marble texture via unpkg (CORS-safe) ───────────
    // Primary: photorealistic NASA Blue Marble from three-globe package CDN
    // Fallback: canvas-drawn topojson land masses
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const applyTexture = (tex: THREE.Texture) => {
      if (!globeRef.current) return;
      globeRef.current.material = new THREE.MeshPhongMaterial({
        map: tex,
        specularMap: tex,
        specular: new THREE.Color(0x111133),
        shininess: 15,
      });
      setReady(true);
    };

    // Try NASA Blue Marble from unpkg (reliable CDN, CORS enabled)
    loader.load(
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      applyTexture,
      undefined,
      () => {
        // Fallback 1: another reliable CDN
        loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
          applyTexture,
          undefined,
          () => {
            // Fallback 2: draw stylized canvas texture
            buildCanvasEarth().then(applyTexture);
          }
        );
      }
    );

    // ── Animation loop ────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      frame++;
      clockRef.current += 0.016;

      if (globeRef.current) {
        if (targetRotRef.current !== null) {
          // Ease-out toward target angle
          const diff = targetRotRef.current - globeRef.current.rotation.y;
          if (Math.abs(diff) < 0.001) {
            globeRef.current.rotation.y = targetRotRef.current;
            targetRotRef.current = null; // done
          } else {
            globeRef.current.rotation.y += diff * 0.06; // ease-out
          }
        } else {
          globeRef.current.rotation.y += spinRef.current; // normal spin
        }
      }

      if (frame % 2 === 0 && starsRef.current) {
        tickStars(starsRef.current.points, starsRef.current.phases, starsRef.current.speeds, clockRef.current);
      }

      // Marker pulse
      pulseRef.current += 0.05;
      if (markerRef.current) {
        const s = 1.0 + Math.sin(pulseRef.current) * 0.35;
        markerRef.current.scale.set(s, s, s);
        (markerRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.80 + Math.sin(pulseRef.current * 1.3) * 0.20;
      }
      if (markerRingRef.current) {
        const expand = ((pulseRef.current * 0.25) % 1.0);
        const rs = 1.0 + expand * 1.2;
        markerRingRef.current.scale.set(rs, rs, rs);
        (markerRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, 0.55 - expand * 0.55);
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

  // ── Highlight selected country on globe ────────────────────────────────
  const addHighlight = useCallback((jur: Jurisdiction) => {
    const globe = globeRef.current;
    if (!globe) return;

    // Clear old marker
    [markerRef, markerRingRef, markerLightRef].forEach(ref => {
      if (ref.current) { globe.remove(ref.current); (ref as any).current = null; }
    });

    const pos = latLonToVec3(jur.lat, jur.lon, 1.055);

    // Gold dot — large enough to be clearly visible
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.050, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 }),
    );
    dot.position.copy(pos);
    globe.add(dot);
    markerRef.current = dot;

    // Expanding gold ring around dot
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.115, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.position.copy(pos);
    // Face the ring outward from globe center (lookAt globe center from position)
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.rotateX(Math.PI / 2); // correct ring plane orientation
    globe.add(ring);
    markerRingRef.current = ring;

    // Warm point light to illuminate land around marker
    const ptLight = new THREE.PointLight(0xf59e0b, 1.4, 1.2);
    ptLight.position.copy(pos);
    globe.add(ptLight);
    markerLightRef.current = ptLight;

    // ── KEY FIX: rotate globe so selected country faces camera ────────
    // Three.js SphereGeometry default: texture lon=0° points to +Z (toward camera)
    // when rotation.y = 0.
    // To bring longitude `lon` to face +Z: rotation.y = -lon * PI/180
    // BUT the Blue Marble texture is oriented with lon=0 at the FRONT (+Z),
    // so the formula is simply:
    // Three.js SphereGeometry has lon=-90° at the camera-facing +Z axis
    // when rotation.y = 0. To bring longitude L to the front:
    // rotation.y = -(L_rad + π/2)
    spinRef.current = 0; // stop free spin immediately
    // Compute target angle and animate toward it smoothly
    const targetAngle = -(jur.lon * Math.PI / 180 + Math.PI / 2);
    targetRotRef.current = normalizeAngle(globe.rotation.y, targetAngle);

    pulseRef.current = 0;
    pulseRef.current = 0;
  }, []);

  const removeHighlight = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    [markerRef, markerRingRef, markerLightRef].forEach(ref => {
      if (ref.current) { globe.remove(ref.current); (ref as any).current = null; }
    });
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
        <h2 className="font-display font-bold text-navy text-2xl mb-2">Feeling Curious?</h2>
        <p className="text-slate text-sm max-w-md mx-auto">
          Spin the globe and discover a jurisdiction you may not have been tracking.
          Every country has a story.
        </p>
      </div>

      {/* Globe */}
      <div
        ref={mountRef}
        className="relative rounded-full overflow-hidden shadow-eup-lg cursor-pointer"
        style={{
          width: 380, height: 380,
          background: "radial-gradient(circle at 50% 50%, #0d1f3c 0%, #050b18 70%, #020609 100%)",
        }}
        onClick={phase === "idle" ? handleSpin : undefined}
      />

      {!ready && (
        <p className="text-slate-light text-[10px] mt-1 animate-pulse">Loading globe…</p>
      )}

      {/* Controls */}
      <div className="mt-6 min-h-[200px] flex flex-col items-center justify-start w-full max-w-sm px-4">

        {phase === "idle" && (
          <button
            onClick={handleSpin}
            className="group relative overflow-hidden bg-gradient-to-br from-navy to-steel text-white font-bold text-[15px] px-10 py-4 rounded-2xl shadow-eup-md hover:shadow-eup-lg transition-all hover:-translate-y-0.5 cursor-pointer border-none w-full"
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              🌍 Spin the Globe
            </span>
            <div className="absolute inset-0 bg-gradient-to-br from-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {phase === "spinning" && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
            <p className="text-slate text-sm font-medium">The globe is choosing…</p>
          </div>
        )}

        {phase === "result" && picked && (
          <div className="w-full animate-fade-up">
            <div className="bg-white border border-fog rounded-2xl shadow-eup-md p-6 text-center w-full">

              {/* Country flag via flagcdn.com — always renders correctly */}
              <div className="flex justify-center mb-3">
                <img
                  src={`https://flagcdn.com/96x72/${picked.cc}.png`}
                  srcSet={`https://flagcdn.com/192x144/${picked.cc}.png 2x`}
                  alt={`${picked.name} flag`}
                  width="96" height="72"
                  className="rounded-md shadow-eup-sm"
                />
              </div>

              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-light mb-1">
                The globe chose
              </div>
              <h3 className="font-display font-bold text-navy text-2xl mb-2">{picked.name}</h3>

              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">{picked.law}</span>
                <span className="text-[11px] bg-fog text-slate px-2.5 py-0.5 rounded-full font-medium">{picked.regulator}</span>
              </div>

              <p className="text-slate text-[13px] leading-relaxed mb-5 italic">"{picked.tagline}"</p>

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

// ── Canvas earth fallback (used only if CDN textures fail) ────────────────
async function buildCanvasEarth(): Promise<THREE.Texture> {
  const CW = 2048, CH = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

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
    let prevX: number | null = null, started = false;
    for (const [lon, lat] of coords) {
      const [x, y] = project(lon, lat);
      if (prevX !== null && Math.abs(x - prevX) > CW * 0.4) {
        ctx.fill(); ctx.stroke(); ctx.beginPath(); started = false;
      }
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      prevX = x;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };

  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json", { mode: "cors" });
    const topo = await res.json();
    const arcs = topo.arcs as number[][][];
    const sc = topo.transform?.scale ?? [1,1];
    const tr = topo.transform?.translate ?? [0,0];

    function decodeArc(idx: number): number[][] {
      const rev = idx < 0; const i = rev ? ~idx : idx;
      const raw = arcs[i]; let x = 0, y = 0;
      const pts = raw.map(([dx,dy]: number[]) => { x+=dx; y+=dy; return [x*sc[0]+tr[0], y*sc[1]+tr[1]]; });
      return rev ? pts.reverse() : pts;
    }

    ctx.fillStyle   = "#1e7d4a";
    ctx.strokeStyle = "#145e38";
    ctx.lineWidth   = 0.8;

    for (const geo of topo.objects.countries.geometries) {
      const rings: number[][][] = geo.type === "Polygon"
        ? geo.arcs.map((r: number[]) => r.flatMap((a: number) => decodeArc(a)))
        : geo.type === "MultiPolygon"
          ? geo.arcs.flatMap((p: number[][]) => p.map((r: number[]) => r.flatMap((a: number) => decodeArc(a))))
          : [];
      for (const ring of rings) drawRing(ring);
    }
  } catch {
    // ultra-fallback: rough continent ellipses
    ctx.fillStyle = "#1e7d4a";
    for (const [cx,cy,rx,ry] of [[0.12,0.3,0.10,0.22],[0.14,0.58,0.06,0.15],[0.45,0.28,0.08,0.18],[0.50,0.38,0.12,0.22],[0.64,0.28,0.18,0.20],[0.84,0.58,0.08,0.12]]) {
      ctx.beginPath(); ctx.ellipse(cx*CW, cy*CH, rx*CW, ry*CH, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  const iceN = ctx.createLinearGradient(0,0,0,CH*0.13);
  iceN.addColorStop(0,"rgba(220,235,255,0.90)"); iceN.addColorStop(1,"rgba(220,235,255,0)");
  ctx.fillStyle = iceN; ctx.fillRect(0,0,CW,CH*0.13);
  const iceS = ctx.createLinearGradient(0,CH*0.87,0,CH);
  iceS.addColorStop(0,"rgba(220,235,255,0)"); iceS.addColorStop(1,"rgba(220,235,255,0.85)");
  ctx.fillStyle = iceS; ctx.fillRect(0,CH*0.87,CW,CH*0.13);

  return new THREE.CanvasTexture(canvas);
}
