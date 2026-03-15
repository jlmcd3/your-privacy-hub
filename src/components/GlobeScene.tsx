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

const ARC_PAIRS: [number, number][] = [
  [0, 2],
  [1, 4],
  [2, 5],
  [6, 4],
  [0, 1],
];

const ATM_VERT = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATM_FRAG = `
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(-vPosition))), 3.0);
    gl_FragColor = vec4(glowColor, fresnel * intensity);
  }
`;

function toVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    // ── Star field ────────────────────────────────────────────────────
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 10;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.65 })
      )
    );

    // ── Globe group ───────────────────────────────────────────────────
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.18;
    scene.add(globeGroup);

    // Earth texture — async load, does not block page render
    const loader = new THREE.TextureLoader();
    const earthTex = loader.load(
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/textures/land_ocean_ice_cloud_2048.jpg"
    );
    earthTex.colorSpace = THREE.SRGBColorSpace;

    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      map: earthTex,
      shininess: 20,
      specular: new THREE.Color("#1a4a7a"),
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // ── Atmosphere — outer Fresnel glow ───────────────────────────────
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.12, 32, 32),
        new THREE.ShaderMaterial({
          vertexShader: ATM_VERT,
          fragmentShader: ATM_FRAG,
          uniforms: {
            glowColor: { value: new THREE.Color("#4a9ef0") },
            intensity: { value: 1.6 },
          },
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    // ── Atmosphere — inner limb glow ──────────────────────────────────
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.02, 32, 32),
        new THREE.ShaderMaterial({
          vertexShader: ATM_VERT,
          fragmentShader: ATM_FRAG,
          uniforms: {
            glowColor: { value: new THREE.Color("#2266cc") },
            intensity: { value: 0.35 },
          },
          transparent: true,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    // ── Subtle lat/lon grid ───────────────────────────────────────────
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
    globeMesh.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(gPoints),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 })
      )
    );

    // ── Hub dots ──────────────────────────────────────────────────────
    HUBS.forEach((hub) => {
      const pos = toVec3(hub.lat, hub.lon, R + 0.018);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.022, 0.038, 16),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#7dd3fc"),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        })
      );
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      globeMesh.add(ring);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dot.position.copy(pos);
      globeMesh.add(dot);
    });

    // ── Arc lines with animated traveling dots ────────────────────────
    type ArcDot = {
      mesh: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      t: number;
      speed: number;
    };
    const arcDots: ArcDot[] = [];

    ARC_PAIRS.forEach(([a, b], i) => {
      const hubA = HUBS[a];
      const hubB = HUBS[b];
      const startVec = toVec3(hubA.lat, hubA.lon, R);
      const endVec   = toVec3(hubB.lat, hubB.lon, R);
      const midVec   = startVec.clone().add(endVec).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.42);
      const curve    = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);

      globeMesh.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
          new THREE.LineBasicMaterial({
            color: new THREE.Color("#38bdf8"),
            transparent: true,
            opacity: 0.3,
          })
        )
      );

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 6, 6),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#bae6fd"),
          transparent: true,
          opacity: 0.9,
        })
      );
      globeMesh.add(dot);
      arcDots.push({ mesh: dot, curve, t: i / ARC_PAIRS.length, speed: 0.0018 + i * 0.0003 });
    });

    // ── Lighting ──────────────────────────────────────────────────────
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 3.8);
    sunLight.position.set(8, 4, 5);
    scene.add(sunLight);

    scene.add(new THREE.AmbientLight(0x223344, 0.7));

    const rimLight = new THREE.DirectionalLight(0x1a3a6c, 1.6);
    rimLight.position.set(-6, -2, -6);
    scene.add(rimLight);

    // ── Animation loop ────────────────────────────────────────────────
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      globeMesh.rotation.y += 0.0019;
      arcDots.forEach((arc) => {
        arc.t = (arc.t + arc.speed) % 1;
        arc.mesh.position.copy(
          arc.curve.getPoint(arc.t).normalize().multiplyScalar(R + 0.025)
        );
      });
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
