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

const CONTINENTS: [number, number][][] = [
  [[-168,71],[-100,73],[-85,68],[-76,64],[-60,47],[-66,44],[-70,44],
   [-76,40],[-80,34],[-85,30],[-90,29],[-97,26],[-110,23],[-118,32],
   [-122,37],[-124,46],[-132,56],[-148,61],[-168,71]],
  [[-73,83],[-30,83],[-18,76],[-20,70],[-28,65],[-46,63],[-58,68],[-73,83]],
  [[-80,10],[-75,8],[-70,5],[-60,5],[-52,4],[-48,0],[-38,-10],
   [-35,-10],[-40,-20],[-45,-23],[-48,-28],[-55,-34],[-65,-42],
   [-68,-53],[-63,-55],[-55,-52],[-48,-18],[-42,-12],[-38,-5],
   [-50,0],[-60,5],[-67,2],[-72,5],[-80,10]],
  [[-10,36],[0,36],[5,43],[10,44],[15,44],[20,44],[28,41],[30,41],
   [32,47],[28,55],[20,55],[15,57],[10,55],[5,57],[0,61],[-5,58],
   [-8,54],[-5,50],[0,47],[5,43],[2,36],[-6,36],[-10,36]],
  [[5,57],[10,58],[12,56],[14,56],[18,60],[20,64],[25,65],[28,70],
   [26,71],[22,70],[16,68],[14,65],[12,60],[10,58],[5,57]],
  [[-18,16],[-15,12],[-10,5],[-5,5],[0,5],[10,5],[20,5],[30,5],
   [35,5],[40,12],[44,12],[42,12],[40,10],[36,3],[38,-5],
   [36,-18],[33,-30],[27,-35],[18,-35],[14,-27],[12,-5],[10,5],
   [5,5],[0,5],[-5,5],[-10,5],[-15,10],[-18,16]],
  [[25,41],[40,40],[52,36],[58,25],[65,22],[70,25],[75,28],[80,28],
   [85,27],[90,28],[95,22],[100,20],[105,15],[110,20],[115,22],
   [120,30],[128,32],[135,35],[140,40],[142,45],[138,50],[130,60],
   [120,60],[110,55],[100,60],[92,58],[82,52],[72,55],[65,57],
   [58,58],[52,52],[45,48],[40,44],[35,44],[30,50],[25,55],
   [20,55],[30,50],[35,44],[30,41],[25,41]],
  [[68,23],[72,22],[78,20],[80,13],[83,12],[78,8],[72,8],[68,23]],
  [[99,6],[102,6],[104,1],[101,4],[99,6]],
  [[130,31],[131,33],[134,35],[137,36],[140,38],[141,42],[140,44],
   [138,39],[135,35],[132,34],[130,31]],
  [[114,-22],[120,-18],[128,-14],[136,-12],[136,-15],[140,-18],
   [145,-18],[150,-24],[153,-28],[152,-38],[146,-39],[142,-39],
   [136,-36],[130,-32],[123,-34],[116,-35],[114,-30],[114,-22]],
];

function toVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = lat * Math.PI / 180;
  const lam = lon * Math.PI / 180;
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(lam)
  );
}

const GlobeScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 600;
    const H = el.clientHeight || 600;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    // Globe group (so we tilt and spin independently)
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.18;
    scene.add(globeGroup);

    // Ocean sphere
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#091c30"),
      emissive: new THREE.Color("#0d2545"),
      emissiveIntensity: 0.6,
      shininess: 70,
      transparent: true,
      opacity: 0.97,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Atmosphere — BackSide slightly bigger sphere
    const atmGeo = new THREE.SphereGeometry(R * 1.09, 32, 32);
    const atmMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#3B82C4"),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.14,
    });
    globeGroup.add(new THREE.Mesh(atmGeo, atmMat));

    // Graticule (lat/lon grid)
    const gPoints: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.002));
        gPoints.push(toVec3(lat, lon + 4, R + 0.002));
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        gPoints.push(toVec3(lat, lon, R + 0.002));
        gPoints.push(toVec3(lat + 4, lon, R + 0.002));
      }
    }
    const gGeo = new THREE.BufferGeometry().setFromPoints(gPoints);
    globeMesh.add(new THREE.LineSegments(gGeo, new THREE.LineBasicMaterial({
      color: new THREE.Color("#93C5E8"),
      transparent: true,
      opacity: 0.1,
    })));

    // Continent outlines
    for (const ring of CONTINENTS) {
      const pts = ring.map(([lon, lat]) => toVec3(lat, lon, R + 0.005));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      globeMesh.add(new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
        color: new THREE.Color("#93C5E8"),
        transparent: true,
        opacity: 0.5,
      })));
    }

    // Hub dots
    for (const hub of HUBS) {
      const pos = toVec3(hub.lat, hub.lon, R + 0.018);

      // Outer ring
      const ringGeo = new THREE.RingGeometry(0.022, 0.038, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#93C5E8"),
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      globeMesh.add(ring);

      // Inner dot
      const dotGeo = new THREE.SphereGeometry(0.016, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#bfdbfe"),
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      globeMesh.add(dot);
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0x1a3a6c, 2.0);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x4a8fd4, 3.5);
    keyLight.position.set(6, 4, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x1a3a6c, 1.8);
    rimLight.position.set(-6, -2, -6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x2a5a9c, 1.2);
    fillLight.position.set(0, 6, -4);
    scene.add(fillLight);

    // Animation loop — ~55s per revolution
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      globeMesh.rotation.y += 0.0019;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
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
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
  );
};

export default GlobeScene;
