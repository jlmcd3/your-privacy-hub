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

  // Land — uniform dark muted green, no desert differentiation
  ctx.fillStyle = "#1e3d28";
  ctx.strokeStyle = "#162d1e";
  ctx.lineWidth = 0.5;

  for (const f of geojson.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      drawRing(f.geometry.coordinates[0]);
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates) drawRing(poly[0]);
    }
  }

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

    // Placeholder while texture loads
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const globeMesh = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#0d2545") })
    );
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

    // Load GeoJSON and build canvas texture async — does not block page render
    const loadGlobe = async () => {
      try {
        const [topoRes, topojs] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as string) as any,
        ]);
        const topo = await topoRes.json();
        const geojson = topojs.feature(topo, topo.objects.countries);
        const canvas = buildEarthCanvas(geojson);
        // MeshBasicMaterial = no lighting, perfectly even illumination all the way around
        globeMesh.material = new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
        });
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
