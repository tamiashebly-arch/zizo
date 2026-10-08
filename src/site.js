// Landscape, sky, palms, walking staff - everything around the (single) building.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { M, person, walk } from './building.js';

function pavingTex(repeatX, repeatY, base = '#d6c8aa', line = 'rgba(120,100,70,0.3)') {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6000; i++) {
    const v = 120 + Math.random() * 100;
    g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.72},0.06)`; g.fillRect(Math.random() * s, Math.random() * s, 4, 4);
  }
  g.strokeStyle = line; g.lineWidth = 3;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s / 2, 0); g.lineTo(i * s / 2, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 2); g.lineTo(s, i * s / 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function frondTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.clearRect(0, 0, 64, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 256); g.lineTo(32, 0); g.stroke();
  g.lineWidth = 2.2;
  for (let y = 250; y > 4; y -= 5) {
    const w = 30 * Math.sin(Math.min(1, (256 - y) / 200) * Math.PI * 0.85 + 0.15) + 3;
    g.beginPath(); g.moveTo(32, y); g.lineTo(32 - w, y - 14); g.moveTo(32, y); g.lineTo(32 + w, y - 14); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function trunkTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#8c7554'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 9) { g.fillStyle = 'rgba(60,45,28,0.55)'; g.fillRect(0, y, 64, 3); g.fillStyle = 'rgba(190,165,120,0.25)'; g.fillRect(0, y + 3, 64, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

export function buildSite(scene) {
  const site = new THREE.Group(); scene.add(site);

  // ---- ground
  const gmat = new THREE.MeshStandardMaterial({ map: pavingTex(60, 60), roughness: 0.85 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gmat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; site.add(ground);
  // central promenade (lighter, bigger tiles)
  const prom = new THREE.Mesh(new THREE.PlaneGeometry(12, 90), new THREE.MeshStandardMaterial({ map: pavingTex(3, 20, '#e6dcc4', 'rgba(120,100,70,0.45)'), roughness: 0.75 }));
  prom.rotation.x = -Math.PI / 2; prom.position.set(0, -0.005, 56); prom.receiveShadow = true; site.add(prom);
  // lawns & planters
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x5a8a45, roughness: 1 });
  for (const sx of [-1, 1]) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 60), lawnMat); lawn.position.set(sx * 20, 0.1, 50); lawn.receiveShadow = true; site.add(lawn);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.34, 60.6), M.stone); curb.position.set(sx * 20, 0.06, 50); curb.receiveShadow = true; site.add(curb);
    lawn.position.y = 0.12; curb.scale.y = 0.9;
  }
  // low hedges near the facade
  const R = rng(7);
  for (const sx of [-1, 1]) {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 1.4), M.shrub); hedge.position.set(sx * 13.5, 0.45, 13.2); hedge.castShadow = true; hedge.receiveShadow = true; site.add(hedge);
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.45 + R() * 0.3, 10, 8), M.shrub);
      s.position.set(sx * (6.8 + R() * 14), 0.7, 13.2 + R() * 0.6 - 0.3); s.scale.y = 0.8; s.castShadow = true; site.add(s);
    }
    for (let i = 0; i < 14; i++) { // flowering shrubs on the lawns
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.5 + R() * 0.4, 10, 8), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xc9a24a : 0x3f7040, roughness: 1 }));
      s.position.set(sx * (9 + R() * 22), 0.55, 20 + R() * 48); s.scale.y = 0.75; s.castShadow = true; site.add(s);
    }
  }

  // ---- palms (instanced fronds)
  const palms = [];
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 7; k++) palms.push([sx * 8.2, 16 + k * 8, 8 + R() * 3]);
    for (let k = 0; k < 6; k++) palms.push([sx * (16 + R() * 14), 20 + k * 9 + R() * 3, 7 + R() * 4]);
    palms.push([sx * 27, 14, 9]); palms.push([sx * 33, 15, 11]);
  }
  const frondGeo = (() => {
    const L = 3.6, seg = 8, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = 0, y = Math.sin(t * 1.5) * L * 0.62 * 0.9, z = t * L * 0.95 - Math.pow(t, 2.2) * L * 0.55 * 0 ;
      const yy = Math.sin(t * 1.1) * 1.0 - t * t * 1.6;
      const w = (0.15 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.95);
      pos.push(-w, yy, t * L, w, yy, t * L); uv.push(0, t, 1, t);
      if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const fMat = new THREE.MeshStandardMaterial({ color: 0x4f7d3a, alphaMap: frondTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 });
  const nF = 15;
  const fronds = new THREE.InstancedMesh(frondGeo, fMat, palms.length * nF);
  const tMat = new THREE.MeshStandardMaterial({ map: trunkTex(), roughness: 1 });
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 10, 6, true); trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, tMat, palms.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  palms.forEach(([x, z, h0], pi) => {
    const h = 8 + R() * 3.5, lean = (R() - 0.5) * 0.12;
    e.set(lean, R() * 6, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1)); trunks.setMatrixAt(pi, m4);
    for (let f = 0; f < nF; f++) {
      const a = (f / nF) * Math.PI * 2 + R() * 0.3, droop = 0.35 + R() * 0.5;
      e.set(-0.25 - droop * 0.5 + (f % 2) * 0.35, a, 0, 'YXZ'); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x + lean * h * 0.6, h, z), q, new THREE.Vector3(1, 1, 1.0 + R() * 0.35)); fronds.setMatrixAt(pi * nF + f, m4);
    }
  });
  fronds.castShadow = true; trunks.castShadow = true; trunks.receiveShadow = true; site.add(fronds, trunks);

  // ---- distant city massing (blurred by fog)
  const far = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const w = 8 + R() * 14, h = 14 + R() * 60, d = 8 + R() * 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.1, 0.18, 0.62 + R() * 0.15), roughness: 0.5, metalness: 0.3 }));
    const ang = -Math.PI * 0.62 + (i / 25) * Math.PI * 0.24 * 5 / 5 ; // arc behind the building
    b.position.set(-160 + i * 12.8 + R() * 6, h / 2, -190 - R() * 70); far.add(b);
  }
  site.add(far);
  // street in front
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), new THREE.MeshStandardMaterial({ color: 0x3a3c3f, roughness: 0.92 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 108); site.add(road);
  for (let i = -18; i < 18; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.2), new THREE.MeshBasicMaterial({ color: 0xcfcbbf })); l.rotation.x = -Math.PI / 2; l.position.set(i * 9, 0.01, 108); site.add(l); }

  // ---- walking staff & visitors
  const walkers = [];
  const Rw = rng(31);
  for (let i = 0; i < 12; i++) {
    const p = person({ body: i % 3 === 0 ? M.suit : M.thobe, head: i % 3 === 0 ? M.suit : M.shemagh, legs: i % 3 === 0 ? M.suit : M.thobe });
    scene.add(p);
    walkers.push({ p, x0: (Rw() - 0.5) * 6 + (i % 2 ? 4 : -4), phase: Rw() * 40, speed: 1.15 + Rw() * 0.25, lane: (Rw() - 0.5) * 3 });
  }
  function updateWalkers(t) {
    for (const w of walkers) {
      const cyc = 46, s = ((t * w.speed + w.phase) % cyc);
      const z = 70 - s * 1.3;
      const toDoor = Math.max(0, 1 - Math.abs(z - 11) / 1.2);
      w.p.visible = z > 9.3;
      const x = THREE.MathUtils.lerp(w.x0 + w.lane, w.lane * 0.5, THREE.MathUtils.smoothstep(z, 70, 14) * 0 + (1 - THREE.MathUtils.smoothstep(z, 12, 46)));
      w.p.position.set(x, 0.0, z); w.p.rotation.y = Math.PI + Math.atan2(-0.0, 1);
      walk(w.p, t * 6.2 * w.speed + w.phase);
    }
  }

  // ---- sky & light
  const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 4; su.rayleigh.value = 1.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 48; sc.bottom = -40; sc.near = 10; sc.far = 260;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target); sun.target.position.set(0, 8, 8);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0xd9c7a0, 0.75); scene.add(hemi);
  scene.fog = new THREE.Fog(0xd8dcdc, 150, 520);

  function setSun(elevDeg, azDeg, warm) { // warm 0..1
    const phi = THREE.MathUtils.degToRad(90 - elevDeg), th = THREE.MathUtils.degToRad(azDeg);
    const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, th);
    su.sunPosition.value.copy(dir);
    sun.position.copy(dir).multiplyScalar(110).add(sun.target.position);
    sun.color.setRGB(1, 0.94 - 0.28 * warm, 0.86 - 0.5 * warm);
    sun.intensity = 3.2 - 0.5 * warm;
    hemi.intensity = 0.75 - 0.25 * warm;
    hemi.color.setRGB(0.8 - 0.1 * warm, 0.89 - 0.2 * warm, 1);
    scene.fog.color.setRGB(0.85 + 0.05 * warm, 0.87 - 0.12 * warm, 0.86 - 0.28 * warm);
    su.rayleigh.value = 1.2 + 1.3 * warm; su.turbidity.value = 4 + 4 * warm;
  }
  return { site, sky, sun, setSun, updateWalkers, fronds, palms };
}
