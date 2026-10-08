// One building, built once. Every scene of the film re-uses this exact model.
import * as THREE from 'three';

export const B = { FH: 4, N: 6, ZF: 10, ZB: -10, H: 24 };

// ---------------------------------------------------------------- materials
export const dissolveU = { value: 0 };
const GOLD = new THREE.Color(1.0, 0.78, 0.42);

/** Patches a material so the facade can dissolve upward with a thin golden edge. */
function dissolvable(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uD = dissolveU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wpp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpp = instanceMatrix * wpp;
        #endif
        vWP = (modelMatrix * wpp).xyz;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWP;
        uniform float uD;
        float dissS(vec3 p){
          float n = 0.5 + 0.25*sin(p.x*0.62+p.y*0.31) + 0.25*sin(p.x*1.7-p.y*1.13+p.z);
          float h = fract(sin(dot(floor(p.xy*1.6), vec2(12.9898,78.233)))*43758.5453);
          return p.y/27.0*0.62 + (n*0.7 + h*0.3)*0.38;
        }`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float dS = dissS(vWP);
        float dT = uD*1.34 - 0.17;
        if (dS < dT) discard;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float edge = 1.0 - smoothstep(0.0, 0.035, dS - dT);
        totalEmissiveRadiance += vec3(${GOLD.r.toFixed(2)},${GOLD.g.toFixed(2)},${GOLD.b.toFixed(2)}) * edge * 3.0 * step(0.001, uD) * step(uD, 0.999);`
      );
  };
  mat.customProgramCacheKey = () => 'dissolve';
  return mat;
}

function patternTexture() {
  // Eight-point-star lattice used for the mashrabiya-style screens (alpha mask).
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const cell = s / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const cx = cell * (i + 0.5), cy = cell * (j + 0.5), R = cell * 0.40, r = cell * 0.2;
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r : R;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pavingTexture() {
  const s = 512, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#d6c8aa'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(${150 + Math.random() * 60},${130 + Math.random() * 50},${100 + Math.random() * 40},0.05)`;
    g.fillRect(Math.random() * s, Math.random() * s, 3, 3);
  }
  g.strokeStyle = 'rgba(120,100,70,0.35)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export const SYS = {}; // system-group -> materials (highlightable)
function sysMat(group, color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, ...opts });
  m.userData.baseEm = m.emissive.clone();
  (SYS[group] ||= []).push(m);
  return m;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, ...o });

const M = {
  stone: dissolvable(std(0xdac5a0, { roughness: 0.85 })),
  stoneDark: dissolvable(std(0xb59a72, { roughness: 0.8 })),
  glass: dissolvable(new THREE.MeshPhysicalMaterial({
    color: 0x6f8f9c, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.42,
    envMapIntensity: 1.6, side: THREE.DoubleSide, clearcoat: 1,
  })),
  screen: dissolvable(std(0xcaa96f, { roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, alphaTest: 0.5 })),
  concrete: std(0xcfc9bd), wall: std(0xf3eee4), wallWarm: std(0xe9dfcc),
  floor: std(0xbfb8aa, { roughness: 0.6 }),
  lobbyFloor: std(0xe8dfcd, { roughness: 0.22, metalness: 0.05 }),
  carpet: std(0x56655e), wood: std(0x8b6a4b, { roughness: 0.55 }), dark: std(0x2a2d30, { roughness: 0.5, metalness: 0.4 }),
  white: std(0xf4f4f2), paper: std(0xe8e4da),
  steel: std(0x9aa3a8, { roughness: 0.35, metalness: 0.8 }),
  glassIn: new THREE.MeshPhysicalMaterial({ color: 0x9fc1cc, roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false }),
  light: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4) }),
  skin: std(0xc89873, { roughness: 0.7 }), thobe: std(0xf2f0ea, { roughness: 0.9 }), shemagh: std(0xd8d3c8),
  suit: std(0x2f3a45), hivis: std(0xe9b12a), navy: std(0x24364a), helmet: std(0xf0f0f0),
  grass: std(0x4d7a3c, { roughness: 1 }), shrub: std(0x3b6a38, { roughness: 1 }), soil: std(0x7b5f45, { roughness: 1 }),
  trunk: std(0x8a7355, { roughness: 1 }), asphalt: std(0x35373a, { roughness: 0.95 }),
  sys: {
    hvac: sysMat('hvac', 0xaeb8c0, { roughness: 0.4, metalness: 0.6 }),
    hvacDark: sysMat('hvac', 0x4a525a, { roughness: 0.5, metalness: 0.5 }),
    elec: sysMat('elec', 0x8d9498, { roughness: 0.45, metalness: 0.6 }),
    elecTray: sysMat('elec', 0xc7a24a, { roughness: 0.4, metalness: 0.7 }),
    water: sysMat('water', 0x2f7fc4, { roughness: 0.35, metalness: 0.5 }),
    waterTank: sysMat('water', 0x5aa0d0, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.55 }),
    drain: sysMat('water', 0x6e757a, { roughness: 0.5, metalness: 0.4 }),
    elev: sysMat('elev', 0xb8bdc2, { roughness: 0.3, metalness: 0.85 }),
    elevDark: sysMat('elev', 0x3b4046, { roughness: 0.5, metalness: 0.6 }),
    sec: sysMat('sec', 0x2d3a46, { roughness: 0.45, metalness: 0.5 }),
    secDesk: sysMat('sec', 0x6a5440, { roughness: 0.5 }),
    firepump: sysMat('firepump', 0xc0281f, { roughness: 0.4, metalness: 0.5 }),
    firepipe: sysMat('firepump', 0xd23a2a, { roughness: 0.35, metalness: 0.6 }),
    firetank: sysMat('firepump', 0xb9b0a0, { roughness: 0.5, metalness: 0.3 }),
    fire: sysMat('fire', 0xd23a2a, { roughness: 0.35, metalness: 0.5 }),
    fireWhite: sysMat('fire', 0xf2f2f0, { roughness: 0.5 }),
    cctv: sysMat('cctv', 0xe4e6e8, { roughness: 0.3, metalness: 0.3 }),
    cctvDark: sysMat('cctv', 0x15181b, { roughness: 0.15, metalness: 0.6 }),
    clean: sysMat('clean', 0x2b8a9a, { roughness: 0.5 }),
    cleanY: sysMat('clean', 0xe3c035, { roughness: 0.5 }),
  },
};
export { M };

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  sph: new THREE.SphereGeometry(1, 20, 14),
};

// ---------------------------------------------------------------- helpers
export function bx(parent, w, h, d, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo.box, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true;
  parent.add(m); return m;
}
export function cy(parent, r, h, mat, x, y, z, o = {}) { // vertical cylinder; o.rot to tilt
  const m = new THREE.Mesh(geo.cyl, mat);
  m.scale.set(r, h, r); m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function sp(parent, r, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo.sph, mat);
  m.scale.set(r, o.sy ? r * o.sy : r, r); m.position.set(x, y, z);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
/** Pipe between two points. */
export function pipe(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const d = Bv.clone().sub(A), len = d.length();
  const m = new THREE.Mesh(geo.cyl, mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.scale.set(r, len, r);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function polyPipe(parent, pts, r, mat) {
  for (let i = 0; i < pts.length - 1; i++) pipe(parent, pts[i], pts[i + 1], r, mat);
  for (let i = 1; i < pts.length - 1; i++) sp(parent, r * 1.15, mat, ...pts[i], { cast: false });
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
export const glowTex = glowTexture();

export function makeFan(r, mat, darkMat) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 8, 28), darkMat); ring.rotation.x = Math.PI / 2; g.add(ring);
  const rot = new THREE.Group(); g.add(rot); g.userData.rot = rot;
  const hub = new THREE.Mesh(geo.cyl, darkMat); hub.scale.set(r * 0.18, r * 0.12, r * 0.18); rot.add(hub);
  for (let b = 0; b < 5; b++) {
    const bl = new THREE.Mesh(geo.box, mat); bl.scale.set(r * 0.82, r * 0.025, r * 0.26);
    const a = (b / 5) * Math.PI * 2; bl.position.set(Math.cos(a) * r * 0.5, 0, -Math.sin(a) * r * 0.5); bl.rotation.y = a; bl.rotation.z = 0.25;
    rot.add(bl);
  }
  return g;
}

// ---------------------------------------------------------------- people
export function person(opts = {}) {
  const g = new THREE.Group();
  const body = opts.body || M.thobe, head = opts.head || M.shemagh;
  const legs = [];
  for (const sx of [-0.1, 0.1]) {
    const l = new THREE.Group(); l.position.set(sx, 0.9, 0);
    const m = new THREE.Mesh(geo.cyl, opts.legs || body); m.scale.set(0.085, 0.88, 0.085); m.position.y = -0.44; m.castShadow = true; l.add(m);
    g.add(l); legs.push(l);
  }
  const torso = new THREE.Mesh(geo.cyl, body); torso.scale.set(0.2, 0.7, 0.14); torso.position.y = 1.25; torso.castShadow = true; g.add(torso);
  const arms = [];
  for (const sx of [-0.26, 0.26]) {
    const a = new THREE.Group(); a.position.set(sx, 1.55, 0);
    const m = new THREE.Mesh(geo.cyl, body); m.scale.set(0.065, 0.62, 0.065); m.position.y = -0.3; m.castShadow = true; a.add(m);
    g.add(a); arms.push(a);
  }
  const h = new THREE.Mesh(geo.sph, M.skin); h.scale.set(0.12, 0.14, 0.12); h.position.y = 1.72; g.add(h);
  const cap = new THREE.Mesh(geo.sph, head); cap.scale.set(0.135, 0.1, 0.135); cap.position.y = 1.8; g.add(cap);
  g.userData = { legs, arms };
  return g;
}
export function walk(p, ph) {
  const s = Math.sin(ph) * 0.45;
  p.userData.legs[0].rotation.x = s; p.userData.legs[1].rotation.x = -s;
  p.userData.arms[0].rotation.x = -s * 0.7; p.userData.arms[1].rotation.x = s * 0.7;
  p.children[2].position.y = 1.25 + Math.abs(Math.cos(ph)) * 0.015;
}

// ---------------------------------------------------------------- the building
export function buildBuilding() {
  const root = new THREE.Group();
  const shell = new THREE.Group();   // dissolves in the cutaway
  const inner = new THREE.Group();
  const ind = {};                    // status indicators
  const anchors = {};                // world anchors for pins / pathway
  const shellMeshes = [];
  root.add(inner, shell);

  const FH = B.FH;
  const at = (name, x, y, z) => (anchors[name] = new THREE.Vector3(x, y, z));

  // ---- structure -------------------------------------------------------
  for (let i = 0; i <= 6; i++) bx(inner, 40, 0.4, 20, M.concrete, 0, FH * i - 0.2, 0);
  bx(inner, 40, 24, 0.4, M.wall, 0, 12, -10.2);
  // back-wall coloured bands so depth reads when the facade is gone
  for (let i = 0; i < 6; i++) bx(inner, 40, 0.3, 0.05, M.wallWarm, 0, FH * i + 3.2, -9.97, { cast: false });
  // slab edge thickening reads as the building's "section line"
  for (let i = 0; i <= 6; i++) bx(inner, 40.6, 0.06, 0.06, M.dark, 0, FH * i - 0.02, 10.0, { cast: false });
  // podium & steps
  bx(inner, 44, 0.3, 24, M.stoneDark, 0, -0.17, 0);
  bx(inner, 16, 0.18, 3.5, M.stone, 0, 0.09, 11.7);
  bx(inner, 14, 0.18, 2, M.stone, 0, 0.09 + 0.18, 11.0);

  // ---- shell (facade) ----------------------------------------------------
  const S = (m) => { shellMeshes.push(m); return m; };
  for (let i = 0; i < 6; i++) {
    const y0 = FH * i;
    if (i === 0) {
      // ground floor: glazing with a wide entrance opening
      for (const sx of [-1, 1]) S(bx(shell, 14, 3.2, 0.1, M.glass, sx * 13, y0 + 1.9, 10, { cast: false }));
      S(bx(shell, 12, 0.5, 0.1, M.glass, 0, y0 + 3.45, 10, { cast: false }));
    } else {
      S(bx(shell, 40, 3.2, 0.1, M.glass, 0, y0 + 1.9, 10, { cast: false }));
    }
    S(bx(shell, 40, 0.75, 0.3, M.stone, 0, y0 + 3.85, 10.1)); // spandrel
    S(bx(shell, 40.4, 0.16, 1.1, M.stone, 0, y0 + 3.55, 10.55)); // brise-soleil ledge
  }
  S(bx(shell, 40, 1.1, 0.4, M.stone, 0, 24.55, 10.1)); // parapet
  S(bx(shell, 40, 1.1, 0.4, M.stone, 0, 24.55, -9.9)); // parapet back (stays with shell: fine)
  for (const sx of [-1, 1]) {
    S(bx(shell, 0.4, 24, 20, M.stone, sx * 20.2, 12, 0));
    S(bx(shell, 0.4, 1.1, 20, M.stone, sx * 20.2, 24.55, 0));
  }
  for (let k = 0; k <= 16; k++) { // vertical fins
    const x = -20 + k * 2.5;
    if (Math.abs(x) < 6.1 && k !== 0) { S(bx(shell, 0.4, 20.1, 0.8, M.stone, x, 14.05, 10.4)); continue; }
    S(bx(shell, 0.4, 24, 0.8, M.stone, x, 12, 10.4));
  }
  // entrance portal, canopy and columns
  S(bx(shell, 13, 0.55, 7, M.stone, 0, 4.55, 13.4));
  S(bx(shell, 13.4, 0.2, 7.4, M.stoneDark, 0, 4.2, 13.4));
  for (const sx of [-1, 1]) for (const z of [15.6]) S(bx(shell, 0.55, 4.3, 0.55, M.stone, sx * 5.8, 2.15, z));
  // blank stone fascia above the entrance - left clear for the official logo in post
  S(bx(shell, 9, 1.8, 0.15, M.stoneDark, 0, 6.2, 10.9));
  // entrance doors (glass + steel frames)
  S(bx(shell, 6, 3.2, 0.06, M.glass, 0, 1.9, 10.05, { cast: false }));
  for (const x of [-3, -1, 1, 3]) S(bx(shell, 0.07, 3.3, 0.1, M.dark, x, 1.7, 10.05));
  // mashrabiya-style lattice screens
  const pat = patternTexture(); pat.repeat.set(10, 18);
  const scrMat2 = dissolvable(new THREE.MeshStandardMaterial({ color: 0xcaa96f, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide, alphaMap: pat, alphaTest: 0.5 }));
  scrMat2.customProgramCacheKey = () => 'dissolve3';
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 19.4), scrMat2);
    p.position.set(sx * 16.7, 13.8, 11.2); p.castShadow = true; p.receiveShadow = true;
    shell.add(p); shellMeshes.push(p);
    // frame
    S(bx(shell, 6.2, 0.2, 0.25, M.stoneDark, sx * 16.7, 23.5, 11.2));
    S(bx(shell, 6.2, 0.2, 0.25, M.stoneDark, sx * 16.7, 4.1, 11.2));
  }
  shell.traverse((o) => { if (o.isMesh) { o.userData.cast = o.castShadow; } });

  // ---- ground-floor zones ------------------------------------------------
  // Lobby floor
  bx(inner, 13, 0.02, 19, M.lobbyFloor, 0, 0.02, 0, { cast: false });
  // upper-floor carpet in open office
  for (let i = 1; i < 6; i++) bx(inner, 12, 0.02, 19.6, M.carpet, 0, FH * i + 0.015, 0, { cast: false });

  // interior glass partitions
  const part = (x, y0, z0, z1) => {
    bx(inner, 0.06, 3.6, z1 - z0, M.glassIn, x, y0 + 1.8, (z0 + z1) / 2, { cast: false });
    bx(inner, 0.1, 0.1, z1 - z0, M.dark, x, y0 + 3.55, (z0 + z1) / 2, { cast: false });
  };
  for (let i = 1; i < 6; i++) { part(6.2, FH * i, -9.7, 1); part(6.2, FH * i, 3.5, 9.8); part(-5.9, FH * i, 3.2, 9.8); }

  // lighting panels
  const lights = new THREE.InstancedMesh(geo.box, M.light, 6 * 6);
  let li = 0; const mtx = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) for (const x of [-3, 3]) for (const z of [-6, 0, 6]) {
    mtx.compose(new THREE.Vector3(x, FH * (i + 1) - 0.43, z), new THREE.Quaternion(), new THREE.Vector3(2.4, 0.04, 0.4));
    lights.setMatrixAt(li++, mtx);
  }
  inner.add(lights);

  // ---- ELEVATORS (x -11..-6) --------------------------------------------
  const cars = [];
  bx(inner, 0.25, 24, 7.8, M.concrete, -11.1, 12, -5.9);
  bx(inner, 0.25, 24, 7.8, M.concrete, -5.9, 12, -5.9);
  bx(inner, 5.2, 24, 0.06, M.glassIn, -8.5, 12, -2, { cast: false });
  for (let i = 0; i <= 6; i++) bx(inner, 5.2, 0.12, 0.12, M.sys.elevDark, -8.5, FH * i - 0.05, -2);
  for (const cx of [-9.7, -7.4]) {
    for (const dx of [-0.95, 0.95]) bx(inner, 0.08, 24, 0.12, M.sys.elev, cx + dx, 12, -8.6, { cast: false });
    const car = new THREE.Group();
    bx(car, 1.7, 2.5, 2.2, M.sys.elev, 0, 1.25, 0);
    bx(car, 1.5, 0.08, 1.9, M.light, 0, 2.42, 0.02, { cast: false });
    bx(car, 1.0, 2.1, 0.06, M.sys.elevDark, 0, 1.05, 1.12, { cast: false });
    bx(car, 1.6, 0.14, 2.1, M.sys.elevDark, 0, 2.55, 0);
    // counterweight
    const cw = bx(inner, 0.5, 2.6, 0.3, M.sys.elevDark, cx - 0.0, 12, -9.4);
    car.position.set(cx, 0, -5.4);
    inner.add(car);
    const cable = bx(inner, 0.04, 1, 0.04, M.sys.elevDark, cx, 12, -5.4, { cast: false });
    cars.push({ car, cw, cable, cx });
  }
  // machine room on roof
  bx(inner, 5.2, 2.2, 7.4, M.sys.elevDark, -8.5, 25.1, -6.1);
  bx(inner, 5.0, 0.12, 7.2, M.concrete, -8.5, 26.25, -6.1);
  bx(inner, 3.4, 1.0, 1.6, M.sys.elev, -8.5, 25.6, -6.6);
  ind.elev = indicator(inner, -8.5, 25.4, -2.3); at('elev', -8.5, 12, -3);
  at('elevMachine', -8.5, 25.6, -6.1);
  // call buttons & floor indicators (landing)
  for (let i = 0; i < 6; i++) bx(inner, 0.12, 0.2, 0.05, M.sys.elev, -5.4, FH * i + 1.1, -1.2, { cast: false });

  // ---- RISERS ------------------------------------------------------------
  // fire riser (red) x=6.5, water riser x=-12.6, drain x=-12, electrical tray x=12.3
  cy(inner, 0.14, 24.2, M.sys.firepipe, 6.5, 12, -9.2);
  cy(inner, 0.1, 24.2, M.sys.water, -12.6, 12, -9.2);
  cy(inner, 0.14, 24.2, M.sys.drain, -12.0, 12, -9.2);
  bx(inner, 0.7, 24, 0.12, M.sys.elecTray, 12.3, 12, -9.8);
  for (let i = 1; i < 6; i++) {
    const y0 = FH * i;
    bx(inner, 0.7, 0.9, 0.3, M.sys.elec, 11.4, y0 + 1.6, -9.7);                     // floor DB
    bx(inner, 0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.0, 0.6) }), 11.4, y0 + 1.95, -9.5, { cast: false });
    bx(inner, 0.5, 0.7, 0.25, M.sys.fire, 6.0, y0 + 1.5, -9.7);                      // hose reel cabinet
    pipe(inner, [6.5, y0 + 1.1, -9.2], [6.3, y0 + 1.1, -9.6], 0.06, M.sys.firepipe);
    // wet-core branches
    pipe(inner, [-12.6, y0 + 2.6, -9.2], [-15.5, y0 + 2.6, -9.2], 0.06, M.sys.water);
    pipe(inner, [-12.0, y0 + 0.3, -9.2], [-17.5, y0 + 0.3, -9.2], 0.08, M.sys.drain);
    // wet core fittings: wash-basin counters + doors
    bx(inner, 2.4, 0.9, 0.6, M.sys.clean, -16.2, y0 + 0.45, -9.5);
    bx(inner, 2.4, 0.04, 0.6, M.white, -16.2, y0 + 0.92, -9.5);
    bx(inner, 0.05, 3.6, 5.0, M.wall, -11.7 + 0.0, y0 + 1.8, -7.0, { cast: false });
  }

  // ---- HVAC --------------------------------------------------------------
  for (let i = 0; i < 6; i++) {
    const y0 = FH * i, yc = FH * (i + 1) - 0.62;
    // AHU plant at x 13..19.4 (floors 1-5), main duct to the west
    if (i > 0) {
      bx(inner, 6.2, 2.4, 3.4, M.sys.hvac, 16.3, y0 + 1.2, -3.5);
      bx(inner, 6.0, 2.2, 0.05, M.sys.hvacDark, 16.3, y0 + 1.2, -1.76, { cast: false });
      for (let k = 0; k < 6; k++) bx(inner, 5.6, 0.04, 0.03, M.sys.hvac, 16.3, y0 + 0.5 + k * 0.32, -1.72, { cast: false });
      const fan = makeFan(0.6, M.sys.hvac, M.sys.hvacDark); fan.rotation.x = Math.PI / 2; fan.position.set(14.2, y0 + 1.5, -1.68); fan.scale.setScalar(1);
      inner.add(fan); (buildBuilding.fans ||= []).push(fan);
    }
    const duct = (x0, x1, z, w = 0.9, h = 0.42, y = yc) => bx(inner, Math.abs(x1 - x0), h, w, M.sys.hvac, (x0 + x1) / 2, y, z);
    duct(13.4, -5.2, 5.0);
    duct(8.0, -5.0, -7.0);
    for (const x of [-3, 3]) bx(inner, 0.55, 0.38, 12.6, M.sys.hvac, x, yc, -1);
    for (let k = 0; k < 4; k++) for (const x of [-3, 3]) bx(inner, 0.8, 0.07, 0.8, M.sys.hvacDark, x, yc - 0.23, -6 + k * 3.8, { cast: false });
    bx(inner, 0.5, 0.42, 6, M.sys.hvac, 13.0, yc, 2.0); // duct from AHU
    // vertical supply riser at x=13..
    if (i === 0) bx(inner, 1.0, 24, 0.9, M.sys.hvac, 19.5, 12, -9.2);
    // chilled-water pipes (blue/white lagged)
    pipe(inner, [19.2, yc + 0.35, -9.2], [14.5, yc + 0.35, -9.2], 0.09, M.sys.water);
  }
  // roof plant
  for (const x of [13.5, 18]) {
    bx(inner, 3.6, 2.4, 6, M.sys.hvac, x, 25.2, -2.5);
    for (const z of [-4.5, -0.5]) {
      cy(inner, 1.15, 0.2, M.sys.hvacDark, x, 26.5, z);
      const fan = makeFan(1.0, M.sys.hvac, M.sys.hvacDark); fan.position.set(x, 26.65, z); inner.add(fan); (buildBuilding.fans ||= []).push(fan);
    }
    for (let k = 0; k < 8; k++) bx(inner, 3.4, 0.05, 0.04, M.sys.hvacDark, x, 24.7 + k * 0.2, 0.52, { cast: false });
  }
  pipe(inner, [19.5, 24.2, -9.2], [19.5, 24.8, -4], 0.14, M.sys.water);
  // photovoltaic array on the roof (sustainability)
  const pvMat = new THREE.MeshStandardMaterial({ color: 0x14243a, roughness: 0.18, metalness: 0.7 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const pv = bx(inner, 1.9, 0.06, 1.1, pvMat, -3.6 + c * 2.05, 24.55 + r * 0.02, -7 + r * 3.6); pv.rotation.x = -0.28; pv.position.y += 0.2;
    bx(inner, 0.08, 0.4, 0.08, M.sys.hvacDark, -3.6 + c * 2.05, 24.3, -7 + r * 3.6 + 0.2, { cast: false });
  }
  ind.hvac = indicator(inner, 16.3, 14.6, -1.5); at('hvac', 16.3, 14, -3.5);
  at('hvacRoof', 15.7, 25.6, -2.5);
  at('ahu3', 16.3, 13.2, -1.9);

  // ---- ELECTRICAL (G room x 12..20) -------------------------------------
  bx(inner, 0.15, 3.6, 8.6, M.wall, 12.1, 1.8, -5.5, { cast: false });
  bx(inner, 8, 3.6, 0.06, M.glassIn, 16, 1.8, -1.2, { cast: false });
  const ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.0, 0.6) });
  for (let k = 0; k < 6; k++) {
    bx(inner, 1.05, 2.3, 0.8, M.sys.elec, 13.6 + k * 1.15, 1.15, -9.3);
    bx(inner, 0.7, 0.9, 0.03, M.sys.elecTray, 13.6 + k * 1.15, 1.35, -8.89, { cast: false });
    bx(inner, 0.1, 0.1, 0.03, ledM, 13.6 + k * 1.15, 2.0, -8.88, { cast: false });
  }
  const tr = bx(inner, 1.9, 1.8, 1.6, M.sys.elec, 18.2, 0.9, -5.0);
  for (let k = 0; k < 9; k++) bx(inner, 0.06, 1.5, 1.8, M.sys.hvacDark, 17.4 + k * 0.2, 0.95, -5.0);
  bx(inner, 1.4, 1.6, 0.6, M.sys.elec, 14.5, 0.8, -4.0);
  pipe(inner, [18.2, 1.8, -5], [18.2, 3.4, -5], 0.05, M.sys.elecTray);
  bx(inner, 8, 0.25, 0.5, M.sys.elecTray, 16, 3.3, -9.4);
  for (let i = 0; i < 6; i++) bx(inner, 8.5, 0.12, 0.4, M.sys.elecTray, 16.0, FH * (i + 1) - 0.5, -9.4, { cast: false });
  ind.elec = indicator(inner, 16, 2.7, -3.0); at('elec', 15.8, 1.6, -6);
  at('elecRiser', 12.3, 10, -9.5);

  // ---- WATER (G room x -19..-13; roof tank) -----------------------------
  bx(inner, 0.15, 3.6, 8.6, M.wall, -12.0, 1.8, -5.5, { cast: false });
  bx(inner, 6.0, 2.6, 3.2, M.sys.waterTank, -16.0, 1.3, -7.6, { cast: false });
  const waterLevel = bx(inner, 5.7, 1.7, 2.9, new THREE.MeshStandardMaterial({ color: 0x3f8fd0, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.75 }), -16.0, 0.9, -7.6, { cast: false });
  for (let k = 0; k < 3; k++) {
    cy(inner, 0.38, 0.5, M.sys.water, -17.5 + k * 1.6, 0.35, -3.2, { rz: Math.PI / 2 });
    cy(inner, 0.28, 0.55, M.sys.water, -17.9 + k * 1.6, 0.4, -3.2, { rz: Math.PI / 2 });
    bx(inner, 1.3, 0.3, 0.9, M.sys.hvacDark, -17.7 + k * 1.6, 0.15, -3.2);
    pipe(inner, [-17.5 + k * 1.6, 0.9, -3.2], [-17.5 + k * 1.6, 1.8, -3.2], 0.09, M.sys.water);
  }
  pipe(inner, [-17.5, 1.8, -3.2], [-14.1, 1.8, -3.2], 0.12, M.sys.water);
  pipe(inner, [-14.1, 1.8, -3.2], [-14.1, 1.8, -9.2], 0.12, M.sys.water);
  pipe(inner, [-14.1, 1.8, -9.2], [-12.6, 1.8, -9.2], 0.12, M.sys.water);
  cy(inner, 0.5, 1.7, M.sys.water, -12.9, 0.95, -4.6); // pressure vessel
  // roof tank
  bx(inner, 6, 2.6, 4, M.sys.waterTank, -16, 25.4, -6, { cast: false });
  bx(inner, 5.7, 1.5, 3.7, new THREE.MeshStandardMaterial({ color: 0x3f8fd0, roughness: 0.1, transparent: true, opacity: 0.75 }), -16, 25.0, -6, { cast: false });
  bx(inner, 6.4, 0.14, 4.4, M.sys.hvacDark, -16, 24.1, -6);
  ind.water = indicator(inner, -16, 3.0, -4.5); at('water', -16, 1.4, -5);
  at('waterRoof', -16, 25.4, -6);

  // ---- FIRE PUMPS (G room x 6.5..12) ------------------------------------
  bx(inner, 0.15, 3.6, 8.6, M.wall, 6.1, 1.8, -5.5, { cast: false });
  bx(inner, 5.4, 0.06, 0.06, M.dark, 9.3, 3.5, -1.2, { cast: false });
  bx(inner, 3.2, 2.2, 2.0, M.sys.firetank, 9.8, 1.1, -8.7);
  for (let k = 0; k < 3; k++) {
    const x = 7.4 + k * 1.7, big = k === 2;
    cy(inner, big ? 0.55 : 0.4, 1.3, M.sys.firepump, x, 0.75, -4.6, { rz: Math.PI / 2 });
    bx(inner, big ? 1.5 : 1.1, big ? 0.9 : 0.7, big ? 0.9 : 0.7, M.sys.firepump, x + (big ? 1.0 : 0.8) - 0.4, big ? 0.85 : 0.65, -4.6);
    bx(inner, 2.2, 0.2, 1.1, M.sys.hvacDark, x + 0.1, 0.1, -4.6);
    pipe(inner, [x - 0.3, 0.75, -4.6], [x - 0.3, 2.3, -4.6], 0.1, M.sys.firepipe);
  }
  pipe(inner, [7.1, 2.3, -4.6], [10.6, 2.3, -4.6], 0.15, M.sys.firepipe);
  pipe(inner, [7.1, 2.3, -4.6], [7.1, 2.3, -9.2], 0.14, M.sys.firepipe);
  pipe(inner, [7.1, 2.3, -9.2], [6.5, 2.3, -9.2], 0.14, M.sys.firepipe);
  bx(inner, 1.2, 2.1, 0.6, M.sys.fire, 6.9, 1.05, -2.2);   // controller
  const gauge = cy(inner, 0.22, 0.08, M.sys.fireWhite, 8.2, 2.9, -4.1, { rx: Math.PI / 2 });
  ind.firepump = indicator(inner, 9.2, 3.1, -2.4); at('firepump', 9.0, 1.4, -4.6);
  at('fireTank', 9.8, 1.2, -8.7);
  // fire standpipe / sprinkler mains per floor + heads + detectors (instanced)
  const heads = new THREE.InstancedMesh(geo.cyl, M.sys.fire, 6 * 14);
  const det = new THREE.InstancedMesh(geo.cyl, M.sys.fireWhite, 6 * 8);
  let hi = 0, di = 0;
  const q0 = new THREE.Quaternion();
  for (let i = 0; i < 6; i++) {
    const yc = FH * (i + 1) - 0.4;
    pipe(inner, [6.5, yc, -9.2], [6.5, yc, 7.6], 0.07, M.sys.firepipe);
    pipe(inner, [6.5, yc, 7.6], [-5.4, yc, 7.6], 0.06, M.sys.firepipe);
    for (const z of [-7.5, -2.5, 2.5, 7.6]) pipe(inner, [6.5, yc, z], [-5.4, yc, z], 0.05, M.sys.firepipe);
    for (const z of [-2.5, 7.6]) for (const x of [-4.4, -1.7, 1, 3.7]) {
      mtx.compose(new THREE.Vector3(x, yc - 0.1, z), q0, new THREE.Vector3(0.05, 0.14, 0.05)); heads.setMatrixAt(hi++, mtx);
    }
    for (const x of [-4, 0, 4]) for (const z of [-7.5, 2.5]) {
      if (di < 6 * 8) { mtx.compose(new THREE.Vector3(x, FH * (i + 1) - 0.46, z + 1.0), q0, new THREE.Vector3(0.14, 0.05, 0.14)); det.setMatrixAt(di++, mtx); }
    }
    // alarm sounder + call points
    bx(inner, 0.18, 0.18, 0.06, M.sys.fire, 5.4, FH * i + 1.3, -9.9, { cast: false });
  }
  heads.count = hi; det.count = di; inner.add(heads, det);
  // fire alarm panel + exit signs (G lobby)
  bx(inner, 0.8, 1.0, 0.18, M.sys.fire, -4.6, 1.5, -9.8);
  bx(inner, 0.1, 0.1, 0.03, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.0, 0.6) }), -4.6, 1.8, -9.68, { cast: false });
  const exitM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 1.6, 0.5) });
  for (const x of [-5, 5]) bx(inner, 0.5, 0.18, 0.04, exitM, x, 3.1, -9.8, { cast: false });
  ind.fire = indicator(inner, 0.3, 15.2, -2.0); at('fire', 0, 15.1, 2.5);
  at('facp', -4.6, 1.6, -9.6);
  at('fireF3', 4.0, 15.4, 2.5);

  // ---- SECURITY (G lobby) ------------------------------------------------
  bx(inner, 3.4, 1.05, 1.0, M.sys.secDesk, 4.4, 0.52, 2.5);
  bx(inner, 3.4, 0.06, 1.2, M.sys.sec, 4.4, 1.08, 2.5);
  bx(inner, 0.9, 0.5, 0.05, M.dark, 4.4, 1.38, 2.5);
  const guard = person({ body: M.navy, head: M.navy, legs: M.navy }); guard.position.set(4.4, 0, 3.4); inner.add(guard);
  for (const x of [-1.4, 1.4]) { // turnstiles
    bx(inner, 0.12, 1.0, 0.9, M.sys.sec, x, 0.5, 5.2);
    bx(inner, 0.7, 0.9, 0.04, M.glassIn, x + (x > 0 ? -0.4 : 0.4), 0.9, 5.2, { cast: false });
  }
  bx(inner, 0.06, 0.06, 0.06, ledM, -1.4, 1.05, 4.9, { cast: false });
  for (let k = -8; k <= 8; k++) cy(inner, 0.14, 0.9, M.sys.sec, k * 2.2, 0.45, 15.8); // bollards on the plaza side
  ind.sec = indicator(inner, 4.4, 2.5, 2.5); at('sec', 4.4, 1.2, 3.2);

  // ---- CCTV --------------------------------------------------------------
  const cams = []; // {pos, dir}
  const addCam = (x, y, z, dirx, dirz, tilt = 0.5) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    cy(g, 0.12, 0.05, M.sys.cctv, 0, 0, 0);
    const dome = sp(g, 0.11, M.sys.cctvDark, 0, -0.03, 0, { cast: false });
    sp(g, 0.025, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.2, 0.15) }), 0.06, -0.08, 0.06, { cast: false });
    inner.add(g);
    cams.push({ g, x, y, z, dirx, dirz, tilt });
  };
  addCam(-4.2, 3.7, 10.35, -0.2, 1); addCam(4.2, 3.7, 10.35, 0.2, 1);
  addCam(-5.6, 3.4, -9.4, 0.5, 1); addCam(5.6, 3.4, -9.4, -0.5, 1);
  addCam(5.6, 3.5, 4.5, -1, 0);
  for (const i of [1, 2, 3, 4, 5]) addCam(5.4, FH * (i + 1) - 0.5, 6, -1, -0.2);
  for (const x of [-16, 16]) addCam(x, 6.4, 11.2, 0, 1);
  // view cones
  const coneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.4, 2.0), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const coneGeo = new THREE.ConeGeometry(1.6, 4.5, 20, 1, true); coneGeo.translate(0, -2.25, 0);
  const cones = [];
  for (const c of cams.slice(0, 6)) {
    const m = new THREE.Mesh(coneGeo, coneMat); m.position.set(c.x, c.y - 0.05, c.z);
    const d = new THREE.Vector3(c.dirx, -c.tilt, c.dirz).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    inner.add(m); cones.push(m);
  }
  ind.cctv = indicator(inner, 4.2, 4.6, 10.6); at('cctv', 0, 3.4, 10.4); at('cctvEntr', 4.2, 3.7, 10.4);
  at('cctvLobby', 5.6, 3.5, 4.5);

  // ---- CLEANING ----------------------------------------------------------
  const cart = new THREE.Group(); cart.position.set(-3.6, 0, 3.4);
  bx(cart, 0.9, 0.12, 0.5, M.sys.clean, 0, 0.35, 0);
  bx(cart, 0.9, 0.05, 0.5, M.sys.clean, 0, 0.8, 0);
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.22, 0.22]) bx(cart, 0.04, 0.8, 0.04, M.sys.hvacDark, sx, 0.4, sz);
  bx(cart, 0.4, 0.5, 0.35, M.sys.cleanY, 0.55, 0.45, 0);
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.2, 0.2]) cy(cart, 0.06, 0.04, M.dark, sx, 0.06, sz, { rz: Math.PI / 2 });
  for (let k = 0; k < 4; k++) bx(cart, 0.12, 0.28, 0.12, k % 2 ? M.sys.cleanY : M.sys.clean, -0.3 + k * 0.2, 0.95, 0);
  inner.add(cart);
  const cleaner = person({ body: M.sys.clean, head: M.sys.clean, legs: M.suit }); cleaner.position.set(-2.8, 0, 3.4); cleaner.rotation.y = -0.6; inner.add(cleaner);
  const cart2 = cart.clone(); cart2.position.set(8.2, FH * 1, 1.2); cart2.rotation.y = Math.PI / 2; inner.add(cart2);
  const bins = [];
  for (const [x, y, z] of [[-5.2, 0, 3.2], [5.2, FH, 3], [5.0, FH * 2, 3], [-5.2, FH * 3, 3], [-5.0, FH * 4, 3]]) {
    const b = cy(inner, 0.2, 0.55, M.sys.clean, x, y + 0.28, z); bins.push(b);
  }
  // lobby seating & reception plants (set dressing)
  for (const x of [-1.2, 1.2]) bx(inner, 1.5, 0.45, 0.6, M.sys.secDesk, x, 0.23, -4.2);
  cy(inner, 0.35, 0.5, M.stoneDark, -4.8, 0.25, 6.5); sp(inner, 0.5, M.shrub, -4.8, 0.95, 6.5, { sy: 1.2 });
  cy(inner, 0.35, 0.5, M.stoneDark, 4.8, 0.25, 7.5); sp(inner, 0.5, M.shrub, 4.8, 0.95, 7.5, { sy: 1.2 });
  ind.clean = indicator(inner, -3.4, 2.0, 3.4); at('clean', -3.3, 1.0, 3.4);
  at('lobby', 0, 1.8, 3);

  // ---- OFFICE FURNITURE (instanced) ----------------------------------------
  const nDesk = 5 * 8;
  const desks = new THREE.InstancedMesh(geo.box, M.wood, nDesk);
  const pedest = new THREE.InstancedMesh(geo.box, M.sys.hvacDark, nDesk);
  const mons = new THREE.InstancedMesh(geo.box, M.dark, nDesk);
  const chairs = new THREE.InstancedMesh(geo.box, M.suit, nDesk);
  let k = 0;
  const Vq = new THREE.Quaternion();
  for (let i = 1; i < 6; i++) for (const z of [-6.2, -0.8]) for (const x of [-4, -1.3, 1.4, 4]) {
    const y0 = FH * i;
    mtx.compose(new THREE.Vector3(x, y0 + 0.74, z), Vq, new THREE.Vector3(1.5, 0.05, 0.75)); desks.setMatrixAt(k, mtx);
    mtx.compose(new THREE.Vector3(x + 0.55, y0 + 0.37, z), Vq, new THREE.Vector3(0.4, 0.74, 0.65)); pedest.setMatrixAt(k, mtx);
    mtx.compose(new THREE.Vector3(x, y0 + 1.05, z - 0.15), Vq, new THREE.Vector3(0.5, 0.32, 0.04)); mons.setMatrixAt(k, mtx);
    mtx.compose(new THREE.Vector3(x - 0.1, y0 + 0.48, z + 0.62), Vq, new THREE.Vector3(0.5, 0.06, 0.5)); chairs.setMatrixAt(k, mtx);
    k++;
  }
  [desks, pedest, mons, chairs].forEach((m) => { m.castShadow = true; m.receiveShadow = true; inner.add(m); });
  // seated / standing staff
  const staff = [];
  for (const [x, i, z] of [[-4, 1, -5.2], [1.4, 2, -5.2], [-1.3, 3, 0.2], [4, 4, -5.2], [-4, 5, 0.2], [1.4, 1, 0.2]]) {
    const p = person({ body: (x + i) % 2 ? M.thobe : M.suit, head: M.shemagh }); p.position.set(x - 0.1, FH * i + 0.0, z); p.scale.setScalar(0.96);
    p.userData.legs.forEach((l) => (l.rotation.x = -1.35)); p.userData.arms.forEach((a) => (a.rotation.x = -0.9)); // seated look
    p.children.forEach((c) => { if (c.position.y > 0.5 && c.position.y < 2) c.position.y -= 0.4; });
    p.position.y += 0.3; p.rotation.y = Math.PI; inner.add(p); staff.push(p);
  }

  // ---- problem props (hidden until used) ----------------------------------
  const problems = {};
  // heat haze volume on floor 4 (index 3) AC failure - grows later
  const heat = new THREE.Mesh(geo.box, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.55, 0.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  heat.position.set(8, 14, 0); heat.scale.set(12, 3.6, 18); inner.add(heat); problems.heat = heat;
  // leak (floor 2 / index 1): drips + puddle
  const leakG = new THREE.Group(); leakG.position.set(-14.4, FH * 1, -8.6); inner.add(leakG);
  const drips = [];
  for (let d = 0; d < 6; d++) { const s = sp(leakG, 0.045, new THREE.MeshStandardMaterial({ color: 0x77b8e8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 2, 0, { cast: false }); s.scale.y = 0.09; drips.push(s); }
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 36), new THREE.MeshStandardMaterial({ color: 0x4a86b0, roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.0, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(-14.4, FH * 1 + 0.03, -7.4); inner.add(puddle);
  // archive cabinets near the leak (property at risk)
  for (let c = 0; c < 4; c++) bx(inner, 0.8, 1.8, 0.5, M.sys.hvacDark, -19.1 + c * 0.9, FH * 1 + 0.9, -9.5);
  // stain on ceiling
  const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x6d5a40, transparent: true, opacity: 0, depthWrite: false }));
  stain.rotation.x = Math.PI / 2; stain.position.set(-14.4, FH * 2 - 0.42, -8.2); inner.add(stain);
  // spill + overflowing bin in lobby (cleanliness)
  const spill = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.15, transparent: true, opacity: 0, depthWrite: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(-1.8, 0.04, 6.2); inner.add(spill);
  const litter = new THREE.Group(); litter.position.set(-5.2, 0.55, 3.2); inner.add(litter);
  for (let l = 0; l < 7; l++) { const p = bx(litter, 0.14, 0.01, 0.1, M.paper, (l - 3) * 0.05, 0.02 + l * 0.04, ((l * 37) % 7 - 3) * 0.03); p.rotation.set(l, l * 0.7, l * 0.3); }
  litter.scale.setScalar(0);
  // electrical fault sparks
  const sparks = new THREE.Group(); sparks.position.set(15.8, 1.6, -8.7); inner.add(sparks);
  const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.9, 0.6) });
  const sparkMs = [];
  for (let s = 0; s < 7; s++) sparkMs.push(sp(sparks, 0.03, sparkM, 0, 0, 0, { cast: false }));
  // security observation: figure loitering at a staff door + cone highlight
  const visitor = person({ body: M.suit, head: M.suit }); visitor.position.set(-7.3, 0, 8.2); visitor.visible = false; inner.add(visitor);
  // technician team (repair)
  const techs = new THREE.Group(); techs.position.set(14.6, FH * 3, -0.2); inner.add(techs); techs.visible = false;
  const t1 = person({ body: M.hivis, head: M.helmet, legs: M.navy }); t1.position.set(0, 0, 0); t1.rotation.y = 0.4;
  const t2 = person({ body: M.hivis, head: M.helmet, legs: M.navy }); t2.position.set(-1.4, 0, 0.4); t2.rotation.y = -0.2;
  techs.add(t1, t2);
  const ladder = bx(techs, 0.06, 2.6, 0.5, M.sys.hvac, 0.7, 1.3, 0.2); ladder.rotation.z = 0.12;

  // ---- exterior: lamps -------------------------------------------------------
  for (const sx of [-1, 1]) for (let k2 = 0; k2 < 5; k2++) {
    const x = sx * 7, z = 18 + k2 * 9;
    cy(inner, 0.07, 3.2, M.dark, x, 1.6, z); sp(inner, 0.2, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.2) }), x, 3.3, z, { cast: false });
  }

  root.userData = { shell, inner, shellMeshes, ind, anchors, cars, cams, cones, coneMat, problems: { ...problems, drips, puddle, stain, spill, litter, sparks, sparkMs, visitor, techs, leakG, bins, guard, cleaner, waterLevel, gauge }, staff, fans: buildBuilding.fans };
  return root;
}

// Status indicator: emissive disc + additive halo, colour driven by a value 0 (green) .. 2 (red).
const GREEN = new THREE.Color(0.1, 1.5, 0.55), AMBER = new THREE.Color(2.2, 1.35, 0.1), RED = new THREE.Color(2.6, 0.18, 0.12);
export function indicator(parent, x, y, z) {
  const dot = new THREE.Mesh(geo.sph, new THREE.MeshBasicMaterial({ color: GREEN.clone() }));
  dot.scale.setScalar(0.17); dot.position.set(x, y, z);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: GREEN.clone(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }));
  halo.scale.setScalar(1.3); halo.position.copy(dot.position);
  parent.add(dot, halo);
  const o = {
    dot, halo, v: 0, vis: 1,
    set(v, vis = 1, pulse = 0) {
      const c = new THREE.Color();
      if (v < 1) c.lerpColors(GREEN, AMBER, Math.max(0, v)); else c.lerpColors(AMBER, RED, Math.min(1, v - 1));
      dot.material.color.copy(c); halo.material.color.copy(c).multiplyScalar(0.8);
      const s = 1 + pulse * 0.25;
      dot.scale.setScalar(0.17 * s * vis); halo.scale.setScalar((1.0 + v * 0.5) * s * vis);
      dot.visible = halo.visible = vis > 0.01;
    },
  };
  return o;
}
