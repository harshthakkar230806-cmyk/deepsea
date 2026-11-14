import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Game } from '../game/engine';
import { BASE, R, floorDepth, Poi } from '../game/world';
import { DISC } from '../data/discoveries';
import { setAmbienceDepth } from '../audio/audio';

const KEYS: [number, string][] = [[0, '#2aa1d8'], [200, '#0f5a8c'], [600, '#082a4d'], [1500, '#030d18'], [4000, '#01060b'], [6000, '#010408'], [8000, '#000204'], [11000, '#14052e'], [14000, '#1d0845']];
const DENS: [number, number][] = [[0, 0.009], [200, 0.013], [1000, 0.02], [4000, 0.026], [14000, 0.03]];
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d')!; const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
function lerpKeys<T>(depth: number, keys: [number, T][], f: (a: T, b: T, t: number) => T): T {
  for (let i = 0; i < keys.length - 1; i++) if (depth <= keys[i + 1][0]) { const t = (depth - keys[i][0]) / (keys[i + 1][0] - keys[i][0]); return f(keys[i][1], keys[i + 1][1], Math.max(0, t)); }
  return keys[keys.length - 1][1];
}
const RC: Record<string, number> = { sand: 0xc9b27a, copper: 0xc7773a, iron: 0x6d5a52, minerals: 0x6f8599, titanium: 0xa9c1d6, manganese: 0x7a5f8c, methane: 0xbfeaff, platinum: 0xf2f2f2, rare_earth: 0x2fb8a6, adv_bio: 0x58e08c, bio: 0x6fd36f, exotic: 0xe040b0, artifacts: 0xe0b040, crystals: 0x8f6bff, sulfur: 0xe8d33a };
const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (c: number, em = 0, ei = 0.8, rough = 0.8, metal = 0.1) => { const k = `${c}_${em}_${ei}_${rough}_${metal}`; let m = mats.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, emissive: em, emissiveIntensity: ei, roughness: rough, metalness: Math.min(metal, 0.2) }); mats.set(k, m); } return m; };
const geoCache: Record<string, THREE.BufferGeometry> = {};
const geo = (k: string, f: () => THREE.BufferGeometry) => geoCache[k] ?? (geoCache[k] = f());

function makePoi(p: Poi): THREE.Group {
  const g = new THREE.Group(); const rc = RC[p.resource] ?? 0x888888; const rare = ['platinum', 'rare_earth', 'exotic', 'artifacts', 'crystals', 'adv_bio', 'methane'].includes(p.resource);
  const add = (m: THREE.Mesh) => { g.add(m); return m; };
  const hull = (len: number, col: number) => { const b = add(new THREE.Mesh(geo('hullc', () => new THREE.CapsuleGeometry(1, 4, 4, 10)), mat(col, 0, 0, 0.7, 0.5))); b.rotation.z = Math.PI / 2; b.scale.set(len / 6, 1.2, 1.2); const t = add(new THREE.Mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), mat(col, 0, 0, 0.7, 0.4))); t.scale.set(2, 2, 1.4); t.position.set(len * 0.1, 1.5, 0); const m = add(new THREE.Mesh(geo('cyl', () => new THREE.CylinderGeometry(0.15, 0.15, 6, 6)), mat(0x3a2a22))); m.position.set(-len * 0.2, 4, 0); m.rotation.z = 0.5; g.rotation.z = 0.25; g.rotation.y = (p.x * 7.3) % 6; };
  if (p.kind === 'discovery') {
    const d = DISC[p.disc!];
    if (d.cat === 'wreck') hull(d.id === 'd_milsub' ? 18 : 14, d.id === 'd_unkvessel' ? 0x2c3a58 : 0x59544c);
    else if (d.cat === 'human') { for (let i = 0; i < 3; i++) { const c = add(new THREE.Mesh(geo('cyl2', () => new THREE.CylinderGeometry(1.6, 1.6, 5, 14)), mat(0x8a9099, 0, 0, 0.6, 0.5))); c.rotation.z = Math.PI / 2; c.position.set(i * 5 - 5, 1.6, (i % 2) * 1.5); const w = add(new THREE.Mesh(geo('win', () => new THREE.SphereGeometry(0.5, 8, 8)), mat(0x9fffff, 0xaaffff, 2))); w.position.set(i * 5 - 5, 2.6, (i % 2) * 1.5 + 1.2); } }
    else if (d.cat === 'bio') { for (let i = 0; i < 9; i++) { const j = add(new THREE.Mesh(geo('jelly', () => new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0x2288ff, 0x44ddff, 1.6, 0.4))); j.position.set(Math.sin(i * 2.1) * 6, 2 + (i % 4) * 2.5, Math.cos(i * 1.7) * 6); j.scale.setScalar(1 + (i % 3) * 0.5); } }
    else if (d.cat === 'geo') { for (let i = 0; i < 7; i++) { const r = add(new THREE.Mesh(geo('rock', () => new THREE.DodecahedronGeometry(1, 0)), mat(d.zone === 5 ? 0x2a1208 : 0x343c44, d.zone === 5 ? 0xff5510 : 0, 0.6, 1))); r.position.set((i - 3) * 3.2, 3 + (i % 3) * 2, (i % 2) * 3); r.scale.set(2 + (i % 3), 5 + (i % 4) * 2, 2 + (i % 2) * 2); } }
    else { const col = d.zone >= 8 ? 0x9a5bff : 0x4fe0ff; const mono = add(new THREE.Mesh(geo('mono', () => new THREE.BoxGeometry(3, 16, 1.2)), mat(0x0a0d14, 0, 0, 0.2, 0.9))); mono.position.y = 8; const ring = add(new THREE.Mesh(geo('mring', () => new THREE.TorusGeometry(6, 0.18, 8, 48)), mat(col, col, 2.5))); ring.position.y = 8; ring.userData.spin = 0.5; const core = add(new THREE.Mesh(geo('core', () => new THREE.OctahedronGeometry(1.2)), mat(col, col, 3))); core.position.y = 18; core.userData.spin = 1.2; }
    return g;
  }
  if (p.kind === 'wreck') { hull(8 + (p.amount % 6), 0x4e4a45); for (let i = 0; i < 3; i++) { const b = add(new THREE.Mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), mat(rc, 0, 0, 0.6, 0.5))); b.scale.set(2, 1.4, 1.4); b.position.set(6 + i * 2, 0.8, (i - 1) * 2); b.rotation.y = i; } return g; }
  if (p.kind === 'bio') { const col = p.resource === 'bio' ? 0x66ffa0 : 0x7affd0; for (let i = 0; i < 6; i++) { const b = add(new THREE.Mesh(geo('jelly', () => new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(col, col, 1.5, 0.4))); b.position.set(Math.sin(i * 2.4) * 3.5, 1 + (i % 3) * 1.6, Math.cos(i * 2.4) * 3.5); b.scale.setScalar(0.8 + (i % 3) * 0.4); const s = add(new THREE.Mesh(geo('stalk', () => new THREE.CylinderGeometry(0.06, 0.12, 3, 5)), mat(col, col, 0.8))); s.position.set(b.position.x, b.position.y - 1.5, b.position.z); } return g; }
  if (p.kind === 'vent') { const c = add(new THREE.Mesh(geo('vent', () => new THREE.CylinderGeometry(0.8, 2.6, 9, 9)), mat(0x1c0f0a, 0, 0, 1))); c.position.y = 4.5; const t = add(new THREE.Mesh(geo('vtip', () => new THREE.SphereGeometry(1.1, 10, 8)), mat(0xff6a1a, 0xff5a10, 4))); t.position.y = 9.5; g.userData.pulse = t; g.userData.vent = true; return g; }
  if (p.kind === 'anomaly') { const k = add(new THREE.Mesh(geo('knot', () => new THREE.TorusKnotGeometry(1.8, 0.45, 80, 10)), mat(rc, rc, 2.4, 0.3, 0.6))); k.position.y = 4; k.userData.spin = 0.6; return g; }
  const n = 4 + (p.amount % 4);
  for (let i = 0; i < n; i++) { const r = add(new THREE.Mesh(geo('ico', () => new THREE.IcosahedronGeometry(1, 0)), mat(rc, rare ? rc : 0, rare ? 0.9 : 0, 0.85, rare ? 0.6 : 0.15))); r.position.set(Math.sin(i * 2.3) * 2.2, 0.6 + (i % 2) * 0.5, Math.cos(i * 2.3) * 2.2); r.scale.setScalar(0.9 + ((i * 37) % 10) / 8); r.rotation.set(i, i * 2, i * 3); }
  return g;
}

function makeBase(levels: Record<string, number>): THREE.Group {
  const g = new THREE.Group(); const L = (k: string) => levels[k] ?? 0; const metal = mat(0x7a8590, 0, 0, 0.55, 0.6); const dark = mat(0x2d343c, 0, 0, 0.7, 0.5); const glow = mat(0x9fffff, 0xaaffff, 2.2); const warn = mat(0xe0801c, 0xff7a10, 1.2);
  const add = (m: THREE.Mesh, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.Mesh(geo('plat', () => new THREE.CylinderGeometry(10, 11, 0.8, 24)), dark), 0, -1.8, 0);
  for (const a of [0, 2.1, 4.2]) add(new THREE.Mesh(geo('leg', () => new THREE.CylinderGeometry(0.5, 0.8, 7, 8)), dark), Math.cos(a) * 8, -5.2, Math.sin(a) * 8);
  add(new THREE.Mesh(geo('hub', () => new THREE.CylinderGeometry(3.2, 3.6, 3, 20)), metal), 0, -0.2, 0); add(new THREE.Mesh(geo('dome', () => new THREE.SphereGeometry(2.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0x88c8e0, 0x4aaedd, 0.8, 0.1, 0.1)), 0, 1.3, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(new THREE.Mesh(geo('bw', () => new THREE.BoxGeometry(0.7, 0.5, 0.2)), glow), Math.cos(a) * 3.4, 0.2, Math.sin(a) * 3.4).rotation.y = -a + Math.PI / 2; }
  const ring = (k: string, fn: (i: number) => void, count: number) => { for (let i = 0; i < count; i++) fn(i); };
  ring('dock', i => { add(new THREE.Mesh(geo('arm', () => new THREE.BoxGeometry(9, 0.6, 1.8)), metal), 8 + i * 0, -1.2, 0); add(new THREE.Mesh(geo('lamp', () => new THREE.SphereGeometry(0.22, 6, 6)), warn), 12.2, -0.7, i ? 0.8 : -0.8); }, 1 + Math.min(L('dock'), 2));
  ring('stor', i => { const c = add(new THREE.Mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), mat([0xb5651d, 0x2d6a9f, 0x8a3b2e, 0x4c7a3a][i % 4], 0, 0, 0.7, 0.2)), -7 - (i % 3) * 1.8, -0.6 + Math.floor(i / 3) * 1.2, -4 + ((i * 7) % 3) * 2); c.scale.set(1.6, 1.1, 1.1); }, [0, 3, 6, 10, 14][L('storage')]);
  if (L('power')) ring('pwr', i => { add(new THREE.Mesh(geo('cyl3', () => new THREE.CylinderGeometry(1, 1, 3, 12)), mat(0x3a4c3a, 0xff7a10, 0.4)), 5 + i * 2.4, -0.2, 7); }, L('power'));
  if (L('processing')) { add(new THREE.Mesh(geo('tank', () => new THREE.CylinderGeometry(1.3, 1.3, 4, 14)), mat(0x9a7a3a, 0, 0, 0.5, 0.7)), -5, 0.6, 6); if (L('processing') > 1) add(new THREE.Mesh(geo('tank', () => new THREE.CylinderGeometry(1.3, 1.3, 4, 14)), mat(0x9a7a3a, 0, 0, 0.5, 0.7)), -8, 0.6, 6.4); add(new THREE.Mesh(geo('pipe', () => new THREE.CylinderGeometry(0.2, 0.2, 7, 6)), metal), -3, 1.4, 4.5).rotation.z = Math.PI / 2; }
  if (L('repair')) { add(new THREE.Mesh(geo('crane', () => new THREE.BoxGeometry(0.6, 7 + L('repair'), 0.6)), warn), 4, 1.5, -7); const arm = add(new THREE.Mesh(geo('cranea', () => new THREE.BoxGeometry(6, 0.5, 0.5)), warn), 6, 4.8 + L('repair') * 0.4, -7); arm.rotation.y = 0.2; }
  if (L('sonar')) { add(new THREE.Mesh(geo('mast', () => new THREE.CylinderGeometry(0.2, 0.2, 8, 6)), metal), 0, 5, -8); const dish = add(new THREE.Mesh(geo('dish', () => new THREE.ConeGeometry(2, 1.2, 16, 1, true)), mat(0xc8d6e0, 0, 0, 0.4, 0.8)), 0, 9, -8); dish.rotation.x = Math.PI; dish.material = mat(0xc8d6e0, 0x224466, 0.3, 0.4, 0.8); }
  if (L('lab')) add(new THREE.Mesh(geo('labd', () => new THREE.SphereGeometry(2.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0x9fe0ff, 0x58c8ff, 0.9, 0.1, 0.1)), 7.5, -0.5, -4.5);
  if (L('trading')) { add(new THREE.Mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), metal), 4, -0.4, 5.5).scale.set(2.5, 1.8, 1.5); add(new THREE.Mesh(geo('scr', () => new THREE.BoxGeometry(2, 0.9, 0.1)), mat(0x40ff90, 0x30ff80, 2)), 4, 0.2, 6.3); }
  if (L('automation')) ring('pad', i => add(new THREE.Mesh(geo('pad', () => new THREE.ConeGeometry(0.5, 1.2, 8)), mat(0x5eb0ff, 0x2a80ff, 1.5)), -1 - i * 1.4, 2.2 + i * 0.3, -6), L('automation') + 1);
  if (L('finalprep')) add(new THREE.Mesh(geo('beacon', () => new THREE.CylinderGeometry(0.15, 0.15, 14, 6)), mat(0xb68aff, 0xb68aff, 3)), 0, 9, 0);
  return g;
}

type Creature = { obj: THREE.Group; vel: THREE.Vector3; kind: string; ph: number };
function makeCreature(kind: string): THREE.Group {
  const g = new THREE.Group(); const add = (m: THREE.Mesh) => { g.add(m); return m; };
  const glowc = kind === 'angler' ? 0xffe27a : kind === 'shard' ? 0xb07aff : 0x44d8ff;
  switch (kind) {
    case 'fish': { const b = add(new THREE.Mesh(geo('fish', () => new THREE.ConeGeometry(0.4, 1.6, 6)), mat(0xc6d6df, 0, 0, 0.5, 0.4))); b.rotation.z = -Math.PI / 2; break; }
    case 'shark': { const b = add(new THREE.Mesh(geo('shark', () => new THREE.CapsuleGeometry(0.8, 4, 4, 8)), mat(0x62707a, 0, 0, 0.5))); b.rotation.z = Math.PI / 2; const f = add(new THREE.Mesh(geo('fin', () => new THREE.ConeGeometry(0.5, 1.4, 4)), mat(0x55636d))); f.position.y = 1; break; }
    case 'jelly': { const b = add(new THREE.Mesh(geo('jellyc', () => new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0x3a8cff, glowc, 1.8, 0.4))); b.scale.set(1.4, 1, 1.4); for (let i = 0; i < 4; i++) { const t = add(new THREE.Mesh(geo('tent', () => new THREE.CylinderGeometry(0.03, 0.06, 2.4, 4)), mat(0x3a8cff, glowc, 1.2))); t.position.set(Math.sin(i * 1.57) * 0.6, -1.2, Math.cos(i * 1.57) * 0.6); } break; }
    case 'squid': { const b = add(new THREE.Mesh(geo('squid', () => new THREE.ConeGeometry(1, 5, 8)), mat(0x7a2a3a, 0x300810, 0.6))); b.rotation.z = Math.PI / 2; for (let i = 0; i < 6; i++) { const t = add(new THREE.Mesh(geo('tent', () => new THREE.CylinderGeometry(0.03, 0.06, 2.4, 4)), mat(0x7a2a3a))); t.rotation.z = Math.PI / 2; t.position.set(-3 - 1, (i - 2.5) * 0.3, 0); } break; }
    case 'whale': { const b = add(new THREE.Mesh(geo('whale', () => new THREE.CapsuleGeometry(4, 18, 6, 12)), mat(0x1c2630, 0, 0, 0.8))); b.rotation.z = Math.PI / 2; break; }
    case 'angler': { const b = add(new THREE.Mesh(geo('ang', () => new THREE.SphereGeometry(1.3, 10, 8)), mat(0x1a1410, 0, 0, 0.9))); const l = add(new THREE.Mesh(geo('lure', () => new THREE.SphereGeometry(0.22, 8, 8)), mat(glowc, glowc, 4))); l.position.set(1.4, 1.5, 0); l.scale.setScalar(2.2); break; }
    case 'shard': { const b = add(new THREE.Mesh(geo('shard', () => new THREE.OctahedronGeometry(1.1)), mat(0x20103a, glowc, 2.2, 0.2, 0.8))); b.scale.set(0.6, 1.8, 0.6); break; }
    default: { const b = add(new THREE.Mesh(geo('orb', () => new THREE.SphereGeometry(0.4, 8, 8)), mat(glowc, glowc, 3))); break; }
  }
  return g;
}
const CREATURES: Record<number, string[]> = { 1: ['fish', 'fish', 'fish', 'shark', 'whale'], 2: ['jelly', 'jelly', 'squid', 'fish', 'whale'], 3: ['jelly', 'angler', 'squid', 'whale', 'orb'], 4: ['angler', 'orb', 'jelly', 'orb'], 5: ['orb', 'orb', 'angler'], 6: ['orb', 'angler', 'orb'], 7: ['orb', 'shard'], 8: ['shard', 'shard', 'orb'] };

export default function OceanView({ game }: { game: Game }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!; const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); r.setPixelRatio(Math.min(devicePixelRatio, 1.75)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.setSize(el.clientWidth, el.clientHeight); el.appendChild(r.domElement);
    const scene = new THREE.Scene(); const fog = new THREE.FogExp2(0x0f5a8c, 0.01); scene.fog = fog; scene.background = new THREE.Color(0x0f5a8c);
    const cam = new THREE.PerspectiveCamera(62, el.clientWidth / el.clientHeight, 0.3, 2500);
    const amb = new THREE.AmbientLight(0x6aa8cc, 1); const sun = new THREE.DirectionalLight(0xbfe8ff, 1.5); sun.position.set(30, 100, 20); scene.add(amb, sun);
    // terrain
    const N = 150, span = R + 30; const tg = new THREE.PlaneGeometry(span * 2, span * 2, N, N); tg.rotateX(-Math.PI / 2); const pos = tg.attributes.position as THREE.BufferAttribute; const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const d = floorDepth(x, z); pos.setY(i, -d / 10); const c = lerpKeys(d, [[0, new THREE.Color('#8a7f62')], [300, new THREE.Color('#4d5a5c')], [1500, new THREE.Color('#2b3438')], [5000, new THREE.Color('#2a3138')], [9000, new THREE.Color('#252a36')], [11000, new THREE.Color('#2a2040')], [14000, new THREE.Color('#3a2860')]] as [number, THREE.Color][], (a, b, t) => a.clone().lerp(b, Math.min(1, t))); const n = (Math.sin(x * 0.9) * Math.cos(z * 0.8) + 1) * 0.04; col[i * 3] = c.r + n; col[i * 3 + 1] = c.g + n; col[i * 3 + 2] = c.b + n; if (x > 40 && z > 40 && d > 3000 && d < 6500) { col[i * 3] += 0.14; col[i * 3 + 1] += 0.03; } }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals(); scene.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true })));
    // surface
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; scene.add(surf);
    // sub
    const subG = new THREE.Group(); const hullM = mat(0xd99a2b, 0, 0, 0.45, 0.5); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3, 6, 14), hullM); body.rotation.z = Math.PI / 2; subG.add(body);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.8), hullM); tower.position.set(-0.2, 1.1, 0); subG.add(tower); const win = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat(0x9fffff, 0xaaffff, 1.6)); win.position.set(1.5, 0.3, 0); subG.add(win);
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat(0xff3030, 0xff2020, 4)); navR.position.set(-0.2, 1.6, 0.45); const navG = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat(0x30ff60, 0x20ff50, 4)); navG.position.set(-0.2, 1.6, -0.45); subG.add(navR, navG);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.12), mat(0x303840)); prop.position.set(-2.6, 0, 0); subG.add(prop);
    const lamp = new THREE.SpotLight(0xd8f4ff, 260, 110, 0.6, 0.85, 1.3); lamp.position.set(2, 0, 0); lamp.target.position.set(30, -2, 0); subG.add(lamp, lamp.target); const fill = new THREE.PointLight(0xaaf0ff, 70, 60, 1.2); fill.position.set(0, 1.2, 0); subG.add(fill); scene.add(subG); const ventLight = new THREE.PointLight(0xff6a20, 0, 70, 1); scene.add(ventLight);
    // base
    let baseKey = ''; let baseG: THREE.Group | null = null; const baseHolder = new THREE.Group(); baseHolder.position.set(BASE.x, -BASE.depth / 10, BASE.z); scene.add(baseHolder);
    // pois
    const poiObj = new Map<string, THREE.Group>(); const poiHolder = new THREE.Group(); scene.add(poiHolder);
    const bpos = new Float32Array(game.world.length * 3); const bcol = new Float32Array(game.world.length * 3); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(bcol, 3));
    const blips = new THREE.Points(bg, new THREE.PointsMaterial({ map: dotTex, alphaTest: 0.02, size: 14, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthTest: false })); blips.frustumCulled = false; blips.renderOrder = 5; scene.add(blips);
    const sel = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 40), new THREE.MeshBasicMaterial({ color: 0x4fffe0, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })); sel.renderOrder = 6; sel.visible = false; scene.add(sel);
    // marine snow, bubbles
    const SN = 600; const sg = new THREE.BufferGeometry(); const sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { sp[i * 3] = (Math.random() - 0.5) * 120; sp[i * 3 + 1] = (Math.random() - 0.5) * 80; sp[i * 3 + 2] = (Math.random() - 0.5) * 120; } sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: dotTex, alphaTest: 0.02, color: 0xaaddee, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(snow);
    const BN = 40; const bgm = new THREE.BufferGeometry(); const bp = new Float32Array(BN * 3); const bl = new Float32Array(BN); bgm.setAttribute('position', new THREE.BufferAttribute(bp, 3)); const bubbles = new THREE.Points(bgm, new THREE.PointsMaterial({ map: dotTex, alphaTest: 0.02, color: 0xe8fbff, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false })); bubbles.frustumCulled = false; scene.add(bubbles);
    const PN = 80; const pg = new THREE.BufferGeometry(); const pp = new Float32Array(PN * 3); const pv = new Float32Array(PN * 3); const pl = new Float32Array(PN); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const burst = new THREE.Points(pg, new THREE.PointsMaterial({ map: dotTex, alphaTest: 0.02, color: 0xffd36a, size: 1.4, transparent: true, opacity: 1, depthWrite: false })); burst.frustumCulled = false; scene.add(burst);
    // rays
    const rc = document.createElement('canvas'); rc.width = 16; rc.height = 128; const rx = rc.getContext('2d')!; const gr = rx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); rx.fillStyle = gr; rx.fillRect(0, 0, 16, 128); const rt = new THREE.CanvasTexture(rc);
    const rays: THREE.Mesh[] = []; const rayM = new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xaee8ff });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5 + (i % 3) * 3, 50), rayM); m.userData.o = [(i - 4) * 22, ((i * 37) % 11 - 5) * 12]; m.rotation.z = 0.12; rays.push(m); scene.add(m); }
    // sonar
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), new THREE.MeshBasicMaterial({ color: 0x4fffd8, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false })); pulse.visible = false; scene.add(pulse); let pulseT = -1, pulseR = 1; const pulseC = new THREE.Vector3();
    // creatures
    const creatures: Creature[] = []; const spawn = (c: Creature | null, zone: number) => { const list = CREATURES[zone] ?? CREATURES[1]; const kind = list[Math.floor(Math.random() * list.length)]; if (c) scene.remove(c.obj); const obj = makeCreature(kind); const a = Math.random() * 6.28; const rad = 25 + Math.random() * 70; obj.position.set(subG.position.x + Math.cos(a) * rad, subG.position.y + (Math.random() - 0.5) * 30, subG.position.z + Math.sin(a) * rad); if (kind === 'whale') obj.position.y += 10; const sp2 = kind === 'whale' ? 1.5 : kind === 'jelly' ? 0.8 : kind === 'orb' ? 0.5 : 2 + Math.random() * 2; const v = new THREE.Vector3(Math.random() - 0.5, kind === 'jelly' ? 0.1 : (Math.random() - 0.5) * 0.2, Math.random() - 0.5).normalize().multiplyScalar(sp2); const nc: Creature = { obj, vel: v, kind, ph: Math.random() * 6 }; obj.rotation.y = Math.atan2(-v.z, v.x); scene.add(obj); return nc; };
    for (let i = 0; i < 22; i++) creatures.push(spawn(null, 1)); let cz = 1;
    let camMode = 0; const onKey = (e: KeyboardEvent) => { if (e.key === 'v' || e.key === 'V') camMode = (camMode + 1) % 3; }; addEventListener('keydown', onKey);
    const camPos = new THREE.Vector3(); let shake = 0; let flash = 0; let t0 = performance.now(); let raf = 0; let frame = 0; const ringHolder: { m: THREE.Mesh; t: number }[] = [];
    const loop = () => {
      raf = requestAnimationFrame(loop); const now = performance.now(); const raw = Math.min(0.5, (now - t0) / 1000); const dt = Math.min(0.1, raw); t0 = now; frame++; const steps = Math.max(1, Math.ceil(raw / 0.1)); for (let i = 0; i < steps; i++) game.tick(raw / steps); const s = game.s; const u = s.sub; const y = -u.depth / 10; const time = now / 1000;
      subG.position.set(u.x, y, u.z); subG.rotation.y = -u.heading + Math.PI / 2; subG.rotation.z = Math.sin(time * 1.1) * 0.03 - game.input.vert * 0.12; subG.rotation.x = -game.input.turn * 0.1; prop.rotation.x += dt * (4 + Math.abs(game.input.fwd) * 30); const sc = [1, 1.2, 1.1, 1.1, 1.6, 1.4, 1.5][['scout', 'miner', 'explorer', 'research', 'heavy', 'hadal', 'unknown'].indexOf(s.activeSub)] ?? 1; subG.scale.setScalar(sc); hullM.color.set(({ scout: 0xd99a2b, miner: 0xc0501c, explorer: 0x2aa0c0, research: 0xdadde0, heavy: 0x6a7a2a, hadal: 0x4a6a9a, unknown: 0x9a68e8 } as Record<string, number>)[s.activeSub] ?? 0xd99a2b);
      // environment
      const depth = u.depth; const zone = game.zone(); const fc = lerpKeys(depth, KEYS.map(k => [k[0], new THREE.Color(k[1])]) as [number, THREE.Color][], (a, b, t) => a.clone().lerp(b, Math.min(1, t))); if (zone === 5) fc.lerp(new THREE.Color('#2a0e05'), 0.7); fog.color.copy(fc); (scene.background as THREE.Color).copy(fc); fog.density = lerpKeys(depth, DENS, (a, b, t) => a + (b - a) * Math.min(1, t)) * (zone === 8 ? 1.15 : 1);
      const lightK = Math.exp(-depth / 280); amb.intensity = 0.55 + 1.0 * lightK; amb.color.copy(fc).lerp(new THREE.Color(0x88bbdd), 0.3 + 0.5 * lightK); sun.intensity = 1.6 * lightK * (0.92 + 0.08 * Math.sin(time * 3 + Math.sin(time * 1.7))); surf.visible = depth < 700; (surf.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.max(0, 1 - depth / 600); surf.position.set(u.x, 0, u.z);
      rayM.opacity = 0.2 * Math.max(0, 1 - depth / 350) * (0.8 + 0.2 * Math.sin(time * 1.3)); rays.forEach((m, i) => { m.position.set(cam.position.x + m.userData.o[0], -22, cam.position.z + m.userData.o[1]); m.lookAt(cam.position.x, m.position.y, cam.position.z); m.rotation.z += 0.0002 * (i % 2 ? 1 : -1); m.visible = depth < 400; });
      lamp.intensity = 260 + 200 * (1 - lightK); if (frame % 30 === 0) setAmbienceDepth(depth);
      // camera
      const fwdX = Math.sin(u.heading), fwdZ = Math.cos(u.heading); const dist = camMode === 0 ? 11 : camMode === 1 ? 30 : 4; const up = camMode === 0 ? 3.5 : camMode === 1 ? 14 : 0.4; camPos.set(u.x - fwdX * dist, y + up, u.z - fwdZ * dist); camPos.y = Math.min(camPos.y, -0.8); cam.position.lerp(camPos, 1 - Math.pow(0.001, dt));
      shake = Math.max(0, shake - dt); if (shake > 0) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * shake * 1.2, (Math.random() - 0.5) * shake * 1.2, 0)); cam.lookAt(u.x + fwdX * 8, y, u.z + fwdZ * 8);
      // base rebuild
      const key = JSON.stringify(s.modules); if (key !== baseKey) { baseKey = key; if (baseG) { baseHolder.remove(baseG); } baseG = makeBase(s.modules); baseHolder.add(baseG); }
      // pois
      for (const p of game.world) { const d2 = Math.hypot(p.x - u.x, p.z - u.z, (p.depth - u.depth) / 10); let o = poiObj.get(p.id); if (d2 < 130) { if (!o) { o = makePoi(p); o.position.set(p.x, -p.depth / 10, p.z); poiHolder.add(o); poiObj.set(p.id, o); } const depleted = p.kind !== 'discovery' && game.left(p) <= 0; o.scale.setScalar(depleted ? 0.45 : 1); o.traverse(c => { if (c.userData.spin) c.rotation.y += c.userData.spin * dt; }); if (o.userData.pulse) (o.userData.pulse as THREE.Mesh).scale.setScalar(1 + 0.15 * Math.sin(time * 4 + p.x)); } else if (o && d2 > 170) { poiHolder.remove(o); poiObj.delete(p.id); } }
      let vd = 1e9; let vo: THREE.Group | null = null; if (frame % 3 === 0) { poiObj.forEach(o => { if (o.userData.vent) { const dd2 = Math.hypot(o.position.x - u.x, o.position.y - y, o.position.z - u.z); if (dd2 < vd) { vd = dd2; vo = o; } } }); const vv = vo as THREE.Group | null; if (vv) { ventLight.position.set(vv.position.x, vv.position.y + 10, vv.position.z); ventLight.intensity = 140 * Math.max(0, 1 - vd / 90); } else ventLight.intensity = 0; }
      if (frame % 6 === 0) { let k = 0; for (const p of game.world) { const st = game.stage(p); if (st < 1) continue; bpos[k * 3] = p.x; bpos[k * 3 + 1] = -p.depth / 10 + 3; bpos[k * 3 + 2] = p.z; const c = st === 1 ? [0.6, 0.8, 0.9] : st === 2 ? [1, 0.75, 0.2] : p.kind === 'discovery' ? [0.8, 0.5, 1] : [0.3, 1, 0.6]; bcol.set(c, k * 3); k++; } bg.setDrawRange(0, k); (bg.attributes.position as THREE.BufferAttribute).needsUpdate = true; (bg.attributes.color as THREE.BufferAttribute).needsUpdate = true; const nt = game.nearest(40); if (nt) { sel.visible = true; sel.position.set(nt.p.x, -nt.p.depth / 10 + 3, nt.p.z); } else sel.visible = false; }
      if (sel.visible) { sel.lookAt(cam.position); sel.scale.setScalar(1 + 0.12 * Math.sin(time * 5)); }
      // particles
      snow.position.set(u.x, y, u.z); const sa = sg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < SN; i++) { let yy = sa.getY(i) - dt * (zone >= 3 ? 0.5 : 0.9); if (yy < -40) yy += 80; sa.setY(i, yy); } sa.needsUpdate = true; (snow.material as THREE.PointsMaterial).opacity = 0.3 + 0.35 * (1 - lightK);
      const ba = bgm.attributes.position as THREE.BufferAttribute; for (let i = 0; i < BN; i++) { bl[i] -= dt; if (bl[i] <= 0) { if (Math.abs(game.input.fwd) > 0.1 || Math.random() < 0.02) { bl[i] = 1.2 + Math.random(); ba.setXYZ(i, u.x - Math.sin(u.heading) * 2.6 + (Math.random() - 0.5), y + (Math.random() - 0.5) * 0.6, u.z - Math.cos(u.heading) * 2.6 + (Math.random() - 0.5)); } else ba.setXYZ(i, 0, 9999, 0); } else ba.setY(i, ba.getY(i) + dt * 3); } ba.needsUpdate = true;
      // fx
      for (const f of game.fx.splice(0)) { if (f.type === 'pulse') { pulseT = 0; pulseR = f.r ?? 40; pulseC.set(f.x, f.y, f.z); pulse.visible = true; } else if (f.type === 'surge') shake = 0.9; else if (f.type === 'discovery') { flash = 1; const rg = new THREE.Mesh(new THREE.RingGeometry(1, 1.4, 48), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 1, side: THREE.DoubleSide, depthTest: false })); rg.position.set(f.x, f.y + 3, f.z); rg.rotation.x = -Math.PI / 2; scene.add(rg); ringHolder.push({ m: rg, t: 0 }); } else if (f.type === 'extract') { for (let i = 0; i < PN; i++) if (pl[i] <= 0) { pl[i] = 1.2; pp[i * 3] = f.x + (Math.random() - 0.5) * 3; pp[i * 3 + 1] = f.y + 1 + Math.random(); pp[i * 3 + 2] = f.z + (Math.random() - 0.5) * 3; const tx = u.x - pp[i * 3], ty = y - pp[i * 3 + 1], tz = u.z - pp[i * 3 + 2]; const l = Math.hypot(tx, ty, tz) || 1; pv[i * 3] = tx / l * 14; pv[i * 3 + 1] = ty / l * 14 + 2; pv[i * 3 + 2] = tz / l * 14; if (Math.random() < 0.5) break; } } }
      for (let i = 0; i < PN; i++) { if (pl[i] > 0) { pl[i] -= dt; pp[i * 3] += pv[i * 3] * dt; pp[i * 3 + 1] += pv[i * 3 + 1] * dt; pp[i * 3 + 2] += pv[i * 3 + 2] * dt; } else pp[i * 3 + 1] = 9999; } (pg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      for (let i = ringHolder.length - 1; i >= 0; i--) { const rr = ringHolder[i]; rr.t += dt; rr.m.scale.setScalar(1 + rr.t * 30); (rr.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - rr.t / 1.6); if (rr.t > 1.6) { scene.remove(rr.m); ringHolder.splice(i, 1); } }
      if (flash > 0) { flash = Math.max(0, flash - dt * 1.2); amb.intensity += flash * 2; }
      if (pulseT >= 0) { pulseT += dt; const k = pulseT / 1.8; pulse.position.copy(pulseC); pulse.scale.setScalar(Math.max(0.1, pulseR * k)); (pulse.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - k); if (k >= 1) { pulseT = -1; pulse.visible = false; } }
      // creatures
      if (zone !== cz) { cz = zone; for (let i = 0; i < creatures.length; i++) if (i % 2 === 0) creatures[i] = spawn(creatures[i], zone); }
      for (let i = 0; i < creatures.length; i++) { const c = creatures[i]; c.ph += dt; c.obj.position.addScaledVector(c.vel, dt); if (c.kind === 'jelly') c.obj.position.y += Math.sin(c.ph * 2) * dt * 0.8; if (c.kind === 'orb' || c.kind === 'shard') c.obj.rotation.y += dt; const dx = c.obj.position.x - u.x, dz = c.obj.position.z - u.z; if (dx * dx + dz * dz > 120 * 120 || Math.abs(c.obj.position.y - y) > 60) creatures[i] = spawn(c, zone); }
      r.render(scene, cam);
    };
    loop();
    const onResize = () => { r.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }; addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); removeEventListener('keydown', onKey); r.dispose(); el.removeChild(r.domElement); };
  }, [game]);
  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}
