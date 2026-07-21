import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import GLOBE_JURISDICTIONS, { type GlobeJurisdiction } from "@/data/globe_jurisdictions";
import { pickStarClass, powerLawBrightness, twinkle } from "./starPalette";
import earthTextureAsset from "@/assets/earth-blue-marble.jpg.asset.json";
import { Globe } from 'lucide-react';



type Phase = "idle" | "spinning" | "result";
type Jurisdiction = GlobeJurisdiction;

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
// Split into THREE brightness bands as separate Points groups since
// PointsMaterial has a single uniform size per group.
type StarGroup = {
  points: THREE.Points;
  baseColors: Float32Array; // immutable per-star RGB (never mutated)
  phases: Float32Array;
  speedsA: Float32Array;
  speedsB: Float32Array;
  bases: Float32Array;      // per-star base brightness 0..1
};

function buildStarGroup(count: number, size: number): StarGroup {
  const positions  = new Float32Array(count * 3);
  const colors     = new Float32Array(count * 3);
  const baseColors = new Float32Array(count * 3);
  const phases     = new Float32Array(count);
  const speedsA    = new Float32Array(count);
  const speedsB    = new Float32Array(count);
  const bases      = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 48 + Math.random() * 12;
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);

    const cls = pickStarClass(Math.random());
    baseColors[i*3]   = cls.rgb[0] / 255;
    baseColors[i*3+1] = cls.rgb[1] / 255;
    baseColors[i*3+2] = cls.rgb[2] / 255;
    colors[i*3]   = baseColors[i*3];
    colors[i*3+1] = baseColors[i*3+1];
    colors[i*3+2] = baseColors[i*3+2];

    bases[i]   = powerLawBrightness();
    phases[i]  = Math.random() * Math.PI * 2;
    speedsA[i] = 0.4 + Math.random() * 1.6;
    speedsB[i] = speedsA[i] * 1.618;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size, vertexColors: true, transparent: true, opacity: 1.0, sizeAttenuation: true,
  });

  return { points: new THREE.Points(geo, mat), baseColors, phases, speedsA, speedsB, bases };
}

function buildStarField() {
  // Power-law makes fewer points read as richer; total ~1200.
  const dim    = buildStarGroup(Math.round(1200 * 0.70), 0.10);
  const mid    = buildStarGroup(Math.round(1200 * 0.22), 0.18);
  const bright = buildStarGroup(Math.round(1200 * 0.08), 0.30);
  return { dim, mid, bright };
}

function tickStarGroup(g: StarGroup, t: number) {
  const attr = g.points.geometry.getAttribute("color") as THREE.BufferAttribute;
  const arr  = attr.array as Float32Array;
  const N    = g.phases.length;
  for (let i = 0; i < N; i++) {
    const m = twinkle(t, g.phases[i], g.speedsA[i], g.speedsB[i], g.bases[i]);
    const k = g.bases[i] * m;
    arr[i*3]   = Math.min(1, g.baseColors[i*3]   * k);
    arr[i*3+1] = Math.min(1, g.baseColors[i*3+1] * k);
    arr[i*3+2] = Math.min(1, g.baseColors[i*3+2] * k);
  }
  attr.needsUpdate = true;
}

function applyStaticColors(g: StarGroup) {
  const attr = g.points.geometry.getAttribute("color") as THREE.BufferAttribute;
  const arr  = attr.array as Float32Array;
  const N    = g.phases.length;
  for (let i = 0; i < N; i++) {
    const k = g.bases[i];
    arr[i*3]   = g.baseColors[i*3]   * k;
    arr[i*3+1] = g.baseColors[i*3+1] * k;
    arr[i*3+2] = g.baseColors[i*3+2] * k;
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

export default function SpinTheGlobe({ compact = false }: { compact?: boolean } = {}) {
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
  const targetRotYRef = useRef<number | null>(null);
  const targetRotXRef = useRef<number | null>(null);

  // Pointer-drag + inertia. `dragRef` tracks an in-flight gesture; `inertiaRef`
  // carries residual angular velocity after release and decays each frame.
  // `suppressClickRef` swallows the synthetic click that follows a drag so the
  // gesture doesn't also fire `handleSpin`. `phaseRef` mirrors `phase` for use
  // inside the scene-effect listener closure (which has no phase dep).
  const dragRef = useRef<{
    active: boolean; pointerId: number; lastX: number; lastY: number;
    startX: number; startY: number; moved: boolean;
    lastT: number; velY: number; velX: number;
  }>({ active: false, pointerId: -1, lastX: 0, lastY: 0, startX: 0, startY: 0,
       moved: false, lastT: 0, velY: 0, velX: 0 });
  const inertiaRef = useRef<{ vy: number; vx: number }>({ vy: 0, vx: 0 });
  const suppressClickRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");

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
    // No border-radius clip: avoid a CSS hard circular edge against the hero
    // background that could read as a dark ring around the globe.
    renderer.domElement.style.cssText = "display:block;position:absolute;top:0;left:0;width:100%;height:100%;filter:contrast(1.18) saturate(1.2) brightness(1.12);";
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0, 3.0);
    camera.lookAt(0, 0, 0);

    // Stars removed — the globe sits directly against the hero background
    // so no in-scene starfield is rendered inside the globe's ring.


    // Globe — placeholder material while texture loads
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0d2744, shininess: 20 }),
    );
    scene.add(globe);
    globeRef.current = globe;

    // UX-3 follow-up: no separate atmosphere mesh. The lit globe sits
    // directly against the hero's starfield background; the day/night
    // terminator and specular ocean highlight provide all the shape cues.


    // Latitude/longitude grid removed — at the silhouette the wireframe
    // segments concentrated into a visible dark ring against the hero.
    // The photographic Blue Marble texture already carries geographic detail.

    // Lighting — side-lit sun preserves a real day/night terminator while
    // brighter ambient/fill/rim light keeps terrain visible and dimensional.
    scene.add(new THREE.AmbientLight(0xffffff, 0.34));
    const sun = new THREE.DirectionalLight(0xfff1cf, 3.1);
    sun.position.set(5.6, 1.3, 2.2);
    scene.add(sun);
    // Cool Earthshine rim/fill from opposite side
    const fill = new THREE.DirectionalLight(0x6fa7f0, 1.05);
    fill.position.set(-4.2, -0.25, 1.4);
    scene.add(fill);
    // Subtle top rim catches the upper limb and adds depth
    const rim = new THREE.DirectionalLight(0x88b8ff, 0.62);
    rim.position.set(-2, 3, -1);
    scene.add(rim);


    // ── Load NASA Blue Marble texture via unpkg (CORS-safe) ───────────
    // Primary: photorealistic NASA Blue Marble from three-globe package CDN
    // Fallback: canvas-drawn topojson land masses
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const applyTexture = (tex: THREE.Texture) => {
      if (!globeRef.current) return;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 4;
      globeRef.current.material = new THREE.MeshPhongMaterial({
        map: tex,
        specularMap: tex,
        specular: new THREE.Color(0x5e9fc6),
        shininess: 48,
        emissive: new THREE.Color(0x071c34),
        emissiveIntensity: 0.1,
        // Reuse the color map as a bump map for cheap terrain relief — gives
        // the sphere visible texture/detail without shipping a second asset.
        bumpMap: tex,
        bumpScale: 0.07,
      });
      setReady(true);

    };

    // Try self-hosted asset first, then unpkg CDN, then canvas-drawn fallback.
    loader.load(
      earthTextureAsset.url,
      applyTexture,
      undefined,
      () => {
        loader.load(
          "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
          applyTexture,
          undefined,
          () => {
            loader.load(
              "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
              applyTexture,
              undefined,
              () => { buildCanvasEarth().then(applyTexture); }
            );
          }
        );
      }
    );

    // ── Reduced-motion + visibility/intersection guards ───────────────
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedMq.matches;
    let inView = true;
    let running = false;
    const idleSpinSpeed = 0.002;
    if (reduced) {
      spinRef.current = 0;
    }


    // ── Animation loop ────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      frame++;
      clockRef.current += 0.016;

      if (globeRef.current) {
        const animatingY = targetRotYRef.current !== null;
        const animatingX = targetRotXRef.current !== null;

        if (animatingY) {
          const diff = targetRotYRef.current! - globeRef.current.rotation.y;
          if (Math.abs(diff) < 0.001) {
            globeRef.current.rotation.y = targetRotYRef.current!;
            targetRotYRef.current = null;
          } else {
            globeRef.current.rotation.y += diff * 0.06;
          }
        } else {
          // No target-anim in progress: apply free spin + drag inertia.
          // While actively dragging, spinRef is held at 0 so the user's
          // gesture is the only thing rotating the globe.
          globeRef.current.rotation.y += spinRef.current; // normal spin
          if (!dragRef.current.active) {
            // Inertia decay: 0.94/frame ≈ ~1.2s to fade at 60fps, matches
            // the ramp-down feel of the pick animation.
            const iv = inertiaRef.current;
            if (Math.abs(iv.vy) > 1e-5 || Math.abs(iv.vx) > 1e-5) {
              globeRef.current.rotation.y += iv.vy;
              globeRef.current.rotation.x += iv.vx;
              // Clamp pole tilt so drag inertia can't flip the globe upside-down.
              const maxTilt = Math.PI / 3;
              if (globeRef.current.rotation.x >  maxTilt) globeRef.current.rotation.x =  maxTilt;
              if (globeRef.current.rotation.x < -maxTilt) globeRef.current.rotation.x = -maxTilt;
              iv.vy *= 0.94;
              iv.vx *= 0.94;
              if (Math.abs(iv.vy) < 1e-5) iv.vy = 0;
              if (Math.abs(iv.vx) < 1e-5) iv.vx = 0;
            }
          }
        }

        if (animatingX) {
          const diff = targetRotXRef.current! - globeRef.current.rotation.x;
          if (Math.abs(diff) < 0.001) {
            globeRef.current.rotation.x = targetRotXRef.current!;
            targetRotXRef.current = null;
          } else {
            globeRef.current.rotation.x += diff * 0.06;
          }
        }
      }

      // Celestial-sphere drift: Y rotation with a small axial tilt on X.
      // ~0.00060 rad/frame ≈ one full rotation every ~3 minutes at 60fps.
      if (!reduced && starsRef.current) {
        for (const g of [starsRef.current.dim, starsRef.current.mid, starsRef.current.bright]) {
          g.points.rotation.y += 0.00720;
          g.points.rotation.x += 0.00168;
        }
      }

      if (!reduced && frame % 2 === 0 && starsRef.current) {
        tickStarGroup(starsRef.current.dim,    clockRef.current);
        tickStarGroup(starsRef.current.mid,    clockRef.current);
        tickStarGroup(starsRef.current.bright, clockRef.current);
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
    const start = () => {
      if (running || !inView || document.hidden) return;
      running = true;
      animate();
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
    start();

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        if (inView) start(); else stop();
      }
    }, { threshold: 0 });
    io.observe(el);

    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onVis);

    const onReduced = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      if (reduced) {
        spinRef.current = 0;
      } else {
        spinRef.current = idleSpinSpeed;
      }
    };
    if (reducedMq.addEventListener) reducedMq.addEventListener("change", onReduced);
    else (reducedMq as any).addListener?.(onReduced);

    // ── Pointer-drag with release inertia ─────────────────────────────
    // Drag is only meaningful in the idle phase (spin/result phases run
    // their own animations). Reduced-motion users get click only — no drag,
    // no inertia — matching the "no motion introduced" contract.
    // Distinguishes a tap (< DRAG_THRESHOLD px total movement) from a drag
    // so `handleSpin` still fires on plain clicks.
    const DRAG_THRESHOLD = 5;             // px before a gesture is a drag
    const DRAG_ROT_PER_PX = 0.005;        // rad per pixel of pointer movement
    const MAX_INERTIA = 0.09;             // rad/frame cap on release velocity
    const onPointerDown = (ev: PointerEvent) => {
      if (reduced) return;
      if (phaseRef.current !== "idle") return;
      // Fresh gesture — clear any leftover suppression from an earlier drag so
      // a later tap isn't silently swallowed. The synthetic click a browser
      // fires immediately after a drag's pointerup runs in the same event-loop
      // tick, before any new pointerdown, so this clear is safe.
      suppressClickRef.current = false;
      const d = dragRef.current;
      d.active = true;
      d.pointerId = ev.pointerId;
      d.lastX = d.startX = ev.clientX;
      d.lastY = d.startY = ev.clientY;
      d.lastT = performance.now();
      d.moved = false;
      d.velY = 0;
      d.velX = 0;
      // Halt any residual motion so drag feels grabby.
      spinRef.current = 0;
      inertiaRef.current.vy = 0;
      inertiaRef.current.vx = 0;
      try { el.setPointerCapture(ev.pointerId); } catch { /* older browsers */ }
    };
    const onPointerMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || ev.pointerId !== d.pointerId) return;
      const dx = ev.clientX - d.lastX;
      const dy = ev.clientY - d.lastY;
      const totalDx = ev.clientX - d.startX;
      const totalDy = ev.clientY - d.startY;
      if (!d.moved && Math.hypot(totalDx, totalDy) > DRAG_THRESHOLD) d.moved = true;
      if (globeRef.current) {
        globeRef.current.rotation.y += dx * DRAG_ROT_PER_PX;
        globeRef.current.rotation.x += dy * DRAG_ROT_PER_PX;
        const maxTilt = Math.PI / 3;
        if (globeRef.current.rotation.x >  maxTilt) globeRef.current.rotation.x =  maxTilt;
        if (globeRef.current.rotation.x < -maxTilt) globeRef.current.rotation.x = -maxTilt;
      }
      // Velocity for inertia: convert px/ms → rad/frame at 60fps.
      const now = performance.now();
      const dt  = Math.max(1, now - d.lastT);
      d.velY = (dx * DRAG_ROT_PER_PX) / dt * 16.67;
      d.velX = (dy * DRAG_ROT_PER_PX) / dt * 16.67;
      d.lastX = ev.clientX; d.lastY = ev.clientY; d.lastT = now;
    };
    const onPointerUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || ev.pointerId !== d.pointerId) return;
      d.active = false;
      try { el.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
      if (d.moved) {
        // Suppress the click that browsers synthesize after a pointerup so a
        // drag doesn't also fire handleSpin. Cleared on the next pointerdown
        // or naturally after the click event fires.
        suppressClickRef.current = true;
        inertiaRef.current.vy = Math.max(-MAX_INERTIA, Math.min(MAX_INERTIA, d.velY));
        inertiaRef.current.vx = Math.max(-MAX_INERTIA, Math.min(MAX_INERTIA, d.velX));
      }
    };
    const onPointerCancel = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || ev.pointerId !== d.pointerId) return;
      d.active = false;
      d.moved = false;
      try { el.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
    };
    el.addEventListener("pointerdown",   onPointerDown);
    el.addEventListener("pointermove",   onPointerMove);
    el.addEventListener("pointerup",     onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("pointerleave",  onPointerUp);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (reducedMq.removeEventListener) reducedMq.removeEventListener("change", onReduced);
      else (reducedMq as any).removeListener?.(onReduced);
      el.removeEventListener("pointerdown",   onPointerDown);
      el.removeEventListener("pointermove",   onPointerMove);
      el.removeEventListener("pointerup",     onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("pointerleave",  onPointerUp);
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
    // Compute target angles and animate toward them smoothly
    const targetY = -(jur.lon * Math.PI / 180 + Math.PI / 2);
    targetRotYRef.current = normalizeAngle(globe.rotation.y, targetY);
    // Tilt globe on X axis so latitude faces camera (negative because rotation is inverted)
    const targetX = jur.lat * Math.PI / 180;
    targetRotXRef.current = normalizeAngle(globe.rotation.x, targetX);

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

  // Keep phaseRef synced with phase for the scene-effect listeners.
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Spin handler ───────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    // Drag-then-release synthesises a click; swallow it so a drag doesn't
    // also fire a spin. Cleared on every call so the *next* real tap fires.
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    if (phase !== "idle") return;
    // Cancel any leftover drag inertia so the spin animation starts clean.
    inertiaRef.current.vy = 0;
    inertiaRef.current.vx = 0;
    setPhase("spinning");
    setPicked(null);
    removeHighlight();

    const pick = GLOBE_JURISDICTIONS[Math.floor(Math.random() * GLOBE_JURISDICTIONS.length)];

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
    // Ease X rotation back to 0 (level)
    targetRotXRef.current = 0;
    targetRotYRef.current = null;
  }, [removeHighlight]);

  return (
    <div className="relative w-full flex flex-col items-center">

      {!compact && (
        <div className="text-center mb-6">
          <h2 className="font-display text-brand-navy mb-2">Feeling Curious?</h2>
          <p className="text-slate text-sm max-w-md mx-auto">
            Spin the globe and discover a jurisdiction you may not have been tracking.
            Every country has a story.
          </p>
        </div>
      )}


      {/* Globe */}
      <div
        ref={mountRef}
        className={`relative rounded-full overflow-hidden cursor-pointer ${compact ? "" : "shadow-eup-lg"}`}
        style={compact
          ? { width: 240, height: 240, background: ready ? "transparent" : "transparent" }
          : { width: 380, height: 380, background: ready ? "transparent" : "transparent" }
        }
        onClick={phase === "idle" ? handleSpin : undefined}
      />

      {!ready && (
        <p className="text-brand-mist text-[11px] mt-1 animate-pulse">Loading globe…</p>
      )}

      {/* Controls */}
      <div className={compact
        ? "mt-2 flex flex-col items-center justify-start w-full max-w-[240px] h-[130px]"
        : "mt-6 h-[260px] flex flex-col items-center justify-start w-full max-w-sm px-4"
      }>

        {phase === "idle" && (
          <button
            onClick={handleSpin}
            className={compact
              ? "group relative overflow-hidden bg-white/15 border border-white/20 text-white font-bold text-[12px] px-6 py-2 rounded-xl hover:bg-white/25 transition-all cursor-pointer w-full"
              : "group relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-steel text-white font-bold text-[15px] px-10 py-4 rounded-2xl shadow-eup-md hover:shadow-eup-lg transition-all hover:-translate-y-0.5 cursor-pointer border-none w-full"
            }
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <Globe aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Spin the Globe to discover a jurisdiction
            </span>
            {!compact && (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        )}

        {phase === "spinning" && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-teal-deep animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
            <p className={compact ? "text-white/70 text-xs font-medium" : "text-slate text-sm font-medium"}>The globe is choosing…</p>
          </div>
        )}

        {phase === "result" && picked && (
          <div className="w-full animate-fade-up">
            <div className={compact
              ? "bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm p-3 text-center w-full"
              : "bg-white border border-brand-cloud rounded-2xl shadow-eup-md p-6 text-center w-full"
            }>
              {/* Country flag — smaller in compact */}
              <div className="flex justify-center mb-1">
                <img
                  src={`https://flagcdn.com/96x72/${picked.cc}.png`}
                  srcSet={`https://flagcdn.com/192x144/${picked.cc}.png 2x`}
                  alt={`${picked.name} flag`}
                  width={compact ? "36" : "96"} height={compact ? "27" : "72"}
                  className="rounded-sm shadow-eup-sm"
                />
              </div>

              <div className={compact ? "text-[11px] font-bold uppercase tracking-widest text-white/50 mb-0.5" : "text-[11px] font-bold uppercase tracking-widest text-brand-mist mb-1"}>
                The globe chose
              </div>
              <h3 className={compact
                ? "font-display text-white mb-1"
                : "font-display text-brand-navy mb-2"
              }>{picked.name}</h3>

              {!compact && (
                <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] bg-brand-cloud text-slate px-2.5 py-0.5 rounded-full font-medium">{picked.law}</span>
                  <span className="text-[11px] bg-brand-cloud text-slate px-2.5 py-0.5 rounded-full font-medium">{picked.regulator}</span>
                </div>
              )}

              {!compact && (
                <p className="text-slate text-sm leading-relaxed mb-5 italic">"{picked.tagline}"</p>
              )}

              <div className="flex flex-col gap-1">
                <Link
                  to={`/jurisdiction/${picked.slug}`}
                  className={compact
                    ? "block bg-white text-brand-navy font-bold text-[11px] py-1.5 px-3 rounded-lg no-underline hover:bg-white/90 transition-all"
                    : "block bg-gradient-to-br from-brand-navy to-brand-teal text-white font-bold text-sm py-3 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
                  }
                >
                  {compact ? `Explore ${picked.name} →` : `See what's happening in ${picked.name} →`}
                </Link>
                <button
                  onClick={handleReset}
                  className={compact
                    ? "text-white/60 text-[11px] font-medium hover:text-white transition-colors cursor-pointer bg-transparent border-none py-0.5"
                    : "text-slate text-sm font-medium hover:text-brand-navy transition-colors cursor-pointer bg-transparent border-none py-1"
                  }
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
