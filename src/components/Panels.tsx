import { useRef, useState } from 'react';
import type { Game } from '../game/engine';
import { RESOURCES, RES, RECIPES } from '../data/resources';
import { SUBS, SUB, SUB_RP, UPGRADES, SONAR_TIERS, MODULES } from '../data/subs';
import { ZONES } from '../data/zones';
import { DISCOVERIES } from '../data/discoveries';
import { MISSIONS, ACHIEVEMENTS } from '../data/missions';
import { exportSave, importSave } from '../save/save';
import { setMuted } from '../audio/audio';
import { TECHS, TECH, PERKS } from '../data/research';
import { CONTRACTS, INVESTORS, contractProgress, contractTarget } from '../data/contracts';
import type { ResourceId, SaveData } from '../types';
const $ = (n: number) => '$' + Math.round(n).toLocaleString();
const N = (n: number) => Math.round(n).toLocaleString();
const RC: Record<string, string> = { common: '#9fb4c0', uncommon: '#5fe9ff', rare: '#e8c050', very_rare: '#d070ff', processed: '#52e08a' };
function Frame({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="overlay" onClick={onClose}><div className="panel" onClick={e => e.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><h2>{title}</h2><div className="sm">{sub}</div></div><button onClick={onClose}>CLOSE ✕</button></div>{children}</div></div>;
}
function Spark({ h }: { h: number[] }) { if (h.length < 2) return null; const mn = Math.min(...h), mx = Math.max(...h); const pts = h.map((v, i) => `${(i / (h.length - 1)) * 80},${22 - ((v - mn) / (mx - mn || 1)) * 20}`).join(' '); return <svg width="80" height="24"><polyline points={pts} fill="none" stroke="#5fe9ff" strokeWidth="1.3" /></svg>; }
function Stat({ label, v, next }: { label: string; v: string; next?: string }) { return <div style={{ minWidth: 110 }}><div className="lab">{label}</div><div>{v}{next && <span style={{ color: 'var(--gr)' }}> → {next}</span>}</div></div>; }

export function FleetPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const d = g.d(); const act = SUB[s.activeSub];
  const prev = (k: string) => { const key = `${s.activeSub}:${k}`; const old = s.subUp[key] ?? 0; s.subUp[key] = old + 1; const n = g.d(); s.subUp[key] = old; return n; };
  const map: Record<string, [string, (x: ReturnType<Game['d']>) => number, string]> = { hull: ['Hull', x => x.hull, ''], pressure: ['Max depth', x => x.rawDepth, 'm'], engine: ['Speed', x => x.speed, ''], cargo: ['Cargo', x => x.cargo, ' kg'], battery: ['Energy', x => x.energy, ''], mining: ['Mining', x => x.mining, '×'] };
  const nxt = SONAR_TIERS[s.sonarTier];
  return <Frame title="SUBMARINE FLEET" sub={`${s.ownedSubs.length}/${[0, 2, 3, 5, 10][s.modules.dock ?? 1]} docks · Research Points: ${N(s.research)}`} onClose={close}>
    <div className="card" style={{ margin: '10px 0' }}><b>{act.name}</b> <span className="sm">(active)</span>
      <div className="row" style={{ border: 0 }}><Stat label="MAX DEPTH" v={`${N(d.maxDepth)}m`} /><Stat label="CARGO" v={`${N(d.cargo)}kg`} /><Stat label="SPEED" v={d.speed.toFixed(1)} /><Stat label="HULL" v={N(d.hull)} /><Stat label="SONAR" v={`${N(d.sonar)}u`} /><Stat label="MINING" v={d.mining.toFixed(1)} /><Stat label="ENERGY" v={N(d.energy)} /><Stat label="RESEARCH" v={String(d.def.research)} /><Stat label="REPAIR (full)" v={$(g.repairCost() || act.repair)} /></div>
      <div className="sm">Hull {(100 * (s.hull[s.activeSub] ?? 1)).toFixed(0)}% · Systems {Math.min(100, 70 + Math.round(30 * (s.hull[s.activeSub] ?? 1)))}% · Sonar {Math.round(100 - 10 * (1 - (s.hull[s.activeSub] ?? 1)) * 3)}% · Engine {Math.round(100 - 6 * (1 - (s.hull[s.activeSub] ?? 1)) * 3)}%</div></div>
    <div className="lab" style={{ marginTop: 12 }}>UPGRADES — {act.name}</div>
    {UPGRADES.map(u => { const l = g.up(u.id); const m = map[u.id]; const n = l < u.max ? prev(u.id) : null; return <div className="row" key={u.id}><div className="grow"><b>{u.name}</b> <span className="tag">LV {l}/{u.max}</span><div className="sm">{u.desc}</div></div>
      {m && n && <div className="sm">{m[0]}: {N(m[1](d))}{m[2]} <span style={{ color: 'var(--gr)' }}>→ {N(m[1](n))}{m[2]}</span></div>}
      <button className="pri" disabled={l >= u.max || g.upCost(u.id) > s.credits} onClick={() => g.buyUpgrade(u.id)}>{l >= u.max ? 'MAX' : $(g.upCost(u.id))}</button></div>; })}
    <div className="row"><div className="grow"><b>{SONAR_TIERS[s.sonarTier - 1].name}</b> <span className="tag">TIER {s.sonarTier}/4</span><div className="sm">{nxt ? `Next: ${nxt.name} — ${nxt.desc} (range ×${nxt.mult}, depth gate ${N(nxt.gate)}m)` : 'Maximum tier.'}</div></div>
      {nxt && <button className="pri" disabled={s.credits < nxt.cost || s.research < nxt.rp} onClick={() => g.buySonar()}>{$(nxt.cost)} + {nxt.rp}RP</button>}</div>
    <div className="lab" style={{ marginTop: 14 }}>SUBMARINES</div>
    {SUBS.map(b => { const own = s.ownedSubs.includes(b.id); const rp = SUB_RP[b.id] ?? 0; return <div className="row" key={b.id}><div className="grow"><b>{b.name}</b> {s.activeSub === b.id && <span className="tag">ACTIVE</span>}<div className="sm">{b.blurb}</div><div className="sm">Depth {N(b.maxDepth)}m · Cargo {N(b.cargo)} · Speed {b.speed} · Hull {b.hull} · Sonar {b.sonar} · Mining {b.mining} · Energy {b.energy} · Research {b.research}</div></div>
      {own ? <button disabled={s.activeSub === b.id} onClick={() => g.selectSub(b.id)}>{s.activeSub === b.id ? 'IN USE' : 'ACTIVATE'}</button> : <button className="pri" disabled={s.credits < b.cost || s.research < rp} onClick={() => g.buySub(b.id)}>{$(b.cost)}{rp ? ` + ${rp}RP` : ''}</button>}</div>; })}
    <div className="sm" style={{ marginTop: 8 }}>Switching submarines requires docking. Idle submarines mine automatically once the Automation Hub is built.</div></Frame>;
}

export function BasePanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const rates = g.autoRates(); const sum = g.autoSum();
  return <Frame title="UNDERWATER BASE" sub={`Storage ${N(g.storageUsed())} / ${N(g.storageCap())} units`} onClose={close}>
    <div className="row"><div className="grow"><b>Dock services</b><div className="sm">Hull {(100 * (s.hull[s.activeSub] ?? 1)).toFixed(0)}% · Repair cost {$(g.repairCost())}</div></div><button className="go" disabled={!g.canDock()} onClick={() => g.dock()}>DOCK & UNLOAD</button><button disabled={!g.canDock() || g.repairCost() <= 0} onClick={() => g.repair()}>REPAIR {g.repairCost() > 0 ? $(g.repairCost()) : ''}</button></div>
    {!g.canDock() && <div className="sm">Return to the platform at the surface waters to use dock services.</div>}
    {MODULES.map(m => { const l = s.modules[m.id] ?? 0; const c = m.costs[l + 1]; return <div className="row" key={m.id}><div className="grow"><b>{m.name}</b> <span className="tag">LEVEL {l}/4</span><div className="sm">{m.what}: {l ? m.desc[l - 1] : 'not built'}{l < 4 && <span style={{ color: 'var(--gr)' }}> → {m.desc[l]}</span>}</div></div>
      <button className="pri" disabled={l >= 4 || c > s.credits} onClick={() => g.buildModule(m.id)}>{l >= 4 ? 'MAX' : `${l ? 'UPGRADE' : 'BUILD'} ${$(c)}`}</button></div>; })}
    {(s.modules.automation ?? 0) > 0 && <div className="card" style={{ marginTop: 10 }}><div className="lab">AUTOMATED PRODUCTION (idle subs)</div>{Object.keys(sum).length ? Object.entries(sum).map(([r, v]) => <div key={r}>+{N(v)} {RES[r].name} / hour</div>) : <div className="sm">Buy a second submarine: the inactive ones work for you.</div>}<div className="sm">{rates.length ? 'Production continues offline for up to 8 hours.' : ''}</div></div>}
  </Frame>;
}

export function MarketPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s;
  return <Frame title="TRADING TERMINAL" sub={`Credits ${$(s.credits)} · Selling lowers the price; it recovers over time.`} onClose={close}>
    {g.events.length > 0 && <div style={{ margin: '8px 0' }}>{g.events.map(e => <div key={e.id} className="card" style={{ borderColor: 'var(--or)', marginBottom: 4 }}><b style={{ color: 'var(--or)' }}>{e.name}</b> <span className="sm">{e.desc} ({Math.max(0, Math.round((e.ends - Date.now()) / 1000))}s)</span></div>)}</div>}
    <table><thead><tr><th>RESOURCE</th><th>PRICE</th><th>TREND</th><th>OWNED</th><th></th></tr></thead><tbody>
      {RESOURCES.map(r => { const own = s.inventory[r.id] ?? 0; const p = g.price(r.id); const ratio = p / r.baseValue; const buyable = r.rarity === 'common' || r.rarity === 'uncommon';
        return <tr key={r.id}><td><span style={{ color: RC[r.rarity] }}>■</span> {r.name}<div className="sm">{r.uses}</div></td><td style={{ color: ratio > 1.15 ? 'var(--gr)' : ratio < 0.85 ? 'var(--red)' : undefined }}>{$(p)}<div className="sm">base {$(r.baseValue)}{(g.supply[r.id] ?? 0) > 0.02 ? ` · glut −${Math.round((g.supply[r.id] ?? 0) * 100)}%` : ''}</div></td><td><Spark h={g.hist[r.id]} /></td><td>{N(own)}</td>
          <td style={{ whiteSpace: 'nowrap' }}><button disabled={own < 1} onClick={() => g.sell(r.id, 10)}>SELL 10</button> <button disabled={own < 1} onClick={() => g.sell(r.id, own)}>SELL ALL</button> {buyable && <button disabled={p * 12.5 > s.credits} onClick={() => g.buy(r.id, 10)}>BUY 10</button>}</td></tr>; })}
    </tbody></table></Frame>;
}

export function ResourcesPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const lvl = g.processLevel();
  return <Frame title="RESOURCES & PROCESSING" sub={`Storage ${N(g.storageUsed())} / ${N(g.storageCap())} · Cargo hold ${N(g.cargoUsed())} / ${N(g.d().cargo)}`} onClose={close}>
    <div className="lab" style={{ marginTop: 10 }}>PRODUCTION CHAINS (Processing Facility level {lvl})</div>
    {RECIPES.map(r => <div className="row" key={r.id}><div className="grow"><b>{r.name}</b> {lvl < r.level && <span className="tag">NEEDS PROCESSING LV {r.level}</span>}<div className="sm">{Object.entries(r.inputs).map(([k, v]) => `${v}× ${RES[k].name}`).join(' + ')} → 1 {RES[r.out].name} (worth {$(RES[r.out].baseValue)} vs {$(Object.entries(r.inputs).reduce((a, [k, v]) => a + RES[k].baseValue * (v ?? 0), 0))} raw)</div></div>
      {[1, 10, 100].map(n => <button key={n} disabled={lvl < r.level} onClick={() => g.process(r.id, n)}>×{n}</button>)}</div>)}
    <div className="lab" style={{ marginTop: 14 }}>STORED RESOURCES</div>
    <table><thead><tr><th>RESOURCE</th><th>RARITY</th><th>QTY</th><th>SPACE</th><th>USES</th></tr></thead><tbody>{RESOURCES.map(r => { const q = s.inventory[r.id] ?? 0; return <tr key={r.id} style={{ opacity: q || s.resSeen.includes(r.id) ? 1 : 0.4 }}><td>{r.name}</td><td style={{ color: RC[r.rarity] }}>{r.rarity.replace('_', ' ')}</td><td>{N(q)}</td><td>{r.storage}/unit</td><td className="sm">{r.uses}</td></tr>; })}</tbody></table></Frame>;
}

export function MissionsPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const reqs = g.finaleReqs(); const list = [...MISSIONS].sort((a, b) => Number(s.missionsDone.includes(a.id)) - Number(s.missionsDone.includes(b.id)));
  return <Frame title="MISSIONS" sub={`Reputation ${N(s.reputation)} · Research ${N(s.research)}`} onClose={close}>
    {(s.stats.deepest >= 4000 || s.finale) && <div className="card" style={{ margin: '10px 0', borderColor: 'var(--or)' }}><b style={{ letterSpacing: 4 }}>THE FINAL DESCENT</b>{reqs.map(r => <div key={r.label} style={{ color: r.ok ? 'var(--gr)' : 'var(--dim)' }}>{r.ok ? '✔' : '○'} {r.label}</div>)}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}><button disabled={(s.modules.finalprep ?? 0) > 0 || s.credits < 1e6} onClick={() => g.prepFinale()}>PREPARE EXPEDITION</button><button className="pri" disabled={s.finale || !reqs.every(r => r.ok)} onClick={() => g.launchFinale()}>{s.finale ? 'COMPLETED' : 'LAUNCH FINAL DESCENT'}</button></div></div>}
    {list.map(m => { const done = s.missionsDone.includes(m.id); const c = Math.min(m.max, m.cur(s)); return <div className="row" key={m.id} style={{ opacity: done ? 0.5 : 1 }}><div className="grow"><b>{m.title}</b><div className="sm">{m.desc}</div><div className="bar"><i style={{ width: `${(100 * c) / m.max}%`, background: 'var(--cy)' }} /></div><div className="sm">{N(c)} / {N(m.max)} · {$(m.credits)} · {m.research}RP · {m.rep} rep</div></div>
      <button className="go" disabled={done || c < m.max} onClick={() => g.claim(m.id)}>{done ? 'CLAIMED' : 'CLAIM'}</button></div>; })}</Frame>;
}

export function JournalPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const [tab, setTab] = useState('Ocean Zones');
  const got = (id: string) => s.discoveries.includes(id);
  const cats: Record<string, { id: string; name: string; text: string; ok: boolean }[]> = {
    'Ocean Zones': ZONES.map(z => ({ id: 'z' + z.id, name: z.name, text: `${N(z.minDepth)}–${N(z.maxDepth)}m. ${z.blurb}`, ok: s.stats.deepest >= z.minDepth && (z.id !== 5 || s.stats.deepest >= 3000) })),
    Resources: RESOURCES.map(r => ({ id: r.id, name: r.name, text: `${r.rarity.replace('_', ' ')} · ${r.uses}`, ok: s.resSeen.includes(r.id) })),
  };
  const dc = (f: (d: typeof DISCOVERIES[number]) => boolean) => DISCOVERIES.filter(f).map(d => ({ id: d.id, name: d.name, text: `${d.desc} — ${d.journal}`, ok: got(d.id) }));
  cats.Creatures = dc(d => d.cat === 'bio'); cats.Wrecks = dc(d => d.cat === 'wreck'); cats.Research = dc(d => d.cat === 'human' || d.cat === 'geo');
  cats.Artifacts = dc(d => d.cat === 'mystery' && d.zone <= 6); cats.Anomalies = dc(d => d.cat === 'mystery' && d.zone === 7); cats.Unknown = dc(d => d.zone === 8);
  const tot = Object.values(cats).flat(); const done = tot.filter(e => e.ok).length;
  return <Frame title="DISCOVERY JOURNAL" sub={`${done} / ${tot.length} entries (${Math.round((100 * done) / tot.length)}%)`} onClose={close}>
    <div className="tabs">{Object.keys(cats).map(k => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k.toUpperCase()} {cats[k].filter(e => e.ok).length}/{cats[k].length}</button>)}</div>
    {cats[tab].map(e => <div className="row" key={e.id} style={{ opacity: e.ok ? 1 : 0.45 }}><div className="grow"><b>{e.ok ? e.name : '???'}</b><div className="sm">{e.ok ? e.text : 'Not yet discovered.'}</div></div></div>)}</Frame>;
}

export function AchievementsPanel({ s, close }: { s: SaveData; close: () => void }) {
  return <Frame title="ACHIEVEMENTS" sub={`${s.achievements.length} / ${ACHIEVEMENTS.length}`} onClose={close}>{ACHIEVEMENTS.map(a => { const ok = s.achievements.includes(a.id); return <div className="row" key={a.id} style={{ opacity: ok ? 1 : 0.45 }}><div style={{ width: 24, color: 'var(--or)' }}>{ok ? '★' : '☆'}</div><div className="grow"><b>{a.name}</b><div className="sm">{a.desc}</div></div></div>; })}</Frame>;
}

export function SettingsPanel({ g, close, replace, menu }: { g: Game; close: () => void; replace: (s: ReturnType<typeof importSave>) => void; menu: () => void }) {
  const f = useRef<HTMLInputElement>(null); const [msg, setMsg] = useState(''); const [, force] = useState(0);
  const download = () => { const b = new Blob([exportSave(g.s)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `deep-sea-tycoon-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); };
  return <Frame title="SETTINGS & SAVES" onClose={close}>
    <div className="row"><div className="grow"><b>Sound</b></div><button onClick={() => { g.s.settings.muted = !g.s.settings.muted; setMuted(g.s.settings.muted); force(n => n + 1); }}>{g.s.settings.muted ? 'UNMUTE' : 'MUTE ALL'}</button></div>
    <div className="row"><div className="grow"><b>Save</b><div className="sm">Autosaves every 20 seconds and at key actions. Stored only in this browser (IndexedDB).</div></div><button onClick={() => { g.persist(); setMsg('Saved.'); }}>SAVE NOW</button></div>
    <div className="row"><div className="grow"><b>Export / Import</b><div className="sm">Download a JSON backup or restore one.</div></div><button onClick={download}>EXPORT</button><button onClick={() => f.current?.click()}>IMPORT</button>
      <input ref={f} type="file" accept="application/json,.json" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const sv = importSave(await file.text()); if (!sv) setMsg('Import failed: the file is invalid or corrupted. Your current save is unchanged.'); else { replace(sv); setMsg('Imported.'); } e.target.value = ''; }} /></div>
    <div className="row"><div className="grow"><b>Controls</b><div className="sm">W/S forward/back · A/D turn · R/F or ↑/↓ ascend/descend · Space ping · I investigate · E extract · G dock · V camera. On touch screens use the on-screen pad.</div></div></div>
    <div className="row"><div className="grow"><b style={{ color: 'var(--red)' }}>Reset</b><div className="sm">Deletes your save permanently.</div></div><button onClick={() => { if (confirm('Delete this save and start over?')) replace(null); }}>RESET GAME</button><button onClick={menu}>MAIN MENU</button></div>
    {msg && <div className="sm" style={{ color: 'var(--cy)' }}>{msg}</div>}</Frame>;
}
const BRANCHES = ['Engineering', 'Exploration', 'Industrial', 'Biology', 'Energy', 'Hadal Technology'] as const;
export function ResearchPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const [b, setB] = useState<string>('Engineering');
  return <Frame title="RESEARCH" sub={`Research Points: ${N(s.research)} · Credits ${$(s.credits)}`} onClose={close}>
    <div className="tabs">{BRANCHES.map(x => <button key={x} className={b === x ? 'on' : ''} onClick={() => setB(x)}>{x.toUpperCase()} {TECHS.filter(y => y.branch === x && s.tech.includes(y.id)).length}/{TECHS.filter(y => y.branch === x).length}</button>)}</div>
    {TECHS.filter(x => x.branch === b).map(x => { const done = s.tech.includes(x.id); const open = x.req.every(r => s.tech.includes(r)); const resTxt = Object.entries(x.res ?? {}).map(([k, v]) => `${v} ${RES[k].name}`).join(', ');
      return <div className="row" key={x.id} style={{ opacity: done ? 0.6 : open ? 1 : 0.5 }}><div className="grow"><b>{x.name}</b> {done && <span className="tag">RESEARCHED</span>}<div className="sm">{x.desc}</div>
        <div className="sm">Cost: {$(x.credits)} · {x.rp} RP{resTxt ? ` · ${resTxt}` : ''}{x.req.length ? ` · Requires: ${x.req.map(r => TECH[r].name).join(', ')}` : ''}</div></div>
        <button className="pri" disabled={done || !open || s.credits < x.credits || s.research < x.rp} onClick={() => g.researchTech(x.id)}>{done ? 'DONE' : open ? 'RESEARCH' : 'LOCKED'}</button></div>; })}
    <div className="sm" style={{ marginTop: 10 }}>Research Points come from discoveries, missions, contracts and the Research Lab.</div></Frame>;
}
export function ContractsPanel({ g, close }: { g: Game; close: () => void }) {
  const s = g.s; const k = s.contracts; const inv = INVESTORS[s.investor]; const perks = s.tech.filter(x => x.startsWith('perk_'));
  const row = (c: typeof CONTRACTS[number], active: boolean) => { const pr = contractProgress(c, s); const tg = contractTarget(c); const done = pr >= tg; const rew = [c.credits ? $(c.credits) : '', c.rp ? `${c.rp} RP` : '', `${c.rep} rep`, c.perk ? PERKS[c.perk].name : ''].filter(Boolean).join(' · ');
    return <div className="row" key={c.id}><div className="grow"><b>{c.title}</b><div className="sm">{c.org} · Reward: {rew}</div>{active && <><div className="bar"><i style={{ width: `${(100 * pr) / tg}%`, background: 'var(--cy)' }} /></div><div className="sm">{N(pr)} / {N(tg)}{c.kind === 'deliver' ? ` (in storage: ${N(s.inventory[c.res!] ?? 0)})` : ''}</div></>}</div>
      {active ? <>{c.kind === 'deliver' && !done && <button disabled={(s.inventory[c.res!] ?? 0) < 1} onClick={() => g.deliverContract(c.id)}>DELIVER</button>}<button className="go" disabled={!done} onClick={() => g.completeContract(c.id)}>COMPLETE</button></> : <button className="pri" disabled={s.reputation < c.minRep || k.active.length >= 4} onClick={() => g.acceptContract(c.id)}>{s.reputation < c.minRep ? `NEEDS ${c.minRep} REP` : 'ACCEPT'}</button>}</div>; };
  return <Frame title="CONTRACTS" sub={`Reputation ${N(s.reputation)} · ${k.active.length}/4 active · ${k.done.length} completed`} onClose={close}>
    <div className="card" style={{ margin: '10px 0' }}><div className="lab">INVESTORS</div>{inv ? <div className="row" style={{ border: 0 }}><div className="grow">Next backing: {$(inv.credits)} at {inv.rep} reputation</div><button className="go" disabled={s.reputation < inv.rep} onClick={() => g.claimInvestor()}>CLAIM</button></div> : <div className="sm">All investors have backed your company.</div>}
      {perks.length > 0 && <div className="sm">Equipment owned: {perks.map(x => PERKS[x].name).join(', ')}</div>}</div>
    <div className="lab">ACTIVE</div>{k.active.length ? k.active.map(i => row(CONTRACTS.find(c => c.id === i)!, true)) : <div className="sm" style={{ padding: 8 }}>No active contracts.</div>}
    <div className="lab" style={{ marginTop: 12 }}>AVAILABLE</div>{CONTRACTS.filter(c => !k.active.includes(c.id) && !k.done.includes(c.id)).map(c => row(c, false))}</Frame>;
}
export type { ResourceId };
