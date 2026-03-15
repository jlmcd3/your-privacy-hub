import { useEffect, useRef } from "react";
import * as THREE from "three";

const R = 1.5;

function toVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(lam)
  );
}

function buildEarthCanvas(geojson: any): HTMLCanvasElement {
  const CW = 2048, CH = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d3060";
  ctx.fillRect(0, 0, CW, CH);

  function project(lon: number, lat: number): [number, number] {
    return [(lon + 180) / 360 * CW, (90 - lat) / 180 * CH];
  }

  function drawRing(coords: number[][]) {
    if (!coords || coords.length < 2) return;
    ctx.beginPath();
    let started = false;
    let prevX: number | null = null;
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
  }

  ctx.fillStyle = "#1e3d28";
  ctx.strokeStyle = "#162d1e";
  ctx.lineWidth = 0.5;

  for (const f of geojson.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") drawRing(f.geometry.coordinates[0]);
    else if (f.geometry.type === "MultiPolygon")
      for (const poly of f.geometry.coordinates) drawRing(poly[0]);
  }

  const iceN = ctx.createLinearGradient(0, 0, 0, CH * 0.13);
  iceN.addColorStop(0, "rgba(225,238,255,0.95)");
  iceN.addColorStop(1, "rgba(225,238,255,0)");
  ctx.fillStyle = iceN;
  ctx.fillRect(0, 0, CW, CH * 0.13);

  const iceS = ctx.createLinearGradient(0, CH * 0.87, 0, CH);
  iceS.addColorStop(0, "rgba(225,238,255,0)");
  iceS.addColorStop(1, "rgba(225,238,255,0.9)");
  ctx.fillStyle = iceS;
  ctx.fillRect(0, CH * 0.87, CW, CH * 0.13);

  return canvas;
}

const GlobeScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    el.style.position = "relative";

    const W = el.clientWidth || 600;
    const H = el.clientHeight || 600;

    // ── Star canvas — inserted into DOM first, sits behind Three.js canvas ──
    const starCanvas = document.createElement("canvas");
    starCanvas.width = W;
    starCanvas.height = H;
    starCanvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    el.appendChild(starCanvas);

    const ctx2 = starCanvas.getContext("2d")!;
    const COUNT = 280;
    const stars = Array.from({ length: COUNT }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.1 + 0.2,
      base:  Math.random() * 0.35 + 0.05,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.4 + 0.15,
    }));

    let t = 0;
    let starAnimId: number;
    function drawStars() {
      starAnimId = requestAnimationFrame(drawStars);
      ctx2.clearRect(0, 0, starCanvas.width, starCanvas.height);
      t += 0.016;
      for (const s of stars) {
        const twinkle = Math.sin(t * s.speed + s.phase) * 0.18;
        const alpha   = Math.max(0, Math.min(1, s.base + twinkle));
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(200,220,255,${alpha.toFixed(3)})`;
        ctx2.fill();
      }
    }
    drawStars();

    // ── Three.js globe — appended after star canvas, sits on top ──────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    // Position the WebGL canvas above the star canvas
    renderer.domElement.style.cssText =
      "position:relative;z-index:1;display:block;";
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.18;
    scene.add(globeGroup);

    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const globeMesh = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#0d2545") })
    );
    globeGroup.add(globeMesh);

    const gPoints: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30)
      for (let lon = -180; lon < 180; lon += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.003));
        gPoints.push(toVec3(lat, lon + 4, R + 0.003));
      }
    for (let lon = -180; lon < 180; lon += 30)
      for (let lat = -88; lat < 88; lat += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.003));
        gPoints.push(toVec3(lat + 4, lon, R + 0.003));
      }
    globeMesh.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gPoints),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })
    ));

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    const loadGlobe = async () => {
      try {
        const [topoRes, topojs] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as string) as any,
        ]);
        const topo    = await topoRes.json();
        const geojson = topojs.feature(topo, topo.objects.countries);
        const canvas  = buildEarthCanvas(geojson);
        globeMesh.material = new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
        });
      } catch (e) {
        console.warn("Globe texture failed to load", e);
      }
    };
    loadGlobe();

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      globeMesh.rotation.y += 0.0019;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = el.clientWidth, H2 = el.clientHeight;
      if (!W2 || !H2) return;
      starCanvas.width  = W2;
      starCanvas.height = H2;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      cancelAnimationFrame(starAnimId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(starCanvas)) el.removeChild(starCanvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
};

export default GlobeScene;
