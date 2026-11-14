(globalThis as any).localStorage = { setItem(){}, getItem(){return null}, removeItem(){} };
import { Game } from '../src/game/engine';
import { newSave } from '../src/save/save';
import { RES } from '../src/data/resources';
import { DISCOVERIES } from '../src/data/discoveries';
let fails = 0; const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const g = new Game(newSave()); const s = g.s;
const step = (sec: number) => { for (let i = 0; i < sec * 10; i++) g.tick(0.1); };
const goto = (x: number, z: number, depth: number) => { s.sub.x = x; s.sub.z = z; s.sub.depth = depth; };
ok(g.world.length > 100, `world generated (${g.world.length} POIs)`);
const world2 = new Game({ ...newSave(), seed: s.seed }).world; ok(JSON.stringify(world2) === JSON.stringify(g.world), 'world deterministic per seed');
ok(g.world.some(p => p.id === 'd_signal1') && g.world.filter(p => p.disc).length === DISCOVERIES.length && DISCOVERIES.length >= 50, 'all authored discoveries placed (>=50)');
// ping + scripted discovery
g.ping(); ok(s.stats.pings === 1, 'ping counted');
const mod = g.poiMap.get('d_module')!; ok(g.stage(mod) >= 1, 'research module detected by first ping near base (stage ' + g.stage(mod) + ')');
goto(mod.x + 3, mod.z, mod.depth - 5); g.pingCd = 0; g.ping(); g.investigate();
ok(s.discoveries.includes('d_module') && !!g.modal, 'scripted discovery reveals modal'); const cr = s.credits; g.investigate(); ok(s.credits === cr, 'no duplicate reward when modal open'); g.closeModal();
// find a zone-1 iron/sand deposit
const dep = g.world.find(p => p.zone === 1 && p.kind === 'deposit')!; goto(dep.x + 2, dep.z, dep.depth - 3); g.pingCd = 0; g.ping(); g.investigate(); ok(g.stage(dep) === 3, 'deposit identified');
g.startExtract(); ok(g.extract === dep.id, 'extraction starts'); step(40);
const cargo = g.cargoUsed(); ok(cargo > 0 && cargo <= g.d().cargo, `cargo mined ${cargo}/${g.d().cargo}`);
ok(Object.values(s.sub.cargo).every(v => (v ?? 0) >= 0), 'no negative cargo');
goto(5, 0, 60); ok(g.canDock(), 'can dock at base'); g.dock(); ok(g.cargoUsed() === 0 && g.storageUsed() === cargo, 'dock unloads cargo into storage');
// sell + anti-spam
const r = dep.resource; const have = s.inventory[r] ?? 0; const c0 = s.credits; g.sell(r, have); ok(s.credits > c0 && (s.inventory[r] ?? 0) === 0, `sold ${have} ${r} for $${s.credits - c0}`);
const cA = s.credits; s.inventory.iron = 1000; for (let i = 0; i < 100; i++) g.sell('iron', 10); const spam = s.credits - cA;
const g2 = new Game(newSave()); g2.s.inventory.iron = 1000; g2.sell('iron', 1000); ok(spam <= g2.s.credits - 25000 + 1, `repeat-click selling no better than bulk (${spam} vs ${g2.s.credits - 25000})`);
s.inventory.iron = 5; g.sell('iron', 99999); ok((s.inventory.iron ?? 0) >= 0, 'cannot oversell');
// buy/sell no-arbitrage
const g3 = new Game(newSave()); const cb = g3.s.credits; g3.buy('iron', 100); g3.sell('iron', 100); ok(g3.s.credits < cb, 'buy then sell loses money');
// upgrades
s.credits = 100000; const before = g.d().cargo; g.buyUpgrade('cargo'); ok(g.d().cargo > before && s.stats.upgrades === 1, 'cargo upgrade raises capacity'); s.credits = 0; g.buyUpgrade('hull'); ok(g.up('hull') === 0, 'cannot buy upgrade without credits');
// processing
s.credits = 1e6; g.buildModule('processing'); s.inventory.iron = 10; g.process('steel', 99); ok((s.inventory.steel ?? 0) === 5 && (s.inventory.iron ?? 0) === 0, 'iron -> steel');
// depth gating
goto(0, 0, 60); s.sub.x = 0; s.sub.z = 0; g.input.vert = 1; g.input.fwd = 0; step(60); ok(s.sub.depth <= g.d().maxDepth + 0.01, `depth capped at ${Math.round(s.sub.depth)}m (limit ${Math.round(g.d().maxDepth)})`); g.input.vert = 0;
// fleet
s.credits = 1e7; g.buySub('miner'); ok(s.ownedSubs.includes('miner'), 'bought mining sub'); g.buySub('miner'); ok(s.ownedSubs.filter(x => x === 'miner').length === 1, 'no duplicate sub');
goto(5, 0, 60); g.selectSub('miner'); ok(s.activeSub === 'miner', 'switched sub');
// missions
const m = g.mission()!; s.stats.pings = 5; g.claim('m_scan'); const c2 = s.credits; g.claim('m_scan'); ok(s.credits === c2 && s.missionsDone.filter(x => x === 'm_scan').length === 1, 'mission claimed once');
// emergency recover / hazard
g.hit(2, 'test'); ok(s.hull[s.activeSub] >= 0.25 && g.canDock(), 'hull failure => safe recovery');
// energy
s.sub.energy = 0.001; step(1); ok(s.sub.energy >= 0, 'energy never negative');
// save validate
import { validate, exportSave, importSave } from '../src/save/save';
ok(!!importSave(exportSave(s)), 'export/import roundtrip'); ok(importSave('{bad') === null && validate({ version: 1, credits: -5, ownedSubs: ['scout'], inventory: {}, sub: {} }) === null, 'corrupt/negative saves rejected');
// old save (before research/contracts existed) still loads with defaults
const old: any = JSON.parse(exportSave(newSave())); delete old.tech; delete old.contracts; delete old.cprog; delete old.investor; const lo = validate(old); ok(!!lo && Array.isArray(lo.tech) && lo.contracts.active.length === 0 && lo.investor === 0, 'older save loads with new fields defaulted');
// offline
const so = newSave(); so.modules.automation = 1; so.ownedSubs = ['scout', 'miner']; so.activeSub = 'scout'; so.lastSeen = Date.now() - 4 * 3600e3; const go = new Game(so); ok(!!go.modal && go.modal.kind === 'away', 'offline progression modal: ' + go.modal?.lines.join(', '));
// research / contracts / investors / perks
const gr = new Game(newSave()); const r2 = gr.s; r2.credits = 1e6; r2.research = 1000; r2.inventory.titanium = 100; const sr0 = gr.d().sonar; gr.researchTech('exp2'); ok(!r2.tech.includes('exp2'), 'cannot research without prerequisite'); gr.researchTech('exp1'); ok(r2.tech.includes('exp1') && gr.d().sonar > sr0 * 1.1, 'research raises sonar range');
const cr4 = r2.credits; gr.researchTech('exp1'); ok(r2.credits === cr4, 'cannot research twice'); gr.researchTech('eng1'); gr.researchTech('eng2'); ok(r2.tech.includes('eng2') && (r2.inventory.titanium ?? 0) === 80, 'research consumes credits, RP and resources'); r2.research = 0; gr.researchTech('had1'); ok(!r2.tech.includes('had1'), 'research needs RP');
r2.reputation = 0; gr.acceptContract('c3'); ok(!r2.contracts.active.includes('c3'), 'reputation gates contracts'); gr.acceptContract('c1'); r2.inventory.iron = 50; gr.deliverContract('c1'); ok(r2.cprog.c1 === 50 && (r2.inventory.iron ?? 0) === 0, 'contract delivery'); gr.completeContract('c1'); ok(!r2.contracts.done.includes('c1'), 'incomplete contract cannot be completed');
r2.inventory.iron = 500; gr.deliverContract('c1'); ok(r2.cprog.c1 === 200 && r2.inventory.iron === 350, 'delivery capped at requirement'); const cr5 = r2.credits; gr.completeContract('c1'); gr.completeContract('c1'); ok(r2.credits === cr5 + 9000 && r2.contracts.done.length === 1, 'contract paid exactly once');
r2.reputation = 8; gr.acceptContract('c6'); r2.discoveries.push('d_station'); gr.completeContract('c6'); ok(r2.tech.includes('perk_array'), 'contract grants unique equipment'); r2.reputation = 30; const cr6 = r2.credits; gr.claimInvestor(); gr.claimInvestor(); ok(r2.credits === cr6 + 25000 + 100000 && r2.investor === 2, 'investors fund at reputation thresholds');
// oxygen
const go2 = new Game(newSave()); go2.oxygen = 0.001; go2.s.sub.depth = 500; go2.s.sub.x = 100; go2.tick(0.1); ok(go2.canDock() && go2.oxygen === 100, 'oxygen failure => safe recovery');
// final expedition completability
import { buildWorld } from '../src/game/world';
for (const sd of [1, 77, 4242]) { const w = buildWorld(sd); ok(w.some(p => p.resource === 'crystals' && p.kind !== 'discovery'), `seed ${sd}: Unknown Crystals obtainable from deposits`); }
const gf = new Game(newSave()); const f = gf.s; f.sonarTier = 4; f.ownedSubs.push('hadal'); f.stats.deepest = 8200; f.tech.push('had3'); f.discoveries.push('d_artobj', 'd_signal1', 'd_hadal'); f.inventory.crystals = 1; f.credits = 2e6;
ok(!gf.finaleReqs().every(r => r.ok), 'finale locked before preparation'); gf.prepFinale(); ok(gf.finaleReqs().every(r => r.ok), 'all finale requirements satisfiable'); gf.launchFinale(); ok(f.finale && f.endgame && gf.modal?.kind === 'final', 'final descent launches and unlocks endgame mode');
const cr3 = f.credits; gf.launchFinale(); ok(f.credits === cr3 && f.reputation === 100, 'finale rewards granted once');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
