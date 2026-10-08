// The film: a pure function of time t (seconds). update(t) positions the camera,
// drives every system / indicator / overlay, so any frame can be rendered on its own.
import { SYS, indicator, glowTex, dissolveU } from './building.js';

export const DURATION = 84;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
/** 0 -> 1 at [a,b], hold, 1 -> 0 at [c,d] */
const win = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));

// ------------------------------------------------------------------ icons
const I = {
  hvac: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><circle cx="12" cy="12" r="2"/>',
  elec: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  water: '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/>',
  elev: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 10l3-3 3 3M9 15l3 3 3-3"/>',
  sec: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  pump: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M12 5v2M4 13h2M18 13h2"/>',
  fire: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
  cctv: '<path d="M3 8l12-3 2 6-12 3z"/><path d="M17 8l4-1v6l-4-1M9 14l-1 6M6 20h6"/>',
  clean: '<path d="M14 3l-3 9M6 12h10l2 9H4z"/><path d="M8 16v3M11 16v3"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  team: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 14c3 0 6 1.5 6 5"/>',
  tools: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
  report: '<path d="M5 4h14v12H9l-4 4z"/><path d="M12 7v4M12 13.5v.5"/>',
  temp: '<path d="M10 4a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>',
  box: '<path d="M3 8l9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-3 5-3 8h3v10"/>',
  building: '<rect x="5" y="3" width="14" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c3-5 6-8 10-10"/>',
  pay: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.1M18 15v.1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hard: '<path d="M4 16a8 8 0 0 1 16 0v1H4zM12 5v4M2 17h20"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
};
const svg = (n, w = 20) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

// ------------------------------------------------------------------ the film
export function createFilm({ THREE, scene, camera, renderer, site, building, bloom, W, H, overlay, caption }) {
  const U = building.userData;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = U.anchors;

  // ---------------- camera keyframes
  const K = [
    // scene 1 - dolly towards the stable building
    [0, [-40, 3.5, 94], [-2, 10.5, 0], 34], [8, [-19, 6.2, 60], [0, 11.5, 2], 34],
    // scene 2 - same perspective, facade dissolves
    [11.5, [-14, 7.8, 53], [0, 11.5, 0], 35], [15, [0, 6.2, 39], [-2, 4.5, 0], 35],
    // scene 3 - systems tour
    [15.7, [0, 6.2, 38], [-2, 4, 0], 35], [17.1, [-13, 7, 36], [-13, 6, -4], 35], [18.5, [-9, 12, 36], [-9, 10, -4], 35],
    [19.9, [1, 6, 34], [3, 3.2, 0], 35], [21.3, [5, 7, 37], [3, 5, 6], 35], [22.8, [9, 6, 34], [9, 3, -4], 35],
    [24.2, [4, 15, 38], [3, 15, 0], 35], [25.7, [14, 6, 32], [15, 3, -5], 35], [27.2, [15, 16, 38], [15, 14, -2], 35],
    // scene 4 - what could happen
    [29.2, [10, 16, 54], [5, 12, 0], 36], [33, [0, 14, 60], [0, 11, 0], 36], [37, [-3, 13, 60], [-2, 11, 0], 36], [40.5, [6, 14, 56], [2, 12, 0], 36],
    // scene 5 - impact, then focus on the A/C failure
    [44, [13, 13.8, 40], [14, 13.6, -2], 34], [47, [14, 14, 31], [15.5, 13.6, -2], 32],
    // scene 6 - work order pathway
    [48.2, [12, 15, 36], [10, 15, 4], 34], [50.5, [2, 16, 38], [2, 15, 4], 34], [52.3, [-6, 13, 38], [-6, 12, 4], 34],
    [54, [2, 10.5, 40], [2, 9.5, 6], 34], [55.6, [13.5, 13.8, 27], [16, 13.4, -1], 32], [58.5, [16, 15, 27], [17, 15, 0], 32],
    [60.4, [8, 18, 44], [6, 17, 12], 34],
    // scene 7 - Technical Affairs
    [63, [0, 19, 72], [0, 12.5, 14], 36], [74, [2, 19, 68], [0, 12.5, 14], 36],
    // scene 8 - return
    [77, [0, 16, 64], [0, 12, 0], 36], [80, [-3, 13, 74], [0, 17, 0], 35], [84, [-9, 6.5, 108], [2, 25, 0], 34],
  ];
  const camState = { p: V3(0, 0, 0), l: V3(0, 0, 0), f: 35 };
  function hermite(p0, p1, m0, m1, h, s) {
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
  }
  function camAt(t) {
    let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], prev = K[Math.max(0, i - 1)], next = K[Math.min(K.length - 1, i + 2)];
    const h = b[0] - a[0], s = clamp((t - a[0]) / h);
    const out = {};
    for (const [name, idx] of [['p', 1], ['l', 2]]) {
      const r = [];
      for (let c = 0; c < 3; c++) {
        const m0 = i === 0 ? 0 : (b[idx][c] - prev[idx][c]) / (b[0] - prev[0]);
        const m1 = i + 2 >= K.length ? 0 : (next[idx][c] - a[idx][c]) / (next[0] - a[0]);
        r.push(hermite(a[idx][c], b[idx][c], m0, m1, h, s));
      }
      out[name] = r;
    }
    const m0 = i === 0 ? 0 : (b[3] - prev[3]) / (b[0] - prev[0]), m1 = i + 2 >= K.length ? 0 : (next[3] - a[3]) / (next[0] - a[0]);
    out.f = hermite(a[3], b[3], m0, m1, h, s);
    return out;
  }

  // ---------------- overlay: pins, captions, cards
  const pins = {};
  function makePin(id, o) {
    const el = document.createElement('div');
    el.className = 'pin ' + (o.side || 'r') + (o.num ? ' stage' : '');
    el.innerHTML = `<div class="badge">${svg(o.icon, 22)}${o.num ? `<i class="num">${o.num}</i>` : ''}</div><div class="lab">${o.label || ''}</div>`;
    overlay.appendChild(el);
    pins[id] = { el, anchor: o.anchor, a: 0, ring: 'gold', lab: el.querySelector('.lab'), labText: o.label || '', fn: o.fn };
    return pins[id];
  }
  function pin(id, a, ring = 'gold', label) {
    const p = pins[id]; p.a = Math.max(p.a, a); p.ring = ring;
    if (label !== undefined && label !== p.labText) { p.labText = label; p.lab.innerHTML = label; }
  }
  const tmp = V3(0, 0, 0);
  function flushPins() {
    for (const p of Object.values(pins)) {
      let vis = p.a > 0.01;
      if (vis) {
        tmp.copy(typeof p.anchor === 'function' ? p.anchor() : p.anchor).project(camera);
        if (tmp.z > 1 || tmp.z < -1) vis = false;
        p.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px,${(-tmp.y * 0.5 + 0.5) * H}px)`;
      }
      p.el.style.opacity = vis ? p.a.toFixed(3) : 0;
      p.el.style.visibility = vis ? 'visible' : 'hidden';
      p.el.dataset.ring = p.ring;
      p.a = 0;
    }
  }

  // chapter captions
  const CAPS = [
    [0, 8, '01', 'A building operating efficiently', 'مبنى يعمل بكفاءة'],
    [8, 15, '02', 'Behind the walls', 'خلف الجدران'],
    [15, 28, '03', 'Building systems & services', 'أنظمة المبنى وخدماته'],
    [28, 40, '04', 'What could happen', 'ماذا قد يحدث'],
    [40, 47, '05', 'The impact', 'الأثر'],
    [47, 60, '06', 'Maintenance work order', 'مسار أمر العمل'],
    [60, 74, '07', 'Technical Affairs', 'الشؤون الفنية'],
    [74, 80.5, '08', 'Continuity of operations', 'استمرارية الأعمال'],
  ];
  const capEls = CAPS.map(([, , no, en, ar]) => {
    const d = document.createElement('div'); d.className = 'cap';
    d.innerHTML = `<span class="no">${no}</span><div><b>${en}</b><i dir="rtl" lang="ar">${ar}</i></div>`;
    caption.appendChild(d); return d;
  });

  // ---- scene 1 - 3: pins for building systems
  const SYSLIST = [
    // key, label, icon, anchor, camera slot centre
    ['clean', 'Cleaning & facility care', 'clean', A.clean, 'r'],
    ['water', 'Water supply & drainage', 'water', A.water, 'r'],
    ['elev', 'Elevators', 'elev', V3(-8.5, 12, -5), 'r'],
    ['sec', 'Security & access control', 'sec', A.sec, 'r'],
    ['cctv', 'CCTV surveillance', 'cctv', A.cctv, 'r'],
    ['firepump', 'Fire pumps & fire water', 'pump', A.firepump, 'r'],
    ['fire', 'Fire detection, alarm & firefighting', 'fire', V3(1, 15.4, 2.5), 'r'],
    ['elec', 'Electrical systems', 'elec', A.elec, 'r'],
    ['hvac', 'HVAC & ventilation', 'hvac', V3(15.5, 14.2, -2), 'l'],
  ];
  const T3 = 15.2, SLOT = (28 - T3 - 0.4) / SYSLIST.length;
  SYSLIST.forEach(([k, label, icon, anchor, side]) => makePin('s_' + k, { icon, label, anchor, side }));
  // highlight groups: which material groups each list item lights
  const HL = { clean: ['clean'], water: ['water'], elev: ['elev'], sec: ['sec'], cctv: ['cctv'], firepump: ['firepump'], fire: ['fire'], elec: ['elec'], hvac: ['hvac'] };

  // ---- indicators (extra ones for problems)
  const ind = U.ind;
  ind.leak = indicator(U.inner, -13.4, 9.7, -8.8);
  ind.prop = indicator(U.inner, -17.8, 10.1, -9.2);
  ind.car = indicator(U.inner, -7.4, 0, -4.0);
  ind.all = [];

  // ---- scene 4 problems
  const P = {
    hvacF: { t: 28.9, label: 'A/C failure · temperature rising', icon: 'temp', anchor: V3(16.3, 15.0, -1.8), side: 'r' },
    leak: { t: 30.4, label: 'Water leak', icon: 'water', anchor: V3(-14.4, 9.8, -8.8), side: 'r' },
    elecF: { t: 31.8, label: 'Electrical fault', icon: 'elec', anchor: V3(15.8, 3.0, -8.7), side: 'l' },
    elevF: { t: 33.5, label: 'Elevator malfunction', icon: 'elev', anchor: null, side: 'l' },
    fireF: { t: 35.0, label: 'Fire-safety warning', icon: 'bell', anchor: V3(9, 3.2, -4.6), side: 'l' },
    cctvF: { t: 36.4, label: 'CCTV observation · unauthorised presence', icon: 'cctv', anchor: V3(1.5, 3.6, 8.5), side: 'r' },
    cleanF: { t: 37.8, label: 'Facility-care issue', icon: 'clean', anchor: V3(-2.0, 1.6, 6.2), side: 'r' },
    propF: { t: 39.0, label: 'Property at risk', icon: 'box', anchor: V3(-17.4, 8.7, -9.4), side: 'r' },
  };
  const ELEV_STUCK = 33.8;
  // elevator motion
  const SEQ = [[0, 3, 5, 2, 4, 1], [4, 1, 3, 0, 5, 2]];
  const carY = (tau, seq) => {
    const idx = Math.floor(tau / 4), fr = tau / 4 - idx;
    const a = seq[idx % seq.length], b = seq[(idx + 1) % seq.length];
    return lerp(a, b, sm(0.375, 1, fr)) * 4;
  };
  const tauB = (t) => { const T0 = ELEV_STUCK, T1 = 62; return (t < T0 ? t : t < T1 ? T0 : t - (T1 - T0)) + 1; };
  P.elevF.anchor = V3(-7.4, carY(tauB(ELEV_STUCK), SEQ[1]) + 1.4, -3.9);
  for (const [k, p] of Object.entries(P)) makePin('p_' + k, { icon: p.icon, label: p.label, anchor: p.anchor, side: p.side });

  // ---- scene 5: impact chips + message
  const IMPACT = [
    ['Business continuity', 'استمرارية الأعمال', 'building'],
    ['Staff & visitor safety', 'سلامة الموظفين والزوار', 'sec'],
    ['Facility performance', 'أداء المرافق', 'chart'],
    ['Property protection', 'حماية الممتلكات', 'box'],
    ['Workplace quality', 'جودة بيئة العمل', 'star'],
  ];
  const chipWrap = document.createElement('div'); chipWrap.className = 'chips'; overlay.appendChild(chipWrap);
  const chips = IMPACT.map(([en, ar, ic]) => {
    const d = document.createElement('div'); d.className = 'chip';
    d.innerHTML = `${svg(ic, 22)}<div><b>${en}</b><i dir="rtl" lang="ar">${ar}</i></div>`; chipWrap.appendChild(d); return d;
  });
  const msg = document.createElement('div'); msg.className = 'msg';
  msg.innerHTML = 'A small issue can grow if it is not identified, followed up and resolved.<i dir="rtl" lang="ar">المشكلة الصغيرة قد تكبر إذا لم تُرصد وتُتابَع وتُعالَج</i>';
  overlay.appendChild(msg);

  // ---- scene 6: work-order pathway
  const WO = {
    start: V3(16.3, 14.2, -1.2),
    nodes: [
      V3(13.5, 15.6, 7), V3(6.2, 17.6, 8), V3(-1.5, 15.6, 8), V3(-9.5, 13.0, 8),
    ],
    ret: [V3(-10.5, 9, 9), V3(-2, 7.2, 10), V3(8, 9.6, 8)],
    n5: V3(15.2, 12.6, 3.2), n6: V3(18.6, 16.0, 3.0), n7: V3(18.2, 19.4, 1.0),
    out: [V3(16, 25.5, 2), V3(10, 28.5, 14), V3(0, 25.5, 24.5)],
    end: V3(0, 22.8, 25.5),
  };
  const woPts = [WO.start, ...WO.nodes, ...WO.ret, WO.n5, WO.n6, WO.n7, ...WO.out, WO.end];
  const woCurve = new THREE.CatmullRomCurve3(woPts, false, 'centripetal');
  const samples = 4000, woArc = woCurve.getSpacedPoints(samples);
  const uOf = (v) => { let bi = 0, bd = 1e9; for (let i = 0; i < woArc.length; i++) { const d = woArc[i].distanceToSquared(v); if (d < bd) { bd = d; bi = i; } } return bi / samples; };
  const stageU = [WO.nodes[0], WO.nodes[1], WO.nodes[2], WO.nodes[3], WO.n5, WO.n6, WO.n7].map(uOf);
  const STAGE_T = [47.9, 49.2, 50.5, 51.9, 55.0, 56.9, 58.4];
  const STAGES = [
    ['Report received', 'report'], ['Work order created', 'file'], ['Priority determined', 'flag'],
    ['Assigned to contractor / team', 'team'], ['Execution & technical follow-up', 'tools'],
    ['Verification & inspection', 'search'], ['Work order closed', 'check'],
  ];
  STAGES.forEach(([l, ic], i) => makePin('w' + i, { icon: ic, label: l, num: i + 1, anchor: [...WO.nodes, WO.n5, WO.n6, WO.n7][i], side: i === 5 || i === 6 ? 'r' : 'b' }));
  const woKeys = [[47.2, 0], ...stageU.map((u, i) => [STAGE_T[i], u]), [60.5, 1]];
  const woU = (t) => {
    if (t <= woKeys[0][0]) return 0;
    for (let i = 0; i < woKeys.length - 1; i++) {
      const [t0, u0] = woKeys[i], [t1, u1] = woKeys[i + 1];
      if (t < t1) { const s = (t - t0) / (t1 - t0); return lerp(u0, u1, s * s * (3 - 2 * s) * 0.6 + s * 0.4); }
    }
    return 1;
  };
  const pathShader = (color) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uProg: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(...color) }, uAlpha: { value: 1 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uProg,uTime,uAlpha,uPulse; uniform vec3 uColor;
      void main(){
        float lit = step(vUv.x, uProg);
        float head = smoothstep(0.035, 0.0, abs(vUv.x-uProg));
        float p = fract(vUv.x*4.0 - uTime*0.22);
        float glow = smoothstep(0.18, 0.0, p) * uPulse;
        float a = lit*(0.65+0.35*glow) + head;
        gl_FragColor = vec4(uColor*(0.8+2.0*glow+2.4*head), a*uAlpha);
      }`,
  });
  const woMat = pathShader([1.0, 0.82, 0.42]);
  const woTube = new THREE.Mesh(new THREE.TubeGeometry(woCurve, 700, 0.13, 8, false), woMat); woTube.frustumCulled = false; woTube.renderOrder = 10;
  scene.add(woTube);
  const woHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.7, 0.8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  woHead.scale.setScalar(2.2); woHead.renderOrder = 11; scene.add(woHead);

  // ---- scene 7: Technical Affairs (visual metaphor)
  const FN = [
    { color: [1.0, 0.8, 0.36], css: '#e8c46c', x: -16.4, no: '01', en: 'Technical & Engineering Support', ar: 'الدعم الفني والهندسي',
      items: [['Maintenance & operation', 'gear'], ['Technical follow-up', 'search'], ['Engineering support', 'tools'], ['Building systems', 'building'], ['Facility performance', 'chart']],
      targets: [A.ahu3, V3(14.5, 1.6, -9), A.waterRoof, A.elevMachine, A.hvacRoof] },
    { color: [0.35, 1.5, 0.95], css: '#4fe0b0', x: 0, no: '02', en: 'Contracts & Payment Certificates', ar: 'العقود والمستخلصات',
      items: [['Maintenance contracts', 'file'], ['Cleaning & facility-care contracts', 'clean'], ['Catering contracts', 'food'], ['Security guard contracts', 'sec'], ['Contractor follow-up', 'team'], ['Payment certificates', 'pay']],
      targets: [V3(-3.3, 1.2, 3.4), V3(-9.5, 12.0, 2.0), V3(8.4, 4.8, 2.5), V3(4.4, 1.2, 3.2)] },
    { color: [0.5, 0.85, 2.0], css: '#7fb8ff', x: 16.4, no: '03', en: 'Security & Safety', ar: 'الأمن والسلامة',
      items: [['Facility & occupational safety', 'hard'], ['Risk monitoring', 'eye'], ['CCTV surveillance', 'cctv'], ['Fire detection & alarm', 'bell'], ['Firefighting & fire pumps', 'pump'], ['Property protection', 'box']],
      targets: [A.cctvEntr, V3(9, 1.6, -4.6), A.facp, V3(3, 15.4, 2.5), V3(-16, 1.4, -6)] },
  ];
  const HUBC = V3(0, 23.6, 25.5);
  const PZ = 25, PW = 13.6, PH = 12.4, PY0 = 0.3;
  const hub = new THREE.Group(); scene.add(hub);
  const hubMats = []; // [{m, base}]
  const reg = (m, base) => { hubMats.push({ m, base: base ?? m.opacity }); return m; };
  const goldE = reg(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.55, 0.7), transparent: true, opacity: 1 }));
  const glassP = reg(new THREE.MeshPhysicalMaterial({ color: 0xcfe8ee, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.2 }));
  const ringG = new THREE.Group(); ringG.position.copy(HUBC); hub.add(ringG);
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.09, 12, 120), goldE); ringG.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.04, 8, 120), goldE); ringG.add(r2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), reg(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.16, 0.2), transparent: true, opacity: 0.72, depthWrite: false })));
  ringG.add(disc);
  const ticks = new THREE.Group(); ringG.add(ticks);
  for (let i = 0; i < 48; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, i % 4 === 0 ? 0.32 : 0.16, 0.02), goldE); const a = (i / 48) * Math.PI * 2; t.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0); t.rotation.z = a - Math.PI / 2; ticks.add(t); }
  const panels = FN.map((f, i) => {
    const g = new THREE.Group(); g.position.set(f.x, 0, PZ); g.rotation.y = -f.x * 0.012; hub.add(g);
    const pm = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.2), glassP); pm.position.y = PY0 + PH / 2; g.add(pm);
    const fm = reg(new THREE.MeshBasicMaterial({ color: new THREE.Color(...f.color), transparent: true, opacity: 1 }));
    for (const [w, h, x, y] of [[PW, 0.07, 0, PY0], [PW, 0.07, 0, PY0 + PH], [0.07, PH, -PW / 2, PY0 + PH / 2], [0.07, PH, PW / 2, PY0 + PH / 2]]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), fm); e.position.set(x, y, 0.05); g.add(e);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.9, 0.22, 64), reg(new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.5, transparent: true, opacity: 0.9 })));
    base.position.set(0, 0.1, 1.5); g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.7, 0.06, 8, 96), fm); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.24, 1.5); g.add(rim);
    // vertical beam hub -> panel
    return { g, pm, fm, corners: [V3(-PW / 2, PY0 + PH, 0), V3(PW / 2, PY0, 0)] };
  });
  // connection curves: ring -> panel tops and panel tops -> real locations in the building
  const links = [];
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.globalAlpha = 0.5; g.stroke(); return new THREE.CanvasTexture(c); })();
  const markers = [];
  FN.forEach((f, fi) => {
    const top = V3(f.x, PY0 + PH + 0.1, PZ);
    const mk = (a, b, lift, rad, delay) => {
      const mid = a.clone().lerp(b, 0.5); mid.y += lift; mid.z += 0;
      const c = new THREE.QuadraticBezierCurve3(a, mid, b);
      const mat = pathShader(f.color); mat.uniforms.uPulse.value = 1;
      const m = new THREE.Mesh(new THREE.TubeGeometry(c, 140, rad, 6, false), mat); m.frustumCulled = false; m.renderOrder = 9; hub.add(m);
      links.push({ m, mat, f: fi, delay });
    };
    mk(HUBC.clone().add(V3(0, -3.4, 0)), top, 0.5, 0.07, 0);
    f.targets.forEach((tg, k) => {
      mk(top, tg.clone(), 9 + k * 1.2, 0.045, 0.35 + k * 0.25);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: new THREE.Color(...f.color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
      sp.position.copy(tg); sp.scale.setScalar(2.2); sp.renderOrder = 12; hub.add(sp); markers.push({ sp, f: fi, delay: 0.35 + k * 0.25 });
    });
  });
  // cards (HTML anchored to the glass panels)
  const cards = FN.map((f, i) => {
    const el = document.createElement('div'); el.className = 'card'; el.style.setProperty('--c', f.css);
    el.innerHTML = `<div class="hd"><span class="n">${f.no}</span><div><h3>${f.en}</h3><p dir="rtl" lang="ar">${f.ar}</p></div></div>
      <ul>${f.items.map(([l, ic]) => `<li>${svg(ic, 22)}<span>${l}</span></li>`).join('')}</ul>
      <div class="viz">${[...Array(18)].map(() => '<s></s>').join('')}</div>`;
    overlay.appendChild(el);
    return { el, li: [...el.querySelectorAll('li')], bars: [...el.querySelectorAll('.viz s')] };
  });
  const hubLab = document.createElement('div'); hubLab.className = 'hublab';
  hubLab.innerHTML = '<b>TECHNICAL AFFAIRS</b><i dir="rtl" lang="ar">الشؤون الفنية</i><span>Coordination · Monitoring · Oversight · Continuity</span>';
  overlay.appendChild(hubLab);
  const projP = V3(0, 0, 0);
  const toScreen = (v) => { projP.copy(v).project(camera); return [(projP.x * 0.5 + 0.5) * W, (-projP.y * 0.5 + 0.5) * H]; };

  // ---- scene 8: green confirmation pins
  const OK = [
    ['hvac', 'HVAC operating normally', 'hvac', V3(16.3, 14.2, -2), 'l'], ['elec', 'Electrical systems stable', 'elec', V3(15.8, 2.4, -5), 'l'],
    ['water', 'Water systems stable', 'water', V3(-16, 2.6, -5), 'r'], ['elev', 'Elevators operational', 'elev', V3(-8.5, 11, -4), 'r'],
    ['fire', 'Fire & safety systems ready', 'fire', V3(8, 2.8, -4.6), 'l'], ['cctv', 'CCTV operational', 'cctv', V3(3.5, 3.6, 10.3), 'r'],
    ['clean', 'Facilities clean & maintained', 'clean', V3(-3.3, 1.4, 3.4), 'r'],
  ];
  OK.forEach(([k, label, icon, anchor, side]) => makePin('ok_' + k, { icon: 'check', label, anchor, side }));

  // fans
  const fans = U.fans;
  // dynamic helpers
  const GREEN = new THREE.Color(0.1, 1.5, 0.55);
  const hlColor = new THREE.Color(1.0, 0.82, 0.45);
  const hlGroups = Object.keys(SYS);

  // sunlight keyframes
  function sunAt(t) {
    const s = sm(76, 83, t);
    site.setSun(lerp(42, 8.5, s), lerp(22, 38, s), s);
  }

  // ------------------------------------------------------------------ the frame
  let lastCast = null;
  function update(t) {
    t = clamp(t, 0, DURATION);
    // camera
    const c = camAt(t);
    camera.position.set(...c.p); camera.lookAt(...c.l);
    if (Math.abs(camera.fov - c.f) > 1e-3) { camera.fov = c.f; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld(true);

    // ---- facade dissolve & lighting
    const dis = sm(8.3, 14.6, t) * (1 - sm(79.0, 83.2, t));
    dissolveU.value = dis;
    const cast = dis < 0.02;
    if (cast !== lastCast) { for (const m of U.shellMeshes) m.castShadow = cast && (m.userData.cast ?? true); lastCast = cast; }
    sunAt(t);
    const dim = sm(60.2, 62.5, t) * (1 - sm(74.2, 76.5, t));
    site.sun.intensity *= 1 - 0.62 * dim;
    scene.environmentIntensity = 0.55 * (1 - 0.5 * dim);
    renderer.toneMappingExposure = 0.95 * (1 - 0.0 * dim);
    bloom.strength = 0.3 + 0.25 * dim;

    site.updateWalkers(t);

    // ---- ambient animation
    fans.forEach((f, i) => {
      // the floor-3 AHU fan stops when the A/C fails (28.9s) and restarts when repaired (57.2s)
      const tt = i === 2 ? (t < 28.9 ? t : t < 57.2 ? 28.9 : 28.9 + (t - 57.2)) : t;
      f.userData.rot.rotation.y = tt * 9;
    });
    // elevators
    U.cars.forEach((cr, i) => {
      const tau = i === 0 ? t : tauB(t);
      const y = carY(tau, SEQ[i]);
      cr.car.position.y = y;
      cr.cw.position.y = 24 - y * 0.9 - 0.6 + 0.0;
      const ctop = y + 2.5; cr.cable.scale.y = 25.0 - ctop; cr.cable.position.y = ctop + (25.0 - ctop) / 2;
    });
    const carBy = carY(tauB(t), SEQ[1]);
    ind.car.dot.position.set(-7.4, carBy + 2.9, -4.2); ind.car.halo.position.copy(ind.car.dot.position);

    // staff walking/idle
    U.staff.forEach((p, i) => { p.children[2].position.y = 1.25 - 0.4 + Math.sin(t * 0.8 + i) * 0.004; });

    // ---- captions
    CAPS.forEach(([a, b], i) => { capEls[i].style.opacity = win(t, a + 0.3, a + 1.1, b - 0.9, b - 0.2).toFixed(3); });

    // ---- scene 3: highlight each system in turn
    const hl = {};
    SYSLIST.forEach(([k, , , , ], i) => {
      const a = T3 + i * SLOT + 0.0, b = a + SLOT;
      const v = win(t, a - 0.1, a + 0.35, b - 0.45, b + 0.05) * (t < 28.3 ? 1 : 0);
      if (v > 0) for (const g of HL[k]) hl[g] = Math.max(hl[g] || 0, v);
      pin('s_' + k, v, 'gold');
    });
    // sweep: extra emphasis on the water/fire riser for water/fire
    const camSlot = clamp((t - T3) / SLOT, 0, 8.99) | 0;
    // ---- problems: values
    const val = {};
    const ramp = (t0, t1, v) => v * sm(t0, t1, t);
    const resolveAll = 1 - sm(60.5, 66.5, t);                 // background issues are cleared quietly
    // A/C (resolved by the work order, scene 6)
    {
      const up = sm(P.hvacF.t - 0.3, P.hvacF.t + 1.2, t) * 2;
      const down = t < 56.6 ? 0 : t < 58.2 ? sm(56.4, 57.2, t) * 1 : 1 + sm(58.2, 59.0, t);
      val.hvac = clamp(up - down * 2, 0, 2);
      val.hvac = t < 56.4 ? up : lerp(2, 1, sm(56.4, 57.2, t)) * (t < 58.3 ? 1 : 1 - sm(58.3, 59.2, t));
      if (t >= 58.3) val.hvac = lerp(1, 0, sm(58.3, 59.2, t));
    }
    const prob = (k, peak) => ramp(P[k].t - 0.3, P[k].t + 1.0, peak) * resolveAll;
    val.elec = prob('elecF', 2); val.leak = prob('leak', 2); val.car = prob('elevF', 2);
    val.firepump = prob('fireF', 1.7); val.fire = prob('fireF', 1.0); val.cctv = prob('cctvF', 1.4);
    val.clean = prob('cleanF', 1.2); val.prop = prob('propF', 1.6) ;
    ind.hvac.set(val.hvac, 1, val.hvac > 1.5 ? Math.sin(t * 6) * 0.5 + 0.5 : 0);
    ind.elec.set(val.elec, 1, val.elec > 1.5 ? Math.sin(t * 9) * 0.5 + 0.5 : 0);
    ind.leak.set(val.leak, val.leak > 0.01 ? 1 : 0, val.leak > 1.5 ? Math.sin(t * 6) * 0.5 + 0.5 : 0);
    ind.car.set(val.car, val.car > 0.01 ? 1 : 0, val.car > 1.5 ? Math.sin(t * 6) * 0.5 + 0.5 : 0);
    ind.firepump.set(val.firepump, 1, val.firepump > 1.4 ? Math.sin(t * 7) * 0.5 + 0.5 : 0);
    ind.fire.set(val.fire, 1, 0);
    ind.cctv.set(val.cctv, 1, val.cctv > 1.2 ? Math.sin(t * 6) * 0.5 + 0.5 : 0);
    ind.clean.set(val.clean, 1, 0);
    ind.prop.set(val.prop, val.prop > 0.01 ? 1 : 0, val.prop > 1.4 ? Math.sin(t * 6) * 0.5 + 0.5 : 0);
    ind.water.set(0); ind.sec.set(0); ind.elev.set(0);
    // indicators are only meaningful once the cutaway has opened (they sit inside the building)
    const indVis = dis;
    for (const o of [ind.hvac, ind.elec, ind.water, ind.elev, ind.sec, ind.firepump, ind.fire, ind.cctv, ind.clean, ind.leak, ind.car, ind.prop]) {
      const base = o.v; // unused
    }
    const showInd = sm(14.0, 15.0, t) * (1 - sm(79.8, 81.2, t));
    for (const [k, o] of Object.entries(ind)) { if (k === 'all') continue; o.dot.material.opacity = 1; const on = showInd > 0.5; if (!on) { o.dot.visible = false; o.halo.visible = false; } }

    // ---- physical consequences
    const pr = U.problems;
    // heat volume on floor 4
    const heatK = sm(P.hvacF.t, P.hvacF.t + 5, t) * (1 - sm(57.0, 59.5, t)) ;
    const spread = sm(P.hvacF.t, 46, t);
    pr.heat.material.opacity = 0.2 * heatK; pr.heat.scale.x = lerp(7, 24, spread); pr.heat.position.x = 19.6 - pr.heat.scale.x / 2;
    pr.heat.scale.y = lerp(3.4, 3.7, spread); pr.heat.scale.z = lerp(10, 19, spread); pr.heat.position.z = -9.8 + pr.heat.scale.z / 2;
    // leak
    const leakOn = val.leak > 0.05 ? 1 : 0;
    pr.drips.forEach((d, k) => { const u = (t * 1.6 + k / 6) % 1; d.visible = !!leakOn; d.position.y = 2.5 - 2.45 * u * u; d.position.x = 0; });
    const pud = sm(P.leak.t, 46, t) * resolveAll;
    pr.puddle.material.opacity = 0.75 * clamp(pud * 5) * resolveAll; pr.puddle.scale.setScalar(lerp(0.2, 3.4, pud) + 0.001); pr.puddle.position.x = lerp(-14.4, -16.0, pud);
    pr.stain.material.opacity = 0.5 * sm(P.propF.t - 1, P.propF.t + 3, t) * resolveAll; pr.stain.scale.setScalar(lerp(0.4, 1.8, sm(P.propF.t, 47, t)));
    // sparks
    const burst = Math.floor(t * 6);
    const on = t > P.elecF.t && resolveAll > 0.05 && ((Math.sin(burst * 91.7) * 43758.5) % 1 > -0.35);
    pr.sparkMs.forEach((s, k) => {
      const ph = (t * 6) % 1, rnd = (n) => ((Math.sin((burst * 7 + k) * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
      s.visible = on && t < 60.5; s.position.set((rnd(1) - 0.5) * 0.6, (rnd(2) - 0.3) * 0.7 - ph * 0.5, 0.45 + ph * rnd(3) * 0.5); s.scale.setScalar(0.03 * (1 - ph));
    });
    // lobby: spill + overflowing bin
    const cleanK = sm(P.cleanF.t, P.cleanF.t + 3, t) * resolveAll;
    pr.spill.material.opacity = 0.7 * cleanK; pr.spill.scale.setScalar(lerp(0.2, 1.2, cleanK) + 0.001);
    pr.litter.scale.setScalar(cleanK > 0.05 ? cleanK : 0.0001);
    // visitor near the entrance (security observation)
    pr.visitor.visible = t > P.cctvF.t - 0.6 && resolveAll > 0.2;
    pr.visitor.position.set(1.6 + Math.sin(t * 0.7) * 0.08, 0, 8.2); pr.visitor.rotation.y = Math.PI * 0.9;
    // cones
    U.coneMat.opacity = 0.0;
    const cctvHL = hl.cctv || 0;
    const warn = val.cctv > 0.2 ? clamp(val.cctv / 1.4) : 0;
    U.coneMat.opacity = 0.2 * cctvHL + 0.22 * warn;
    U.coneMat.color.setRGB(lerp(0.8, 2.2, warn), lerp(1.4, 0.3, warn), lerp(2.0, 0.25, warn));
    // technicians
    pr.techs.visible = t > 54.2 && t < 61;
    pr.techs.children.forEach((p) => { if (p.userData.legs) { p.rotation.y = 0.5; } });
    // fire pump gauge
    pr.gauge.material = pr.gauge.material;

    // ---- highlight materials
    for (const g of hlGroups) {
      const k = hl[g] || 0;
      for (const m of SYS[g]) {
        m.emissive.copy(m.userData.baseEm); m.emissive.r += hlColor.r * 0.8 * k; m.emissive.g += hlColor.g * 0.8 * k; m.emissive.b += hlColor.b * 0.8 * k;
        m.emissiveIntensity = 1;
      }
    }
    // red tint on affected AHU while failing
    // (indicators + heat volume carry the message; keep materials honest)

    // ---- scene 4 pins
    const pk = (k, extra = 0) => {
      const p = P[k];
      const a = win(t, p.t, p.t + 0.5, 46.3, 47.0);
      const v = k === 'hvacF' ? val.hvac : k === 'leak' ? val.leak : k === 'elecF' ? val.elec : k === 'elevF' ? val.car : k === 'fireF' ? val.firepump : k === 'cctvF' ? val.cctv : k === 'cleanF' ? val.clean : val.prop;
      const ring = t > 60 ? 'amber' : (v > 1.35 ? 'red' : 'amber');
      pin('p_' + k, a * (t < 47 ? 1 : 0), ring);
    };
    Object.keys(P).forEach((k) => pk(k));
    // live label on A/C pin: temperature ticking up
    const temp = Math.round(lerp(24, 35, sm(P.hvacF.t, 44, t)));
    pin('p_hvacF', win(t, P.hvacF.t, P.hvacF.t + 0.5, 46.3, 47.0), 'red', `A/C failure · <u>${temp}°C</u>`);

    // ---- scene 5 chips & message
    chips.forEach((ch, i) => { ch.style.opacity = (win(t, 40.9 + i * 0.7, 41.6 + i * 0.7, 46.2, 46.9)).toFixed(3); ch.style.transform = `translateY(${(1 - sm(40.9 + i * 0.7, 41.8 + i * 0.7, t)) * 14}px)`; });
    msg.style.opacity = win(t, 44.3, 45.2, 46.3, 47.0).toFixed(3);
    chipWrap.style.visibility = t > 40.5 && t < 47.2 ? 'visible' : 'hidden';

    // ---- scene 6: pathway
    const uh = woU(t);
    const woOn = t > 47.1 && t < 62.5;
    woTube.visible = woHead.visible = woOn;
    woMat.uniforms.uProg.value = t > 60.4 ? 1.0 : uh; woMat.uniforms.uTime.value = t;
    woMat.uniforms.uAlpha.value = (1 - sm(62.0, 63.3, t)) * sm(47.1, 47.6, t);
    woMat.uniforms.uPulse.value = 0.35;
    woHead.position.copy(woCurve.getPointAt(clamp(uh))); woHead.material.opacity = t > 60.4 ? 0 : 1;
    STAGES.forEach((_, i) => {
      const a = win(t, STAGE_T[i] - 0.15, STAGE_T[i] + 0.35, 59.6, 60.6);
      const ring = (i === 4 && t < 56.9) ? 'amber' : (i >= 5 ? (t > 58.3 ? 'green' : 'gold') : (i === 4 ? 'gold' : 'gold'));
      pin('w' + i, a, i === 6 ? 'green' : ring);
    });
    // reach the repaired pin state rings
    // ---- scene 7: hub
    const hubA = sm(61.2, 63.0, t) * (1 - sm(74.0, 75.8, t));
    hub.visible = hubA > 0.005;
    for (const { m, base } of hubMats) m.opacity = base * hubA;
    ringG.rotation.z = t * 0.05; ticks.rotation.z = -t * 0.12;
    panels.forEach((p, i) => {
      const a = sm(63.0 + i * 1.4, 64.4 + i * 1.4, t);
      p.g.scale.set(1, 0.02 + 0.98 * a, 1);
    });
    const linkEnd = 74.0;
    links.forEach((l) => {
      const base = 66.6 + l.f * 1.0;
      const prog = sm(base + l.delay, base + l.delay + 1.5, t);
      l.mat.uniforms.uProg.value = prog; l.mat.uniforms.uTime.value = t + l.f * 0.7;
      l.mat.uniforms.uAlpha.value = hubA * (prog > 0 ? 1 : 0);
    });
    markers.forEach((m) => {
      const base = 66.6 + m.f * 1.0 + m.delay + 1.3;
      const a = sm(base, base + 0.5, t) * hubA; const pulse = 1 + 0.12 * Math.sin(t * 3 + m.f);
      m.sp.material.opacity = a; m.sp.scale.setScalar(2.2 * pulse * (0.7 + 0.3 * a));
    });
    // cards
    cards.forEach((cd, i) => {
      const a = sm(63.6 + i * 1.4, 64.8 + i * 1.4, t) * hubA;
      const [x0, y0] = toScreen(V3(FN[i].x - PW / 2, PY0 + PH, PZ)), [x1, y1] = toScreen(V3(FN[i].x + PW / 2, PY0, PZ));
      const w = x1 - x0, h = y1 - y0;
      Object.assign(cd.el.style, { left: x0 + 'px', top: y0 + 'px', width: w + 'px', height: h + 'px', opacity: a.toFixed(3), visibility: a > 0.01 ? 'visible' : 'hidden' });
      cd.el.style.setProperty('--w', w + 'px');
      const rev = sm(64.4 + i * 1.4, 67.4 + i * 1.4, t) * cd.li.length;
      cd.li.forEach((li, k) => { const v = clamp(rev - k); li.style.opacity = v.toFixed(3); li.style.transform = `translateX(${(1 - v) * 10}px)`; });
      cd.bars.forEach((b, k) => { const hgt = 0.35 + 0.65 * Math.abs(Math.sin(k * 1.7 + i * 2.1 + t * 0.6)) * (0.5 + 0.5 * Math.sin(k * 0.45 + i)); b.style.transform = `scaleY(${(hgt * sm(65 + i * 1.4, 68 + i * 1.4, t)).toFixed(3)})`; });
    });
    {
      const [hx, hy] = toScreen(HUBC);
      const a = sm(62.2, 63.6, t) * hubA;
      Object.assign(hubLab.style, { left: hx + 'px', top: hy + 'px', opacity: a.toFixed(3), visibility: a > 0.01 ? 'visible' : 'hidden' });
      hubLab.style.setProperty('--s', Math.abs(toScreen(HUBC.clone().add(V3(3.4, 0, 0)))[0] - hx) + 'px');
    }

    // ---- scene 8: healthy
    const tOK = 76.4;
    OK.forEach(([k], i) => pin('ok_' + k, win(t, tOK + i * 0.5, tOK + i * 0.5 + 0.5, 81.2, 82.2), 'green'));
    const healed = sm(60.5, 66.5, t); // all issues are cleared
    flushPins();
  }

  return { update };
}
