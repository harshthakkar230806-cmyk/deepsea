import type { ResourceId } from '../types';
import { DISCOVERIES } from '../data/discoveries';
import { ZONE_RES } from '../data/zones';
import { RES } from '../data/resources';
export const R = 400;
export const BASE = { x: 0, z: 0, depth: 60 };
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function floorDepth(x: number, z: number): number {
  const d = Math.hypot(x, z); const f = Math.min(1, Math.max(0, (d - 30) / 370));
  const base = 120 + 13880 * Math.pow(f, 1.8);
  const n = Math.sin(x * 0.05) * Math.cos(z * 0.045) * 0.5 + Math.sin(x * 0.13 + z * 0.11) * 0.25 + Math.sin(x * 0.31 - z * 0.27) * 0.12;
  return Math.max(100, base + n * (35 + base * 0.035));
}
export const inVentQuadrant = (x: number, z: number) => x > 40 && z > 40;
export function zoneAt(x: number, z: number, depth: number): number {
  if (inVentQuadrant(x, z) && depth >= 3000 && depth <= 6500) return 5;
  if (depth < 200) return 1; if (depth < 1000) return 2; if (depth < 4000) return 3; if (depth < 6000) return 4;
  if (depth < 8000) return 6; if (depth < 11000) return 7; return 8;
}
export type PoiKind = 'deposit'|'wreck'|'bio'|'anomaly'|'vent'|'discovery'|'signal';
export interface Poi { id: string; zone: number; x: number; z: number; depth: number; kind: PoiKind; resource: ResourceId; amount: number; prob: number; tier: number; disc?: string; }
const BAND: Record<number, [number, number]> = { 1:[110,190], 2:[230,950], 3:[1100,3900], 4:[4100,5900], 5:[3200,6400], 6:[6100,7900], 7:[8100,10900], 8:[11100,13900] };
function place(rand: () => number, zone: number, taken: { x: number; z: number }[]): { x: number; z: number; depth: number } | null {
  const [lo, hi] = BAND[zone];
  for (let i = 0; i < 2500; i++) {
    const a = rand() * Math.PI * 2, r = rand() * (R - 8); const x = Math.cos(a) * r, z = Math.sin(a) * r; const fd = floorDepth(x, z);
    if (fd < lo || fd > hi) continue;
    if (zoneAt(x, z, fd) !== zone) continue;
    if (zone === 5 && !inVentQuadrant(x, z)) continue;
    if (taken.some(q => Math.hypot(q.x - x, q.z - z) < 14)) continue;
    taken.push({ x, z });
    return { x, z, depth: fd - 4 };
  }
  return null;
}
export function buildWorld(seed: number): Poi[] {
  const rand = rng(seed ^ 0x9e3779b1); const out: Poi[] = []; const taken: { x: number; z: number }[] = DISCOVERIES.filter(d => d.fixed).map(d => ({ x: d.fixed![0], z: d.fixed![1] }));
  const counts = [0, 20, 18, 18, 14, 12, 12, 12, 8];
  for (let zone = 1; zone <= 8; zone++) {
    const zr = ZONE_RES[zone];
    for (let i = 0; i < counts[zone]; i++) {
      const p = place(rand, zone, taken); if (!p) continue;
      const roll = rand(); let kind: PoiKind = 'deposit'; let resource: ResourceId;
      if (zone === 5 && roll < 0.35) kind = 'vent'; else if (roll > 0.88 && zone >= 4) kind = 'anomaly'; else if (roll > 0.78) kind = 'bio'; else if (roll > 0.66) kind = 'wreck';
      if (kind === 'bio') resource = zr.bio; else if (kind === 'anomaly') resource = zr.anomaly[Math.floor(rand() * zr.anomaly.length)]; else resource = zr.deposit[Math.floor(rand() * zr.deposit.length)];
      const val = RES[resource].baseValue; const amount = Math.max(6, Math.round((900 + rand() * 600) / Math.sqrt(val) * (kind === 'anomaly' ? 0.35 : 1)));
      out.push({ id: `p${zone}_${i}`, zone, x: p.x, z: p.z, depth: p.depth, kind, resource, amount, prob: 70 + Math.floor(rand() * 26), tier: kind === 'vent' ? 2 : kind === 'anomaly' ? zr.tier : 1 });
    }
  }
  const dr = rng(seed ^ 0x51ed270b);
  for (const d of DISCOVERIES) {
    let x: number, z: number, depth: number;
    if (d.fixed) { x = d.fixed[0]; z = d.fixed[1]; depth = floorDepth(x, z) - 4; }
    else { const p = place(dr, d.zone, taken) ?? place(rng(seed + 7), d.zone, []) ?? { x: 100, z: 100, depth: 3500 }; x = p.x; z = p.z; depth = p.depth; }
    out.push({ id: d.id, zone: d.zone, x, z, depth, kind: 'discovery', resource: 'minerals', amount: 0, prob: 80 + Math.floor(dr() * 18), tier: d.tier, disc: d.id });
  }
  return out;
}
export function classify(p: Poi): string {
  switch (p.kind) {
    case 'deposit': return 'MINERAL DEPOSIT'; case 'wreck': return 'METALLIC STRUCTURE'; case 'bio': return 'ORGANIC SIGNATURE';
    case 'vent': return 'THERMAL SOURCE'; case 'anomaly': return 'UNEXPLAINED ENERGY SIGNATURE';
    case 'signal': return 'UNKNOWN SIGNAL';
    default: { const d = DISCOVERIES.find(x => x.id === p.disc); return d?.cat === 'mystery' ? 'UNKNOWN OBJECT' : d?.cat === 'wreck' ? 'METALLIC STRUCTURE' : d?.cat === 'bio' ? 'ORGANIC SIGNATURE' : d?.cat === 'geo' ? 'GEOLOGICAL FORMATION' : 'ARTIFICIAL SIGNATURE'; }
  }
}
