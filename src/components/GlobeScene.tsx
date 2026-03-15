import { useEffect, useRef } from "react";
import * as THREE from "three";

const R = 1.5;

const HUBS = [
  { lat: 50.85, lon: 4.35 },
  { lat: 51.51, lon: -0.12 },
  { lat: 38.89, lon: -77.04 },
  { lat: -23.55, lon: -46.63 },
  { lat: 35.69, lon: 139.69 },
  { lat: 1.35, lon: 103.82 },
  { lat: 28.61, lon: 77.21 },
  { lat: -35.28, lon: 149.13 },
];

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

  // Ocean
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
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
      prevX = x;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Land base
  ctx.fillStyle = "#3d7a38";
  ctx.strokeStyle = "#2d5c28";
  ctx.lineWidth = 0.5;

  for (const f of geojson.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      drawRing(f.geometry.coordinates[0]);
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates) drawRing(poly[0]);
    }
  }

  // Desert tint — Sahara / Arabian Peninsula band
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#c9a85c";
  ctx.strokeStyle = "transparent";
  ctx.lineWidth = 0;
  for (const f of geojson.features) {
    if (!f.geometry) continue;
    const drawDesert = (ring: number[][]) => {
      if (!ring || ring.length < 2) return;
      ctx.beginPath();
      let st = false, px: number | null = null;
      for (const [lon, lat] of ring) {
        if (lat < 35 && lat > 10 && lon > -20 && lon < 75) {
          const [x, y] = project(lon, lat);
          if (px !== null && Math.abs(x - px) > CW * 0.5) { ctx.beginPath(); st = false; }
          if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
          px = x;
        }
      }
      ctx.closePath();
      ctx.fill();
    };
    if (f.geometry.type === "Polygon") drawDesert(f.geometry.coordinates[0]);
    else if (f.geometry.type === "MultiPolygon") f.geometry.coordinates.forEach((p: number[][][]) => drawDesert(p[0]));
  }
  ctx.globalAlpha = 1.0;

  // Polar ice caps
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

    const W = el.clientWidth || 600;
    const H = el.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.18;
    scene.add(globeGroup);

    // Placeholder sphere while GeoJSON loads
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const placeholderMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#0d2545") });
    const globeMesh = new THREE.Mesh(sphereGeo, placeholderMat);
    globeGroup.add(globeMesh);

    // Graticule grid
    const gPoints: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.003));
        gPoints.push(toVec3(lat, lon + 4, R + 0.003));
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.003));
        gPoints.push(toVec3(lat + 4, lon, R + 0.003));
      }
    }
    globeMesh.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gPoints),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })
    ));

    // Hub dots
    HUBS.forEach((hub) => {
      const pos = toVec3(hub.lat, hub.lon, R + 0.02);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.023, 0.04, 16),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      globeMesh.add(ring);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dot.position.copy(pos);
      globeMesh.add(dot);
    });

    // Load world-atlas TopoJSON and build canvas texture
    const loadGlobe = async () => {
      try {
        const [topoRes, topojs] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as string) as any,
        ]);
        const topo = await topoRes.json();
        const geojson = topojs.feature(topo, topo.objects.countries);
        const canvas = buildEarthCanvas(geojson);
        const tex = new THREE.CanvasTexture(canvas);
        // MeshBasicMaterial = no lighting, perfectly even illumination all around
        globeMesh.material = new THREE.MeshBasicMaterial({ map: tex });
      } catch (e) {
        console.warn("Globe texture failed to load", e);
      }
    };
    loadGlobe();

    // Animation
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      globeMesh.rotation.y += 0.0019;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = el.clientWidth;
      const H2 = el.clientHeight;
      if (!W2 || !H2) return;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
};

export default GlobeScene;