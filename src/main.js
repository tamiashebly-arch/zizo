import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildBuilding } from './building.js';
import { buildSite } from './site.js';
import { createFilm, DURATION } from './film.js';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = +(q.get('h') || 1080);
const capture = q.has('capture');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, W / H, 0.5, 2500);
const site = buildSite(scene);
const building = buildBuilding(); scene.add(building);

// environment from the sky (reflections on glass / metal)
site.setSun(42, 20, 0);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(site.sky.clone());
  scene.environment = pm.fromScene(envScene, 0, 1, 3000).texture;
  scene.environmentIntensity = 0.55;
}

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.6, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function fit() {
  const stage = document.getElementById('stage');
  const s = Math.min(innerWidth / W, (innerHeight - (capture ? 0 : 48)) / H);
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  stage.style.transform = capture ? 'none' : `scale(${s})`;
  if (!capture) stage.style.left = (innerWidth - W * s) / 2 + 'px';
  renderer.setSize(W, H, false);
}
fit(); addEventListener('resize', fit);

const film = createFilm({ THREE, scene, camera, renderer, site, building, bloom, W, H, overlay: document.getElementById('overlay'), caption: document.getElementById('caption') });

function render(t) {
  film.update(t);
  composer.render();
}
window.renderFrame = (t) => { render(t); return true; };
window.DURATION = DURATION;

// player
const scrub = document.getElementById('scrub'), play = document.getElementById('play'), tl = document.getElementById('time');
let t = +(q.get('t') || 0), playing = false, last = 0;
scrub.max = DURATION;
function tick(now) {
  if (playing) { t += (now - last) / 1000; if (t > DURATION) { t = DURATION; playing = false; play.textContent = '▶'; } }
  last = now; scrub.value = t;
  tl.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  if (!capture) render(t);
  requestAnimationFrame(tick);
}
play.onclick = () => { playing = !playing; play.textContent = playing ? '❚❚' : '▶'; if (t >= DURATION) t = 0; };
scrub.oninput = () => { t = +scrub.value; };
if (capture) { document.body.classList.add('capture'); render(t); window.ready = true; } else requestAnimationFrame(tick);
if (q.has('titles')) document.body.classList.add('titles');
