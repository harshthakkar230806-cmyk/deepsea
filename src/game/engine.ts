import type { Inv, ResourceId, SaveData } from '../types';
import { RES, RECIPES } from '../data/resources';
import { SUB, SUB_RP, UPGRADES, SONAR_TIERS, MODULES, STORAGE_CAP, DOCK_CAP, SUBS } from '../data/subs';
import { ZONES, ZONE_RES } from '../data/zones';
import { DISC } from '../data/discoveries';
import { MISSIONS, ACHIEVEMENTS } from '../data/missions';
import { TECH, PERKS } from '../data/research';
import { CONTRACTS, INVESTORS, contractProgress, contractTarget } from '../data/contracts';
import { BASE, R, Poi, buildWorld, classify, floorDepth, zoneAt } from './world';
import { newSave, writeSave } from '../save/save';
import { sfx } from '../audio/audio';

export interface Toast { id: number; text: string; kind: 'info' | 'good' | 'warn' | 'bad'; t: number }
export interface ModalData { title: string; name: string; desc: string; lines: string[]; pages?: string[]; kind: 'discovery' | 'away' | 'final' | 'info' }
export interface Fx { type: 'extract' | 'discovery' | 'surge' | 'pulse'; x: number; y: number; z: number; r?: number }
export interface GameEvent { id: string; name: string; desc: string; ends: number; price?: Record<string, number>; mineEff?: number; upgradeDisc?: number; surge?: number; sonarMult?: number }
const EVENT_DEFS: Omit<GameEvent, 'ends'>[] = [
  { id: 'boom', name: 'SPACE INDUSTRY BOOM', desc: 'Titanium and alloy demand surges.', price: { titanium: 2.3, alloy: 1.5 } },
  { id: 'shortage', name: 'MINERAL SHORTAGE', desc: 'Copper, manganese and platinum are scarce.', price: { copper: 2.2, manganese: 2.4, platinum: 1.8 } },
  { id: 'species', name: 'NEW SPECIES DISCOVERED', desc: 'Biological samples are in high demand.', price: { bio: 1.9, adv_bio: 1.8, bio_research: 1.6, medical: 1.5 } },
  { id: 'eruption', name: 'VOLCANIC ERUPTION', desc: 'Sulfur and methane prices jump.', price: { sulfur: 2, methane: 1.8 } },
  { id: 'storm', name: 'DEEP-SEA STORM', desc: 'Surface operations are inefficient (mining 40% slower above 200m).', mineEff: 0.6 },
  { id: 'breakthrough', name: 'RESEARCH BREAKTHROUGH', desc: 'Submarine upgrade costs reduced by 25%.', upgradeDisc: 0.25 },
  { id: 'estorm', name: 'ELECTRICAL STORM', desc: 'Interference halves sonar range above 1,000m.', sonarMult: 0.5 },
  { id: 'quake', name: 'UNDERWATER EARTHQUAKE', desc: 'Current surges are far more frequent below 200m.', surge: 2.5 },
  { id: 'signal', name: 'UNKNOWN SIGNAL', desc: 'A mysterious signal has appeared somewhere in the deep ocean.' },
];
const lv = (s: SaveData, id: string) => s.modules[id] ?? 0;
const ARR = (a: number[], i: number) => a[Math.min(a.length - 1, Math.max(0, i))];
export const zoneForDepth = (d: number) => (d < 200 ? 1 : d < 1000 ? 2 : d < 4000 ? 3 : d < 6000 ? 4 : d < 8000 ? 6 : d < 11000 ? 7 : 8);

export class Game {
  s: SaveData; world: Poi[]; poiMap = new Map<string, Poi>();
  toasts: Toast[] = []; modal: ModalData | null = null; fx: Fx[] = []; input = { fwd: 0, turn: 0, vert: 0 };
  oxygen = 100; extract: string | null = null; pingCd = 0; pingAt = 0; events: GameEvent[] = []; supply: Record<string, number> = {}; hist: Record<string, number[]> = {};
  warnAt = 0; surgeIn = 40; surgeWarn = 0; nextEvent = 150; acc = 0; saveT = 0; sec = 0; extAcc = 0; autoAcc: Record<string, number> = {}; labAcc = 0; ventWarn = 0;
  readyToasted = new Set<string>(); tid = 1; version = 0; listeners = new Set<() => void>(); lastZone = 0; away: ModalData | null = null;
  constructor(save: SaveData) {
    this.s = save; this.world = buildWorld(save.seed); this.world.forEach(p => this.poiMap.set(p.id, p));
    for (const r of Object.keys(RES)) this.hist[r] = [this.price(r as ResourceId)];
    this.s.sub.energy = Math.min(this.s.sub.energy, this.d().energy);
    this.applyOffline();
  }
  // ---------- derived ----------
  effect(type: 'sonar' | 'sell' | 'repair' | 'research') { let v = 0; for (const id of this.s.discoveries) { const e = DISC[id]?.effect; if (e && e.type === type) v += e.value; } return v; }
  tech(k: string) { let v = 0; for (const id of this.s.tech) { const fx = TECH[id]?.fx ?? PERKS[id]?.fx ?? []; for (const f of fx) if (f.k === k) v += f.v; } return v; }
  up(k: string, id = this.s.activeSub) { return this.s.subUp[`${id}:${k}`] ?? 0; }
  d(id = this.s.activeSub) {
    const def = SUB[id]; const s = this.s; const tier = SONAR_TIERS[s.sonarTier - 1];
    const gate = tier.gate; const raw = def.maxDepth * (1 + 0.1 * this.up('pressure', id) + this.tech('depth'));
    return { def, hull: def.hull * (1 + 0.25 * this.up('hull', id) + this.tech('hull')), maxDepth: Math.min(raw, gate), rawDepth: raw, gate,
      speed: def.speed * (1 + 0.15 * this.up('engine', id) + this.tech('speed')), cargo: def.cargo * (1 + 0.25 * this.up('cargo', id)),
      energy: def.energy * (1 + 0.25 * this.up('battery', id) + this.tech('energy')) * (1 + ARR([0, 0.15, 0.35, 0.6], lv(s, 'power'))),
      mining: def.mining * (1 + 0.25 * this.up('mining', id) + this.tech('mining')),
      sonar: (def.sonar / 8) * tier.mult * (1 + ARR([0, 0.1, 0.2, 0.35], lv(s, 'sonar')) + this.effect('sonar') + this.tech('sonar')) };
  }
  storageCap() { return Math.round((STORAGE_CAP[lv(this.s, 'storage')] ?? 5000) * (1 + this.tech('storage'))); }
  used(inv: Inv) { let u = 0; for (const [k, v] of Object.entries(inv)) u += (v ?? 0) * (RES[k]?.storage ?? 1); return u; }
  cargoUsed() { return this.used(this.s.sub.cargo); }
  storageUsed() { return this.used(this.s.inventory); }
  zone() { return zoneAt(this.s.sub.x, this.s.sub.z, this.s.sub.depth); }
  dockDist() { return Math.hypot(this.s.sub.x - BASE.x, this.s.sub.z - BASE.z); }
  canDock() { return this.dockDist() < 24 && this.s.sub.depth <= BASE.depth + 120; }
  poiDist(p: Poi) { const u = this.s.sub; return Math.hypot(p.x - u.x, p.z - u.z, (p.depth - u.depth) / 10); }
  rawLeft(p: Poi) { return this.s.poiLeft[p.id] ?? p.amount; }
  left(p: Poi) { return Math.floor(this.rawLeft(p) + 1e-6); }
  stage(p: Poi) { return this.s.poi[p.id] ?? 0; }
  nearest(maxDist = 80, f?: (p: Poi) => boolean): { p: Poi; dist: number } | null { let b: { p: Poi; dist: number } | null = null; for (const p of this.world) { if (this.stage(p) < 1 || (f && !f(p))) continue; const dd = this.poiDist(p); if (dd < maxDist && (!b || dd < b.dist)) b = { p, dist: dd }; } return b; }
  label(p: Poi): string {
    const st = this.stage(p); if (st <= 1) return 'UNKNOWN SIGNAL'; if (st === 2) return `${p.prob}% PROBABILITY — ${classify(p)}`;
    if (p.disc) return DISC[p.disc].name.toUpperCase();
    return `${p.kind === 'wreck' ? 'WRECK' : p.kind === 'bio' ? 'BIOLOGICAL SITE' : p.kind === 'vent' ? 'THERMAL VENT' : p.kind === 'anomaly' ? 'ANOMALY' : 'DEPOSIT'}: ${RES[p.resource].name.toUpperCase()}`;
  }
  // ---------- messaging ----------
  emit() { this.version++; this.listeners.forEach(l => l()); }
  toast(text: string, kind: Toast['kind'] = 'info') { this.toasts.push({ id: this.tid++, text, kind, t: 5 }); if (this.toasts.length > 5) this.toasts.shift(); this.emit(); }
  persist() { this.s.lastSeen = Date.now(); writeSave(this.s); }
  // ---------- market ----------
  evMult(r: string) { let m = 1; for (const e of this.events) if (e.price?.[r]) m *= e.price[r]; return m; }
  price(r: ResourceId) {
    const def = RES[r]; let p = def.baseValue * (this.s.mult[r] ?? 1) * this.evMult(r);
    p *= 1 + ARR([0, 0.03, 0.06, 0.1], lv(this.s, 'trading')) + this.effect('sell') + Math.min(0.1, this.s.reputation / 1000); if (def.rarity === 'processed' && lv(this.s, 'processing') >= 3) p *= 1.15; if (def.rarity === 'processed') p *= 1 + this.tech('processed'); if (r === 'bio' || r === 'adv_bio' || r === 'bio_research') p *= 1 + this.tech('bioPrice'); if (r === 'medical') p *= 1 + this.tech('medical'); if (r === 'sulfur' || r === 'methane') p *= 1 + this.tech('geo'); p *= 1 + this.tech('sell');
    return p * (1 - (this.supply[r] ?? 0));
  }
  depthOf(r: ResourceId) { return 3000 / Math.sqrt(RES[r].baseValue); }
  sell(r: ResourceId, qty: number) {
    qty = Math.floor(qty); const have = this.s.inventory[r] ?? 0; qty = Math.min(qty, have); if (qty <= 0) return;
    const P0 = this.price(r) / (1 - (this.supply[r] ?? 0)); const p0 = this.supply[r] ?? 0; const p1 = Math.min(0.6, p0 + qty / this.depthOf(r));
    const rev = Math.max(0, Math.floor(qty * P0 * (1 - (p0 + p1) / 2)));
    this.s.inventory[r] = have - qty; this.s.credits += rev; this.s.stats.sold += qty; this.s.stats.earned += rev; this.supply[r] = p1;
    sfx('coin'); this.toast(`Sold ${qty} ${RES[r].name} for $${rev.toLocaleString()}`, 'good'); this.persist(); this.emit();
  }
  buy(r: ResourceId, qty: number) {
    const def = RES[r]; if (def.rarity === 'processed' || def.rarity === 'rare' || def.rarity === 'very_rare') return this.toast('Not available on the open market.', 'warn');
    qty = Math.floor(qty); if (qty <= 0) return; const cost = Math.ceil(qty * this.price(r) * 1.25);
    if (cost > this.s.credits) return this.toast('Not enough credits.', 'bad');
    if (this.storageUsed() + qty * def.storage > this.storageCap()) return this.toast('Not enough storage.', 'bad');
    this.s.credits -= cost; this.s.inventory[r] = (this.s.inventory[r] ?? 0) + qty; sfx('click'); this.emit();
  }
  // ---------- processing ----------
  processLevel() { return lv(this.s, 'processing'); }
  process(id: string, batches: number) {
    const rec = RECIPES.find(r => r.id === id); if (!rec) return; if (this.processLevel() < rec.level) return this.toast('Upgrade the Processing Facility.', 'warn');
    let n = Math.floor(batches); for (const [k, v] of Object.entries(rec.inputs)) n = Math.min(n, Math.floor((this.s.inventory[k as ResourceId] ?? 0) / (v ?? 1)));
    if (n <= 0) return this.toast('Not enough materials.', 'warn');
    for (const [k, v] of Object.entries(rec.inputs)) this.s.inventory[k as ResourceId] = (this.s.inventory[k as ResourceId] ?? 0) - n * (v ?? 1);
    this.s.inventory[rec.out] = (this.s.inventory[rec.out] ?? 0) + n; this.s.stats.processed += n * Object.values(rec.inputs).reduce((a, b) => a + (b ?? 0), 0);
    this.s.resSeen.includes(rec.out) || this.s.resSeen.push(rec.out); sfx('machine'); this.toast(`Produced ${n} ${RES[rec.out].name}`, 'good'); this.persist(); this.emit();
  }
  // ---------- sonar & exploration ----------
  ping() {
    if (this.modal || this.pingCd > 0) return; const dd = this.d(); const range = dd.sonar * (this.s.sub.depth < 1000 ? this.events.reduce((m, e) => m * (e.sonarMult ?? 1), 1) : 1); const cost = 3 * (1 + this.s.sub.depth / 6000);
    if (this.s.sub.energy < cost) return this.toast('Not enough energy for sonar.', 'warn');
    this.s.sub.energy -= cost; this.pingCd = 3; this.pingAt = performance.now(); this.s.stats.pings++; sfx('ping');
    this.fx.push({ type: 'pulse', x: this.s.sub.x, y: -this.s.sub.depth / 10, z: this.s.sub.z, r: range }); let found = 0;
    for (const p of this.world) {
      if (p.tier > this.s.sonarTier) continue; const dist = this.poiDist(p); if (dist > range) continue; const st = this.stage(p); let ns = st;
      if (st < 1) ns = 1; if (ns === 1 && dist <= range * 0.7) ns = 2;
      if (this.s.sonarTier >= 2 && p.kind !== 'discovery' && p.kind !== 'signal' && dist <= range * 0.5) ns = 3;
      if (ns > st) { this.s.poi[p.id] = ns; if (st === 0) found++; }
    }
    this.toast(found ? `SONAR: ${found} new contact${found > 1 ? 's' : ''}` : 'SONAR: no new contacts', found ? 'good' : 'info'); this.emit();
  }
  investigate() {
    if (this.modal) return; const n = this.nearest(24, q => this.stage(q) < 3); if (!n) return this.toast(this.nearest(24) ? 'Everything nearby is already identified.' : 'No contact within 240m. Move closer.', 'warn'); const p = n.p; const st = this.stage(p); this.s.poi[p.id] = 3; this.s.stats.investigated++; sfx('click');
    if (p.disc) return this.reveal(p);
    this.toast(`IDENTIFIED — ${RES[p.resource].name} (${this.left(p)} units)`, 'good'); this.emit();
  }
  reveal(p: Poi) {
    const d = DISC[p.disc!]; if (this.s.discoveries.includes(d.id)) return;
    const rp = Math.round(d.research * (1 + this.effect('research') + this.tech('research'))); this.s.discoveries.push(d.id); this.s.credits += d.credits; this.s.stats.earned += d.credits; this.s.research += rp; this.s.reputation += d.rep;
    const lines = [`+${d.credits.toLocaleString()} Credits`, `+${rp} Research`, `+${d.rep} Reputation`, 'NEW JOURNAL ENTRY']; if (d.effect) lines.push(d.effect.text);
    this.modal = { title: 'NEW DISCOVERY', name: d.name.toUpperCase(), desc: d.desc, lines, kind: 'discovery' }; sfx(d.cat === 'mystery' ? 'mystery' : 'discovery');
    this.fx.push({ type: 'discovery', x: p.x, y: -p.depth / 10, z: p.z }); this.persist(); this.emit();
    if (['d_cave', 'd_canyon', 'd_trench1', 'd_brine', 'd_spire'].includes(d.id)) this.hit(0.04 / (1 + 0.15 * this.up('hull')), 'Unstable rock fall');
  }
  closeModal() { this.modal = null; if (this.away) { this.modal = this.away; this.away = null; } this.emit(); }
  // ---------- extraction ----------
  extractTarget(): Poi | null { const n = this.nearest(16, q => this.stage(q) >= 3 && q.kind !== 'discovery' && q.kind !== 'signal'); return n ? n.p : null; }
  startExtract() {
    if (this.modal) return; const p = this.extractTarget(); if (!p) return this.toast('Identify a deposit within 160m first.', 'warn');
    if (this.left(p) <= 0) return this.toast('Deposit depleted. It slowly regenerates.', 'warn');
    if (p.kind === 'vent' && this.up('thermal') < 1) return this.toast('THERMAL PROTECTION REQUIRED to mine vents.', 'bad');
    if (this.cargoUsed() >= this.d().cargo) return this.toast('Cargo hold full. Return to base and dock.', 'warn');
    this.extract = p.id; this.emit();
  }
  stopExtract() { this.extract = null; this.emit(); }
  mineEff() { let e = 1; for (const ev of this.events) if (ev.mineEff && this.s.sub.depth < 200) e *= ev.mineEff; return e; }
  // ---------- docking, repair, recover ----------
  dock() {
    if (!this.canDock()) return this.toast('Move within 240m of the base (above 180m depth) to dock.', 'warn'); const u = this.s.sub; let moved = 0, stuck = 0;
    for (const [k, v] of Object.entries(u.cargo) as [ResourceId, number][]) {
      if (!v) continue; const free = this.storageCap() - this.storageUsed(); const per = RES[k].storage; const can = Math.min(v, Math.floor(free / per));
      if (can > 0) { this.s.inventory[k] = (this.s.inventory[k] ?? 0) + can; u.cargo[k] = v - can; moved += can; } if (u.cargo[k]! > 0) stuck += u.cargo[k]!; else delete u.cargo[k];
    }
    u.energy = this.d().energy; this.oxygen = 100; u.x = BASE.x + 8; u.z = BASE.z; u.depth = BASE.depth; this.extract = null; sfx('dock');
    this.toast(moved ? `Docked: ${moved} units unloaded, batteries recharged.` : 'Docked: batteries recharged.', 'good'); if (stuck) this.toast(`Storage full: ${stuck} units remain on the sub. Upgrade Storage or sell.`, 'warn'); this.persist(); this.emit();
  }
  repairCost() { const f = 1 - (this.s.hull[this.s.activeSub] ?? 1); return Math.ceil(f * SUB[this.s.activeSub].repair * (1 - Math.min(0.9, ARR([0, 0.25, 0.5, 0.7], lv(this.s, 'repair')) + this.effect('repair')))); }
  repair() {
    if (!this.canDock()) return this.toast('Dock at the base to repair.', 'warn'); const c = this.repairCost(); if (c <= 0) return this.toast('Hull is fully repaired.', 'info');
    if (c > this.s.credits) return this.toast('Not enough credits to repair.', 'bad'); this.s.credits -= c; this.s.hull[this.s.activeSub] = 1; this.s.stats.repairs++; sfx('machine'); this.toast(`Hull repaired for $${c.toLocaleString()}.`, 'good'); this.persist(); this.emit();
  }
  recover(reason: string) {
    const u = this.s.sub; const fee = Math.min(this.s.credits, Math.round(SUB[this.s.activeSub].repair * 0.1)); this.s.credits -= fee; u.x = BASE.x + 8; u.z = BASE.z; u.depth = BASE.depth; u.energy = this.d().energy * 0.3; this.oxygen = 100;
    this.s.hull[this.s.activeSub] = Math.max(0.25, this.s.hull[this.s.activeSub] ?? 1); this.extract = null; this.toast(`${reason} Emergency recovery towed the sub to base ($${fee.toLocaleString()}). Cargo is safe.`, 'bad'); sfx('alarm'); this.persist(); this.emit();
  }
  // ---------- purchases ----------
  upCost(k: string, id = this.s.activeSub) { const u = UPGRADES.find(x => x.id === k)!; const idx = SUBS.findIndex(x => x.id === id); let disc = 1; for (const e of this.events) if (e.upgradeDisc) disc *= 1 - e.upgradeDisc; return Math.round(u.base * Math.pow(1.8, this.up(k, id)) * (1 + idx * 0.8) * disc); }
  buyUpgrade(k: string) {
    const u = UPGRADES.find(x => x.id === k)!; const l = this.up(k); if (l >= u.max) return this.toast('Maximum level.', 'info'); const c = this.upCost(k); if (c > this.s.credits) return this.toast('Not enough credits.', 'bad');
    this.s.credits -= c; this.s.subUp[`${this.s.activeSub}:${k}`] = l + 1; this.s.stats.upgrades++; const dd = this.d(); this.s.sub.energy = Math.min(this.s.sub.energy + 1, dd.energy); sfx('upgrade'); this.toast(`${u.name} upgraded to level ${l + 1}.`, 'good'); this.persist(); this.emit();
  }
  buySonar() {
    const nxt = SONAR_TIERS[this.s.sonarTier]; if (!nxt) return; if (nxt.cost > this.s.credits) return this.toast('Not enough credits.', 'bad'); if (nxt.rp > this.s.research) return this.toast(`Needs ${nxt.rp} Research Points.`, 'warn');
    if (nxt.tier === 3 && !this.s.ownedSubs.some(i => SUB[i].maxDepth >= 4000)) return this.toast('Deep Sonar needs a sub rated to 4,000m+.', 'warn');
    this.s.credits -= nxt.cost; this.s.research -= nxt.rp; this.s.sonarTier = nxt.tier; this.s.stats.upgrades++; sfx('upgrade'); this.toast(`${nxt.name} installed fleet-wide.`, 'good'); this.persist(); this.emit();
  }
  buySub(id: string) {
    const def = SUB[id]; if (this.s.ownedSubs.includes(id)) return; if (this.s.ownedSubs.length >= (DOCK_CAP[lv(this.s, 'dock')] ?? 2)) return this.toast('Dock is full. Upgrade the Dock.', 'warn');
    if (def.cost > this.s.credits) return this.toast('Not enough credits.', 'bad'); if ((SUB_RP[id] ?? 0) > this.s.research) return this.toast(`Needs ${SUB_RP[id]} Research Points.`, 'warn'); this.s.credits -= def.cost; this.s.research -= SUB_RP[id] ?? 0; this.s.ownedSubs.push(id); this.s.hull[id] = 1; sfx('upgrade'); this.toast(`${def.name} added to the fleet.`, 'good'); this.persist(); this.emit();
  }
  selectSub(id: string) {
    if (!this.s.ownedSubs.includes(id) || id === this.s.activeSub) return; if (!this.canDock()) return this.toast('Dock first to switch submarines.', 'warn');
    this.dock(); this.s.activeSub = id; const u = this.s.sub; u.energy = this.d().energy; this.toast(`${SUB[id].name} is now active.`, 'good'); this.persist(); this.emit();
  }
  buildModule(id: string) {
    const m = MODULES.find(x => x.id === id)!; const l = lv(this.s, id); if (l >= 4) return; const c = m.costs[l + 1]; if (c > this.s.credits) return this.toast('Not enough credits.', 'bad');
    this.s.credits -= c; this.s.modules[id] = l + 1; sfx('upgrade'); this.toast(`${m.name} ${l === 0 ? 'built' : 'upgraded'} (level ${l + 1}).`, 'good'); this.persist(); this.emit();
  }
  // ---------- missions ----------
  mission(m = MISSIONS.find(x => !this.s.missionsDone.includes(x.id))) { return m; }
  claim(id: string) {
    const m = MISSIONS.find(x => x.id === id); if (!m || this.s.missionsDone.includes(id) || m.cur(this.s) < m.max) return;
    this.s.missionsDone.push(id); this.s.credits += m.credits; this.s.stats.earned += m.credits; this.s.research += m.research; this.s.reputation += m.rep; sfx('coin'); this.toast(`Mission complete: ${m.title} (+$${m.credits.toLocaleString()})`, 'good'); this.persist(); this.emit();
  }
  hint(): string {
    const s = this.s; if (s.stats.pings < 1) return 'Press PING (Space) to scan the nearby ocean floor.';
    if (!s.discoveries.includes('d_module')) return 'A contact lies near base. Fly to it on the map, then press INVESTIGATE (I).';
    if (s.stats.extracted < 1) return 'Find a deposit: INVESTIGATE it, then hold position and press EXTRACT (E).';
    if (s.stats.sold < 1) return 'Return to base, DOCK (G), then sell at the Market.';
    if (s.stats.upgrades < 1) return 'Open Fleet and buy a submarine upgrade.';
    if (this.s.sub.depth > this.d().maxDepth - 60) return `Depth limit reached (${Math.round(this.d().maxDepth)}m). Upgrade pressure resistance or sonar to go deeper.`;
    const m = this.mission(); return m ? `${m.title}: ${m.desc}` : 'Keep descending. What is down there?';
  }
  // ---------- research & contracts ----------
  researchTech(id: string) {
    const x = TECH[id]; const s = this.s; if (!x || s.tech.includes(id)) return; if (!x.req.every(r => s.tech.includes(r))) return this.toast('Prerequisite research missing.', 'warn');
    if (x.credits > s.credits) return this.toast('Not enough credits.', 'bad'); if (x.rp > s.research) return this.toast(`Needs ${x.rp} Research Points.`, 'warn');
    for (const [k, v] of Object.entries(x.res ?? {})) if ((s.inventory[k as ResourceId] ?? 0) < (v ?? 0)) return this.toast(`Needs ${v} ${RES[k].name} in storage.`, 'warn');
    s.credits -= x.credits; s.research -= x.rp; for (const [k, v] of Object.entries(x.res ?? {})) s.inventory[k as ResourceId] = (s.inventory[k as ResourceId] ?? 0) - (v ?? 0);
    s.tech.push(id); sfx('upgrade'); this.toast(`Research complete: ${x.name}`, 'good'); this.persist(); this.emit();
  }
  acceptContract(id: string) { const c = CONTRACTS.find(x => x.id === id); const k = this.s.contracts; if (!c || k.done.includes(id) || k.active.includes(id)) return; if (this.s.reputation < c.minRep) return this.toast(`Needs ${c.minRep} reputation.`, 'warn'); if (k.active.length >= 4) return this.toast('Maximum 4 active contracts.', 'warn'); k.active.push(id); sfx('click'); this.persist(); this.emit(); }
  deliverContract(id: string) {
    const c = CONTRACTS.find(x => x.id === id); const s = this.s; if (!c || c.kind !== 'deliver' || !s.contracts.active.includes(id)) return; const need = c.qty! - (s.cprog[id] ?? 0); const take = Math.min(need, Math.floor(s.inventory[c.res!] ?? 0));
    if (take <= 0) return this.toast(`No ${RES[c.res!].name} in storage.`, 'warn'); s.inventory[c.res!] = (s.inventory[c.res!] ?? 0) - take; s.cprog[id] = (s.cprog[id] ?? 0) + take; sfx('click'); this.emit();
  }
  completeContract(id: string) {
    const c = CONTRACTS.find(x => x.id === id); const s = this.s; if (!c || !s.contracts.active.includes(id) || s.contracts.done.includes(id)) return; if (contractProgress(c, s) < contractTarget(c)) return;
    s.contracts.active = s.contracts.active.filter(x => x !== id); s.contracts.done.push(id); s.credits += c.credits; s.stats.earned += c.credits; s.research += c.rp; s.reputation += c.rep; if (c.perk && !s.tech.includes(c.perk)) s.tech.push(c.perk);
    sfx('coin'); this.toast(`Contract complete: ${c.title}${c.perk ? ` — received ${PERKS[c.perk].name}` : ''}`, 'good'); this.persist(); this.emit();
  }
  claimInvestor() { const inv = INVESTORS[this.s.investor]; if (!inv || this.s.reputation < inv.rep) return; this.s.investor++; this.s.credits += inv.credits; this.s.stats.earned += inv.credits; sfx('coin'); this.toast(`Investors fund your company: +$${inv.credits.toLocaleString()}`, 'good'); this.persist(); this.emit(); }
  // ---------- finale ----------
  finaleReqs() {
    const s = this.s; const myst = s.discoveries.filter(i => (DISC[i].mystery ?? 0) >= 3).length;
    return [{ label: 'Quantum Sonar installed', ok: s.sonarTier >= 4 }, { label: 'Own a Hadal Explorer or Unknown Class sub', ok: s.ownedSubs.includes('hadal') || s.ownedSubs.includes('unknown') },
      { label: 'Reach the Hadal Zone (8,000m)', ok: s.stats.deepest >= 8000 }, { label: 'Discover 3 major anomalies', ok: myst >= 3 }, { label: 'Hold 1 Unknown Crystal in storage', ok: (s.inventory.crystals ?? 0) >= 1 },
      { label: 'Research Exotic Matter Studies (Hadal Technology)', ok: s.tech.includes('had3') }, { label: 'Final expedition preparation ($1,000,000)', ok: (s.modules.finalprep ?? 0) > 0 }];
  }
  prepFinale() { if ((this.s.modules.finalprep ?? 0) > 0 || this.s.credits < 1e6) return this.toast('Need $1,000,000.', 'warn'); this.s.credits -= 1e6; this.s.modules.finalprep = 1; this.toast('Expedition prepared.', 'good'); this.persist(); this.emit(); }
  launchFinale() {
    if (this.s.finale) return; if (!this.finaleReqs().every(r => r.ok)) return this.toast('Requirements not met.', 'warn'); this.s.inventory.crystals = (this.s.inventory.crystals ?? 1) - 1; this.s.finale = true; this.s.endgame = true; this.s.reputation += 100; this.s.research += 1000;
    this.modal = { title: 'THE FINAL DESCENT', name: 'THE DEEP ANSWERS', desc: '', lines: ['ENDGAME MODE UNLOCKED', '+100 Reputation', '+1,000 Research'], kind: 'final', pages: [
      'Your sub clears the Hadal floor. The water is silent. Even the sonar is quiet.',
      'Ahead, the Threshold opens. Light that is not fire climbs out of the dark. Every instrument you own reads the same message: it knew you were coming.',
      'The structures you found were never ruins. They were markers, left for whoever learned to dive deep enough to read them. You are the first to arrive.',
      'Behind you, your first small platform glows far above. Beneath you, something old is beginning to wake. The deep was waiting for you. Now you can keep exploring it.'] }; sfx('mystery'); this.persist(); this.emit();
  }
  // ---------- automation / offline ----------
  autoRates() {
    const mult = ARR([0, 1, 1.6, 2.4], lv(this.s, 'automation')) * (1 + this.tech('auto')); const out: { sub: string; res: ResourceId; perHour: number }[] = []; if (!mult) return out;
    for (const id of this.s.ownedSubs) {
      if (id === this.s.activeSub) continue; const def = SUB[id]; const dd = this.d(id); const z = zoneForDepth(Math.min(dd.maxDepth, 11000) * 0.9); const list = [...new Set(ZONE_RES[z].deposit)]; const target = (2500 + def.cost * 0.05) * mult;
      for (const r of list) out.push({ sub: id, res: r, perHour: target / list.length / RES[r].baseValue });
    }
    return out;
  }
  autoSum() { const m: Record<string, number> = {}; for (const r of this.autoRates()) m[r.res] = (m[r.res] ?? 0) + r.perHour; return m; }
  addStorage(r: ResourceId, n: number) { const room = Math.floor((this.storageCap() - this.storageUsed()) / RES[r].storage); const a = Math.max(0, Math.min(n, room)); if (a > 0) { this.s.inventory[r] = (this.s.inventory[r] ?? 0) + a; this.s.resSeen.includes(r) || this.s.resSeen.push(r); } return a; }
  applyOffline() {
    const secs = Math.min((Date.now() - this.s.lastSeen) / 1000, 8 * 3600); if (secs < 120) return; const lines: string[] = []; const hrs = secs / 3600;
    for (const [r, perH] of Object.entries(this.autoSum())) { const a = this.addStorage(r as ResourceId, Math.floor(perH * hrs)); if (a > 0) lines.push(`+${a.toLocaleString()} ${RES[r].name}`); }
    const rp = Math.floor(ARR([0, 0.6, 1.8, 4], lv(this.s, 'lab')) * (secs / 60)); if (rp > 0) { this.s.research += rp; lines.push(`+${rp} Research Points`); }
    if (lines.length) this.away = { title: 'WHILE YOU WERE AWAY', name: `${Math.floor(hrs * 10) / 10} hours at sea`, desc: 'Your automated fleet kept working.', lines, kind: 'away' };
    this.s.lastSeen = Date.now(); if (this.away) { this.modal = this.away; this.away = null; }
  }
  // ---------- main tick ----------
  tick(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.1); if (this.modal) return; const s = this.s; const u = s.sub; const dd = this.d(); this.sec += dt; this.saveT += dt;
    for (const t of this.toasts) t.t -= dt; this.toasts = this.toasts.filter(t => t.t > 0); if (this.pingCd > 0) this.pingCd -= dt;
    // movement
    const extracting = !!this.extract; const fwd = extracting ? 0 : this.input.fwd; u.heading += this.input.turn * dt * 1.7;
    const spd = dd.speed * 2; u.x += Math.sin(u.heading) * fwd * spd * dt; u.z += Math.cos(u.heading) * fwd * spd * dt; const rr = Math.hypot(u.x, u.z); if (rr > R - 4) { u.x *= (R - 4) / rr; u.z *= (R - 4) / rr; }
    const vert = extracting ? 0 : this.input.vert; u.depth += vert * dd.speed * 10 * dt;
    const limit = Math.min(dd.maxDepth, floorDepth(u.x, u.z) - 8); if (u.depth > limit) { u.depth = limit; if (vert > 0 && dd.maxDepth <= floorDepth(u.x, u.z) - 8 && performance.now() - this.warnAt > 4000) { this.warnAt = performance.now(); this.toast(`PRESSURE LIMIT — rated to ${Math.round(dd.maxDepth)}m${dd.gate <= dd.rawDepth ? ' (upgrade sonar to go deeper)' : ''}`, 'warn'); } }
    if (u.depth < 0) u.depth = 0; if (u.depth > s.stats.deepest) s.stats.deepest = Math.floor(u.depth);
    // energy
    const moving = Math.abs(fwd) + Math.abs(vert) * 0.6; u.energy -= (0.04 + moving * 0.22 + (extracting ? 1.2 : 0)) * (1 + u.depth / 6000) * dt;
    if (this.canDock() && moving === 0) u.energy = Math.min(dd.energy, u.energy + dd.energy * 0.02 * dt);
    if (u.energy <= 0) { u.energy = 0; this.recover('POWER FAILURE.'); }
    this.oxygen -= (u.depth > 200 ? 0.06 : 0.025) * dt; if (this.canDock() && moving === 0) this.oxygen = Math.min(100, this.oxygen + 4 * dt); if (this.oxygen < 25 && this.oxygen > 24.8) this.toast('LOW OXYGEN — return to base soon.', 'warn'); if (this.oxygen <= 0) { this.oxygen = 100; this.recover('LIFE SUPPORT FAILURE.'); }
    // zone
    const z = this.zone(); if (z !== this.lastZone) { if (this.lastZone && !s.discoveries.includes('zone' + z)) { /* journal derived from deepest */ } this.lastZone = z; this.toast(`ENTERING: ${ZONES[z - 1].name.toUpperCase()}`, 'info'); }
    // extraction
    if (this.extract) {
      const p = this.poiMap.get(this.extract)!; const left = this.left(p); const ok = this.poiDist(p) <= 16 && left > 0 && this.cargoUsed() < dd.cargo;
      if (!ok) { if (left <= 0) this.toast(`${RES[p.resource].name} deposit depleted.`, 'info'); else if (this.cargoUsed() >= dd.cargo) this.toast('Cargo hold full.', 'warn'); this.extract = null; }
      else { this.extAcc += dd.mining * 15 * this.mineEff() * dt; let n = Math.floor(this.extAcc); if (n > 0) { this.extAcc -= n; const per = RES[p.resource].storage; n = Math.min(n, left, Math.floor((dd.cargo - this.cargoUsed()) / per)); if (n > 0) { u.cargo[p.resource] = (u.cargo[p.resource] ?? 0) + n; s.poiLeft[p.id] = Math.max(0, this.rawLeft(p) - n); s.stats.extracted += n; if (!s.resSeen.includes(p.resource)) { s.resSeen.push(p.resource); this.toast(`New resource logged: ${RES[p.resource].name}`, 'good'); } this.fx.push({ type: 'extract', x: p.x, y: -p.depth / 10, z: p.z }); if (Math.random() < 0.25) sfx('mine'); } } }
    }
    // hazards
    if (u.depth > 200) { this.surgeIn -= dt * (this.events.some(e => e.surge) ? 2.5 : 1); if (this.surgeIn <= 0 && !this.surgeWarn) { this.surgeWarn = 4; this.toast('CURRENT SURGE INCOMING', 'warn'); sfx('alarm'); } }
    if (this.surgeWarn > 0) { this.surgeWarn -= dt; if (this.surgeWarn <= 0) { this.surgeWarn = 0; this.surgeIn = 45 + Math.random() * 35; const dmg = (0.02 + 0.006 * z) / (1 + 0.15 * this.up('hull')); this.hit(dmg, 'Current surge'); this.fx.push({ type: 'surge', x: u.x, y: -u.depth / 10, z: u.z }); } }
    if (z === 5) { for (const p of this.world) if (p.kind === 'vent' && this.poiDist(p) < 28) { const prot = (this.up('thermal') >= 2 ? 0 : this.up('thermal') === 1 ? 0.4 : 1) * (1 - this.tech('heat')); if (prot > 0) this.hit(0.02 * prot * dt, 'Vent heat', true); if (performance.now() - this.ventWarn > 6000) { this.ventWarn = performance.now(); this.toast(this.up('thermal') < 2 ? 'EXTREME HEAT — move away or upgrade Thermal Protection' : 'Heat shielding holding.', 'warn'); } break; } }
    // slow systems (1s)
    if (this.sec >= 1) {
      this.sec = 0; this.checkProgress(); const rps = ARR([0, 0.6, 1.8, 4], lv(s, 'lab')) / 60; this.labAcc += rps; if (this.labAcc >= 1) { const n = Math.floor(this.labAcc); this.labAcc -= n; s.research += n; }
      const rates = this.autoSum(); for (const [r, h] of Object.entries(rates)) { this.autoAcc[r] = (this.autoAcc[r] ?? 0) + h / 3600; if (this.autoAcc[r] >= 1) { const n = Math.floor(this.autoAcc[r]); this.autoAcc[r] -= n; this.addStorage(r as ResourceId, n); } }
      for (const p of this.world) if (p.kind !== 'discovery') { const l = s.poiLeft[p.id]; if (l !== undefined && l < p.amount) s.poiLeft[p.id] = Math.min(p.amount, l + Math.max(0.2, p.amount * 0.002)); }
      for (const r of Object.keys(this.supply)) this.supply[r] = Math.max(0, this.supply[r] - 0.004);
    }
    // market & events (5s)
    this.acc += dt; if (this.acc >= 5) { this.acc = 0; for (const r of Object.keys(RES)) { const m = s.mult[r] ?? 1; s.mult[r] = Math.min(1.9, Math.max(0.55, m + (1 - m) * 0.06 + (Math.random() - 0.5) * 0.07)); const h = this.hist[r]; h.push(this.price(r as ResourceId)); if (h.length > 40) h.shift(); } this.emit(); }
    this.events = this.events.filter(e => e.ends > Date.now()); this.nextEvent -= dt; if (this.nextEvent <= 0) { this.nextEvent = 150 + Math.random() * 110; this.spawnEvent(); }
    if (this.saveT > 20) { this.saveT = 0; this.persist(); }
  }
  hit(frac: number, why: string, quiet = false) {
    const id = this.s.activeSub; this.s.hull[id] = Math.max(0, (this.s.hull[id] ?? 1) - frac); if (!quiet) this.toast(`${why}: hull -${(frac * 100).toFixed(1)}%`, 'bad'); if (this.s.hull[id] <= 0) this.recover('HULL FAILURE.');
  }
  spawnEvent() {
    const def = EVENT_DEFS[Math.floor(Math.random() * EVENT_DEFS.length)]; if (def.id === 'signal') { if (this.s.signal) return; this.s.signal = true; if (!this.s.poi.d_signal1) this.s.poi.d_signal1 = 1; this.toast('UNKNOWN SIGNAL — a contact appeared on your map.', 'warn'); sfx('mystery'); this.emit(); return; }
    if (this.events.some(e => e.id === def.id)) return; this.events.push({ ...def, ends: Date.now() + 100000 }); this.toast(`EVENT: ${def.name}`, 'warn'); this.emit();
  }
  checkProgress() {
    const s = this.s; for (const m of MISSIONS) if (!s.missionsDone.includes(m.id) && m.cur(s) >= m.max && !this.readyToasted.has(m.id)) { this.readyToasted.add(m.id); this.toast(`MISSION READY: ${m.title} — claim it in Missions.`, 'good'); }
    for (const a of ACHIEVEMENTS) if (!s.achievements.includes(a.id) && a.test(s)) { s.achievements.push(a.id); s.reputation += 1; this.toast(`ACHIEVEMENT: ${a.name}`, 'good'); }
    this.emit();
  }
  setInput(k: 'fwd' | 'turn' | 'vert', v: number) { this.input[k] = v; }
  reset(): Game { return new Game(newSave()); }
}
